import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  BookingSessionStatus,
  BookingStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OutboxService } from '../../shared/outbox/outbox.service';
import { AuditService } from '../../shared/audit/audit.service';
import { DomainException } from '../../shared/errors/domain.exception';
import { AvailabilityService } from '../availability/availability.service';
import { BookingService } from './booking.service';
import type { AuthContext } from '../../shared/auth/auth-context';
import type { CreateOfflineBookingDto } from './dtos/offline-booking.dto';
import { resolvePrice, toMinutes } from './pricing-resolver';

interface RequestMeta { requestId?: string; route?: string; sourceIp?: string; userAgent?: string }

@Injectable()
export class OfflineBookingService {
  private readonly logger = new Logger(OfflineBookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly availability: AvailabilityService,
    private readonly booking: BookingService,
  ) {}

  // POST /partners/me/bookings/offline
  async create(ctx: AuthContext, dto: CreateOfflineBookingDto, meta: RequestMeta) {
    const ground = await this.prisma.ground.findFirst({
      where: { id: dto.ground_id, deletedAt: null },
      include: {
        venue: true,
        configuration: true,
        pricingRules: { where: { active: true, deletedAt: null } },
      },
    });
    if (!ground) throw new DomainException('GROUND_NOT_FOUND');
    if (ground.status !== 'ACTIVE') throw new DomainException('GROUND_NOT_ACTIVE');
    if (!ground.configuration) throw new DomainException('GROUND_CONFIG_MISSING');

    // Ownership: caller must belong to the venue's partner (STAFF is allowed).
    if (ctx.role !== Role.ADMIN) {
      const myPartnerId = ctx.partnerId ??
        (await this.prisma.partner.findFirst({ where: { identityId: ctx.identityId, deletedAt: null } }))?.id;
      if (!myPartnerId || myPartnerId !== ground.venue.partnerId) throw new DomainException('AUTH_INSUFFICIENT_PERMISSIONS');
    }

    // Server-authoritative price; partner-supplied amount is verified, not trusted.
    const priced = resolvePrice(ground.pricingRules, dto.booking_date, dto.start_time, new Date());
    if (!priced) throw new DomainException('GROUND_NO_ACTIVE_PRICING');
    if (priced.price_paise !== dto.payment.amount_paise) throw new DomainException('PAYMENT_AMOUNT_MISMATCH');

    const startMin = toMinutes(dto.start_time);
    const endMin = startMin + dto.duration_minutes;
    const endTime = minutesToHm(endMin);

    const bookingId = await this.prisma.$transaction(async (tx) => {
      // Resolve-or-create customer identity by phone.
      const customerIdentityId = await this.resolveOrCreateCustomer(tx, dto, ctx);

      // Insert a synthetic session so the FK constraint on bookings.booking_session_id
      // is satisfied. Marked CANCELLED right away — no online payment race.
      // The partial-unique index on ACTIVE sessions doesn't fire for CANCELLED,
      // so partners can double-book if the slot is already booked — we still
      // hit the check below.
      const existingBooked = await tx.booking.findFirst({
        where: {
          groundId: ground.id,
          bookingDate: new Date(`${dto.booking_date}T00:00:00Z`),
          startTime: new Date(`1970-01-01T${dto.start_time}:00Z`),
          bookingStatus: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.COMPLETED] },
        },
      });
      if (existingBooked) throw new DomainException('BOOKING_SLOT_UNAVAILABLE');

      const session = await tx.bookingSession.create({
        data: {
          identityId: customerIdentityId,
          groundId: ground.id,
          bookingDate: new Date(`${dto.booking_date}T00:00:00Z`),
          startTime: new Date(`1970-01-01T${dto.start_time}:00Z`),
          endTime: new Date(`1970-01-01T${endTime}:00Z`),
          totalAmount: new Prisma.Decimal(priced.price_rupees),
          expiresAt: new Date(),
          status: BookingSessionStatus.CANCELLED, // offline flow never has an active hold
          createdBy: ctx.identityId,
        },
      });

      const booking = await tx.booking.create({
        data: {
          bookingSessionId: session.id,
          identityId: customerIdentityId,
          partnerId: ground.venue.partnerId,
          venueId: ground.venueId,
          groundId: ground.id,
          bookingDate: session.bookingDate,
          startTime: session.startTime,
          endTime: session.endTime,
          bookingSource: dto.booking_source,
          bookingStatus: BookingStatus.CONFIRMED,
          totalAmount: session.totalAmount,
          currency: 'INR',
          createdBy: ctx.identityId,
        },
      });

      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          paymentProvider: PaymentProvider.OFFLINE,
          transactionReference: `OFFLINE-${booking.id}`,
          amount: session.totalAmount,
          currency: 'INR',
          paymentMethod: dto.payment.method as PaymentMethod,
          paymentStatus: PaymentStatus.SUCCESS,
          paidAt: new Date(),
          providerPayload: {
            external_reference: dto.payment.external_reference ?? null,
            recorded_by_identity_id: ctx.identityId,
            notes: dto.notes ?? null,
          } as Prisma.InputJsonValue,
        },
      });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'OfflineBookingCreated',
        resourceType: 'Booking',
        resourceId: booking.id,
        resourceReferenceCode: booking.referenceCode,
        changes: { booking_source: { before: null, after: dto.booking_source } },
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Booking',
        aggregateId: booking.id,
        eventType: 'BookingConfirmed',
        payload: {
          booking_id: booking.id,
          reference_code: booking.referenceCode,
          identity_id: customerIdentityId,
          partner_id: booking.partnerId,
          ground_id: booking.groundId,
          source: dto.booking_source,
        },
        correlationId: meta.requestId,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Payment',
        aggregateId: payment.id,
        eventType: 'PaymentSucceeded',
        payload: {
          payment_id: payment.id,
          reference_code: payment.referenceCode,
          booking_id: booking.id,
          amount_paise: priced.price_paise,
          provider: PaymentProvider.OFFLINE,
          transaction_reference: payment.transactionReference,
        },
        correlationId: meta.requestId,
      });

      return booking.id;
    });

    this.availability.invalidate(ground.id, dto.booking_date);
    return this.booking.serializeBookingResponse(bookingId);
  }

  private async resolveOrCreateCustomer(
    tx: Prisma.TransactionClient,
    dto: CreateOfflineBookingDto,
    ctx: AuthContext,
  ): Promise<string> {
    const existing = await tx.identity.findUnique({ where: { phone: dto.customer.phone } });
    if (existing) return existing.id;

    // Un-provisioned identity: reserved firebase_uid prefix marks it as claimable.
    const firebaseUid = `offline:${randomUUID()}`;
    const identity = await tx.identity.create({
      data: {
        firebaseUid,
        phone: dto.customer.phone,
        email: dto.customer.email ?? null,
        role: 'CUSTOMER',
        // No phone_verified_at — the partner attested to the phone but Firebase hasn't.
      },
    });
    await tx.identityProfile.create({
      data: {
        identityId: identity.id,
        firstName: dto.customer.name.split(/\s+/)[0] ?? dto.customer.name,
        lastName: dto.customer.name.split(/\s+/).slice(1).join(' ') || null,
        city: 'Nashik',
        language: 'en',
        createdBy: ctx.identityId,
      },
    });
    return identity.id;
  }
}

function minutesToHm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
