import { Injectable, Logger } from '@nestjs/common';
import {
  BookingSessionStatus,
  BookingSource,
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
import { RazorpayService } from '../../shared/razorpay/razorpay.service';
import { DomainException } from '../../shared/errors/domain.exception';
import { AvailabilityService } from '../availability/availability.service';
import type { AuthContext } from '../../shared/auth/auth-context';
import type { ConfirmBookingDto } from './dtos/confirm-booking.dto';
import type { CancelBookingDto } from './dtos/cancel-booking.dto';

interface RequestMeta { requestId?: string; route?: string; sourceIp?: string; userAgent?: string }

const REFERENCE_CODE_RE = /^TX-BK-\d{4}\d{6}$/;
const PAYMENT_METHOD_MAP: Record<string, PaymentMethod> = {
  card: PaymentMethod.CARD,
  upi: PaymentMethod.UPI,
  netbanking: PaymentMethod.NETBANKING,
  wallet: PaymentMethod.WALLET,
};

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly razorpay: RazorpayService,
    private readonly availability: AvailabilityService,
  ) {}

  // POST /bookings — promote a session into a booking.
  async confirm(ctx: AuthContext, dto: ConfirmBookingDto, meta: RequestMeta) {
    if (!this.razorpay.verifySignature(dto.razorpay_order_id, dto.razorpay_payment_id, dto.razorpay_signature)) {
      throw new DomainException('PAYMENT_SIGNATURE_INVALID');
    }

    // Fetch payment from Razorpay OUTSIDE the tx: the network call is slow
    // and we don't want to hold a row lock during it.
    const payment = await this.razorpay.fetchPayment(dto.razorpay_payment_id);
    if (payment.status !== 'captured') throw new DomainException('PAYMENT_NOT_CAPTURED');

    const bookingId = await this.prisma.$transaction(async (tx) => {
      // FOR UPDATE — block concurrent confirmations against the same session.
      const rows = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT id FROM booking_sessions WHERE id = ${dto.booking_session_id}::uuid FOR UPDATE`,
      );
      if (rows.length === 0) throw new DomainException('BOOKING_SESSION_NOT_FOUND');

      const session = await tx.bookingSession.findUnique({
        where: { id: dto.booking_session_id },
        include: { ground: { include: { venue: true } } },
      });
      if (!session) throw new DomainException('BOOKING_SESSION_NOT_FOUND');
      if (session.identityId !== ctx.identityId) throw new DomainException('BOOKING_SESSION_NOT_FOUND');
      if (session.status !== BookingSessionStatus.ACTIVE) {
        // If a booking already exists for this session (idempotent replay path
        // that didn't hit the interceptor cache), return it.
        const existing = await tx.booking.findUnique({ where: { bookingSessionId: session.id } });
        if (existing) throw new DomainException('BOOKING_ALREADY_CONFIRMED');
        throw new DomainException('BOOKING_SESSION_EXPIRED');
      }
      if (session.expiresAt <= new Date()) {
        // Race with the ExpireBookingSessions job — the payment succeeded but
        // the hold lapsed. Refund is the operator's call; we surface the code.
        throw new DomainException('BOOKING_SESSION_EXPIRED');
      }

      const expectedPaise = Math.round(Number(session.totalAmount) * 100);
      if (payment.amount !== expectedPaise) throw new DomainException('PAYMENT_AMOUNT_MISMATCH');
      if (payment.order_id && payment.order_id !== dto.razorpay_order_id) {
        // Razorpay's payment must belong to the order it claims to.
        throw new DomainException('PAYMENT_SIGNATURE_INVALID');
      }

      // Create booking + payment in this same tx. Reference codes come from triggers.
      const booking = await tx.booking.create({
        data: {
          bookingSessionId: session.id,
          identityId: session.identityId,
          partnerId: session.ground.venue.partnerId,
          venueId: session.ground.venueId,
          groundId: session.groundId,
          bookingDate: session.bookingDate,
          startTime: session.startTime,
          endTime: session.endTime,
          bookingSource: BookingSource.CUSTOMER_APP,
          bookingStatus: BookingStatus.CONFIRMED,
          totalAmount: session.totalAmount,
          currency: 'INR',
          createdBy: ctx.identityId,
        },
      });

      const paymentRow = await tx.payment.create({
        data: {
          bookingId: booking.id,
          paymentProvider: PaymentProvider.RAZORPAY,
          transactionReference: payment.id,
          amount: session.totalAmount,
          currency: 'INR',
          paymentMethod: PAYMENT_METHOD_MAP[payment.method.toLowerCase()] ?? PaymentMethod.UPI,
          paymentStatus: PaymentStatus.SUCCESS,
          paidAt: new Date(),
          providerPayload: {
            razorpay_order_id: dto.razorpay_order_id,
            razorpay_payment_id: dto.razorpay_payment_id,
            method: payment.method,
          } as Prisma.InputJsonValue,
        },
      });

      // Consume the session — kept for audit trail.
      await tx.bookingSession.update({
        where: { id: session.id },
        data: { status: BookingSessionStatus.CANCELLED, updatedBy: ctx.identityId },
      });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'BookingConfirmed',
        resourceType: 'Booking',
        resourceId: booking.id,
        resourceReferenceCode: booking.referenceCode,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Booking',
        aggregateId: booking.id,
        eventType: 'BookingConfirmed',
        payload: {
          booking_id: booking.id,
          reference_code: booking.referenceCode,
          identity_id: booking.identityId,
          partner_id: booking.partnerId,
          venue_id: booking.venueId,
          ground_id: booking.groundId,
          booking_date: booking.bookingDate.toISOString().slice(0, 10),
          start_time: fmtTime(booking.startTime),
          end_time: fmtTime(booking.endTime),
          total_amount_paise: expectedPaise,
          source: BookingSource.CUSTOMER_APP,
        },
        correlationId: meta.requestId,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Payment',
        aggregateId: paymentRow.id,
        eventType: 'PaymentSucceeded',
        payload: {
          payment_id: paymentRow.id,
          reference_code: paymentRow.referenceCode,
          booking_id: booking.id,
          amount_paise: expectedPaise,
          provider: PaymentProvider.RAZORPAY,
          transaction_reference: payment.id,
        },
        correlationId: meta.requestId,
      });

      return booking.id;
    });

    this.availability.invalidate(await this.groundIdForBooking(bookingId));
    return this.serializeBookingResponse(bookingId);
  }

  // POST /bookings/:id/actions/cancel — customer path.
  async cancel(ctx: AuthContext, id: string, dto: CancelBookingDto, meta: RequestMeta) {
    // Razorpay refund happens INSIDE the tx: if the refund call fails we
    // roll back the booking state so the customer isn't left in limbo.
    const bookingId = await this.resolveBookingId(id);

    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, deletedAt: null },
        include: { ground: { include: { configuration: true } }, payment: true },
      });
      if (!booking) throw new DomainException('BOOKING_NOT_FOUND');
      if (booking.identityId !== ctx.identityId) throw new DomainException('BOOKING_NOT_FOUND');
      if (booking.bookingStatus === BookingStatus.CANCELLED) throw new DomainException('BOOKING_ALREADY_CANCELLED');
      if (booking.bookingStatus !== BookingStatus.CONFIRMED) throw new DomainException('BOOKING_NOT_CANCELLABLE');
      if (!booking.payment) throw new DomainException('BOOKING_NOT_CANCELLABLE');

      // Cancellation window check.
      const hours = booking.ground.configuration?.cancellationWindowHours ?? 4;
      const deadline = this.cancellationDeadline(booking.bookingDate, booking.startTime, hours);
      if (new Date() >= deadline) throw new DomainException('BOOKING_CANCELLATION_WINDOW');

      const totalPaise = Math.round(Number(booking.totalAmount) * 100);

      // Razorpay refund (100% MVP). If OFFLINE payment, skip the provider call.
      let refundRef: string | null = null;
      let refundAmountPaise = totalPaise;
      if (booking.payment.paymentProvider === PaymentProvider.RAZORPAY) {
        const refund = await this.razorpay.createRefund(booking.payment.transactionReference, totalPaise, {
          booking_reference: booking.referenceCode,
        });
        refundRef = refund.id;
        refundAmountPaise = refund.amount;
      }

      const now = new Date();
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          bookingStatus: BookingStatus.CANCELLED,
          cancelledAt: now,
          cancellationReason: dto.reason ?? null,
          updatedBy: ctx.identityId,
        },
      });
      await tx.payment.update({
        where: { id: booking.payment.id },
        data: {
          paymentStatus: PaymentStatus.REFUNDED,
          refundedAt: now,
          refundAmount: new Prisma.Decimal(refundAmountPaise / 100),
          refundReason: dto.reason ?? null,
        },
      });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'BookingCancelled',
        resourceType: 'Booking',
        resourceId: booking.id,
        resourceReferenceCode: booking.referenceCode,
        changes: { booking_status: { before: booking.bookingStatus, after: BookingStatus.CANCELLED } },
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Booking',
        aggregateId: booking.id,
        eventType: 'BookingCancelled',
        payload: { booking_id: booking.id, reference_code: booking.referenceCode, cancelled_by: 'CUSTOMER' },
        correlationId: meta.requestId,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Payment',
        aggregateId: booking.payment.id,
        eventType: 'RefundInitiated',
        payload: {
          payment_id: booking.payment.id,
          booking_id: booking.id,
          amount_paise: refundAmountPaise,
          refund_reference: refundRef,
        },
        correlationId: meta.requestId,
      });

      return { updated, refundAmountPaise, refundRef };
    });

    // Cache invalidate outside the tx.
    const b = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (b) this.availability.invalidate(b.groundId, b.bookingDate.toISOString().slice(0, 10));

    return {
      booking: {
        id: result.updated.id,
        booking_status: result.updated.bookingStatus,
        cancelled_at: result.updated.cancelledAt?.toISOString() ?? null,
        cancellation_reason: result.updated.cancellationReason,
      },
      refund: {
        amount_paise: result.refundAmountPaise,
        expected_settlement_days: 5,
        reference: result.refundRef,
      },
    };
  }

  // POST /bookings/:id/actions/request-refund — deferred to admin queue (MVP-lite).
  async requestRefund(ctx: AuthContext, id: string, reason: string | undefined, meta: RequestMeta) {
    const bookingId = await this.resolveBookingId(id);
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, deletedAt: null } });
    if (!booking || booking.identityId !== ctx.identityId) throw new DomainException('BOOKING_NOT_FOUND');
    if (booking.bookingStatus === BookingStatus.CANCELLED || booking.bookingStatus === BookingStatus.REFUNDED) {
      throw new DomainException('REFUND_INELIGIBLE');
    }
    await this.prisma.$transaction(async (tx) => {
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'RefundRequested',
        resourceType: 'Booking',
        resourceId: booking.id,
        resourceReferenceCode: booking.referenceCode,
        changes: { reason: { before: null, after: reason ?? null } },
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Booking',
        aggregateId: booking.id,
        eventType: 'RefundRequested',
        payload: { booking_id: booking.id, reason: reason ?? null },
        correlationId: meta.requestId,
      });
    });
    return { status: 'PENDING' as const, message: 'Refund request queued for review.' };
  }

  // GET /bookings/:idOrRef — customer or partner (owning venue) or admin.
  async getOne(ctx: AuthContext, idOrRef: string) {
    const bookingId = await this.resolveBookingId(idOrRef);
    return this.serializeBookingResponse(bookingId, ctx);
  }

  // ── helpers ──

  async serializeBookingResponse(bookingId: string, ctx?: AuthContext) {
    const b = await this.prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: {
        venue: true,
        ground: { include: { configuration: true } },
        payment: true,
        review: true,
      },
    });
    if (!b) throw new DomainException('BOOKING_NOT_FOUND');
    if (ctx) this.assertBookingReadAccess(ctx, b);

    const cancellationHours = b.ground.configuration?.cancellationWindowHours ?? 4;
    const cancelDeadline = this.cancellationDeadline(b.bookingDate, b.startTime, cancellationHours);
    const now = new Date();
    const canCancel = b.bookingStatus === BookingStatus.CONFIRMED && now < cancelDeadline;

    return {
      booking: {
        id: b.id,
        reference_code: b.referenceCode,
        identity_id: b.identityId,
        partner_id: b.partnerId,
        venue: { id: b.venue.id, reference_code: b.venue.referenceCode, name: b.venue.name },
        ground: { id: b.ground.id, reference_code: b.ground.referenceCode, name: b.ground.name },
        booking_date: b.bookingDate.toISOString().slice(0, 10),
        start_time: fmtTime(b.startTime),
        end_time: fmtTime(b.endTime),
        booking_source: b.bookingSource,
        booking_status: b.bookingStatus,
        total_amount_paise: Math.round(Number(b.totalAmount) * 100),
        currency: b.currency,
        created_at: b.createdAt.toISOString(),
      },
      payment: b.payment
        ? {
            id: b.payment.id,
            reference_code: b.payment.referenceCode,
            provider: b.payment.paymentProvider,
            transaction_reference: b.payment.transactionReference,
            amount_paise: Math.round(Number(b.payment.amount) * 100),
            method: b.payment.paymentMethod,
            status: b.payment.paymentStatus,
            paid_at: b.payment.paidAt?.toISOString() ?? null,
          }
        : null,
      review: b.review ? { rating: b.review.rating, review_text: b.review.reviewText, created_at: b.review.createdAt.toISOString() } : null,
      can_cancel: canCancel,
      cancel_deadline: cancelDeadline.toISOString(),
      cancellation_policy: { window_hours: cancellationHours, refund_percentage: 100 },
    };
  }

  private assertBookingReadAccess(ctx: AuthContext, b: { identityId: string; partnerId: string }): void {
    if (ctx.role === Role.ADMIN) return;
    if (b.identityId === ctx.identityId) return;
    if (ctx.partnerId && ctx.partnerId === b.partnerId) return;
    throw new DomainException('BOOKING_NOT_FOUND');
  }

  private cancellationDeadline(bookingDate: Date, startTime: Date, cancellationWindowHours: number): Date {
    const dateStr = bookingDate.toISOString().slice(0, 10);
    const timeStr = fmtTime(startTime);
    const startAt = new Date(`${dateStr}T${timeStr}:00+05:30`);
    return new Date(startAt.getTime() - cancellationWindowHours * 3_600_000);
  }

  private async resolveBookingId(idOrRef: string): Promise<string> {
    if (REFERENCE_CODE_RE.test(idOrRef)) {
      const b = await this.prisma.booking.findFirst({ where: { referenceCode: idOrRef } });
      if (!b) throw new DomainException('BOOKING_NOT_FOUND');
      return b.id;
    }
    return idOrRef;
  }

  private async groundIdForBooking(bookingId: string): Promise<string> {
    const b = await this.prisma.booking.findUnique({ where: { id: bookingId }, select: { groundId: true } });
    if (!b) throw new DomainException('BOOKING_NOT_FOUND');
    return b.groundId;
  }
}

function fmtTime(t: Date): string {
  return t.toISOString().slice(11, 16);
}
