import { Injectable, Logger } from '@nestjs/common';
import { BookingSessionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OutboxService } from '../../shared/outbox/outbox.service';
import { AuditService } from '../../shared/audit/audit.service';
import { RazorpayService } from '../../shared/razorpay/razorpay.service';
import { DomainException } from '../../shared/errors/domain.exception';
import { AvailabilityService } from '../availability/availability.service';
import type { AuthContext } from '../../shared/auth/auth-context';
import type { CreateBookingSessionDto } from './dtos/create-session.dto';
import { resolvePrice, toMinutes } from './pricing-resolver';

interface RequestMeta { requestId?: string; route?: string; sourceIp?: string; userAgent?: string }

const DEFAULT_SESSION_TTL_MINUTES = 10;

@Injectable()
export class BookingSessionService {
  private readonly logger = new Logger(BookingSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly razorpay: RazorpayService,
    private readonly availability: AvailabilityService,
  ) {}

  // POST /booking-sessions — the concurrency-critical write path.
  async create(ctx: AuthContext, dto: CreateBookingSessionDto, meta: RequestMeta) {
    await this.assertPhoneVerified(ctx);

    // Load ground + configuration + pricing rules fresh (no cache).
    const ground = await this.prisma.ground.findFirst({
      where: { id: dto.ground_id, deletedAt: null },
      include: {
        configuration: true,
        venue: { select: { id: true, partnerId: true } },
        pricingRules: { where: { active: true, deletedAt: null } },
      },
    });
    if (!ground) throw new DomainException('GROUND_NOT_FOUND');
    if (ground.status !== 'ACTIVE') throw new DomainException('GROUND_NOT_ACTIVE');
    if (!ground.configuration) throw new DomainException('GROUND_CONFIG_MISSING');

    const duration = dto.duration_minutes ?? ground.configuration.bookingDuration;
    const startMin = toMinutes(dto.start_time);
    const endMin = startMin + duration;
    const endTime = minutesToHm(endMin);

    // Booking-window preconditions.
    this.assertBookingWindow(dto.booking_date, dto.start_time, ground.configuration, new Date());

    // Server-authoritative price.
    const priced = resolvePrice(ground.pricingRules, dto.booking_date, dto.start_time, new Date());
    if (!priced) throw new DomainException('GROUND_NO_ACTIVE_PRICING');

    const ttlMinutes = await this.resolveSessionTtl();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    // Create session + outbox + Razorpay order inside one $transaction. If any
    // step fails (including the Razorpay call), the whole thing rolls back so
    // we never leave a session without an order.
    const result = await this.prisma.$transaction(async (tx) => {
      let session;
      try {
        session = await tx.bookingSession.create({
          data: {
            identityId: ctx.identityId,
            groundId: ground.id,
            bookingDate: new Date(`${dto.booking_date}T00:00:00Z`),
            startTime: new Date(`1970-01-01T${dto.start_time}:00Z`),
            endTime: new Date(`1970-01-01T${endTime}:00Z`),
            totalAmount: new Prisma.Decimal(priced.price_rupees),
            expiresAt,
            status: BookingSessionStatus.ACTIVE,
            createdBy: ctx.identityId,
          },
        });
      } catch (err) {
        // Postgres 23505 on uq_active_booking_session — concurrent race lost.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new DomainException('BOOKING_SLOT_UNAVAILABLE');
        }
        throw err;
      }

      // Outbox first so we don't have to redo it if Razorpay fails inside the tx.
      await this.outbox.emit(tx, {
        aggregateType: 'BookingSession',
        aggregateId: session.id,
        eventType: 'BookingSessionCreated',
        payload: {
          session_id: session.id,
          identity_id: ctx.identityId,
          ground_id: ground.id,
          booking_date: dto.booking_date,
          start_time: dto.start_time,
          total_amount_paise: priced.price_paise,
          expires_at: expiresAt.toISOString(),
        },
        correlationId: meta.requestId,
      });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'BookingSessionCreated',
        resourceType: 'BookingSession',
        resourceId: session.id,
        context: meta,
      });

      // Razorpay Order — receipt links to session so support can trace either direction.
      const order = await this.razorpay.createOrder(priced.price_paise, `session:${session.id}`);

      // Bust the availability cache for this slot so subsequent fetches see HELD.
      this.availability.invalidate(ground.id, dto.booking_date);

      return { session, order, ground };
    });

    // Load identity + profile for the customer echo.
    const identity = await this.prisma.identity.findUnique({
      where: { id: ctx.identityId },
      include: { profile: true },
    });

    return {
      session: {
        id: result.session.id,
        identity_id: result.session.identityId,
        ground_id: result.session.groundId,
        booking_date: result.session.bookingDate.toISOString().slice(0, 10),
        start_time: dto.start_time,
        end_time: endTime,
        total_amount_paise: priced.price_paise,
        currency: 'INR' as const,
        expires_at: result.session.expiresAt.toISOString(),
        status: result.session.status,
        matched_pricing_rule_id: priced.matched_rule_id,
      },
      payment_order: {
        provider: 'RAZORPAY' as const,
        order_id: result.order.id,
        amount_paise: result.order.amount,
        currency: 'INR' as const,
        razorpay_key_id: this.razorpay.keyId(),
      },
      customer: {
        identity_id: identity!.id,
        reference_code: identity!.referenceCode,
        name: [identity!.profile?.firstName, identity!.profile?.lastName].filter(Boolean).join(' ') || null,
        phone: identity!.phone,
        email: identity!.email,
      },
    };
  }

  // GET /booking-sessions/:id
  async getOwn(ctx: AuthContext, id: string) {
    const s = await this.prisma.bookingSession.findFirst({ where: { id } });
    if (!s || s.identityId !== ctx.identityId) throw new DomainException('BOOKING_SESSION_NOT_FOUND');
    return {
      id: s.id,
      status: s.status,
      seconds_remaining: Math.max(0, Math.floor((s.expiresAt.getTime() - Date.now()) / 1000)),
      expires_at: s.expiresAt.toISOString(),
      ground_id: s.groundId,
      booking_date: s.bookingDate.toISOString().slice(0, 10),
      start_time: (s.startTime as unknown as Date).toISOString().slice(11, 16),
      end_time: (s.endTime as unknown as Date).toISOString().slice(11, 16),
      total_amount_paise: Math.round(Number(s.totalAmount) * 100),
    };
  }

  // POST /booking-sessions/:id/actions/cancel
  async cancel(ctx: AuthContext, id: string, meta: RequestMeta) {
    return this.prisma.$transaction(async (tx) => {
      const s = await tx.bookingSession.findFirst({ where: { id } });
      if (!s || s.identityId !== ctx.identityId) throw new DomainException('BOOKING_SESSION_NOT_FOUND');
      if (s.status === BookingSessionStatus.CANCELLED) return { status: s.status };
      if (s.status === BookingSessionStatus.EXPIRED) throw new DomainException('BOOKING_SESSION_EXPIRED');

      const updated = await tx.bookingSession.update({
        where: { id },
        data: { status: BookingSessionStatus.CANCELLED, updatedBy: ctx.identityId },
      });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'BookingSessionCancelled',
        resourceType: 'BookingSession',
        resourceId: id,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'BookingSession',
        aggregateId: id,
        eventType: 'BookingSessionCancelled',
        payload: { session_id: id },
        correlationId: meta.requestId,
      });
      this.availability.invalidate(s.groundId, s.bookingDate.toISOString().slice(0, 10));
      return { status: updated.status };
    });
  }

  // ── helpers ──

  private async assertPhoneVerified(ctx: AuthContext): Promise<void> {
    const identity = await this.prisma.identity.findUnique({ where: { id: ctx.identityId }, select: { phoneVerifiedAt: true } });
    if (!identity?.phoneVerifiedAt) throw new DomainException('IDENTITY_PHONE_NOT_VERIFIED');
  }

  private assertBookingWindow(
    dateStr: string,
    startTime: string,
    config: { maxAdvanceBookingDays: number; minNoticeMinutes: number },
    now: Date,
  ): void {
    const startAt = new Date(`${dateStr}T${startTime}:00+05:30`);
    if (startAt.getTime() - now.getTime() < config.minNoticeMinutes * 60_000) {
      throw new DomainException('BOOKING_MIN_NOTICE');
    }
    const target = new Date(`${dateStr}T00:00:00+05:30`);
    const today = new Date(now.toISOString().slice(0, 10) + 'T00:00:00+05:30');
    const daysAhead = Math.floor((target.getTime() - today.getTime()) / 86_400_000);
    if (daysAhead < 0 || daysAhead > config.maxAdvanceBookingDays) {
      throw new DomainException('BOOKING_ADVANCE_WINDOW');
    }
  }

  private async resolveSessionTtl(): Promise<number> {
    const setting = await this.prisma.appSetting.findFirst({
      where: { key: 'booking.session_ttl_minutes', partnerId: null },
    });
    if (!setting) return DEFAULT_SESSION_TTL_MINUTES;
    const v = setting.value as unknown;
    return typeof v === 'number' ? v : DEFAULT_SESSION_TTL_MINUTES;
  }
}

function minutesToHm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
