import { Injectable, Logger } from '@nestjs/common';
import {
  BookingSessionStatus,
  BookingSource,
  BookingStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OutboxService } from '../../shared/outbox/outbox.service';
import { AvailabilityService } from '../availability/availability.service';

// Razorpay webhook envelope — only the fields we touch. Everything else is
// captured verbatim in webhook_receipts.raw_body for forensic replay.
interface RazorpayEnvelope {
  id?: string;
  event: string;
  created_at?: number;
  payload?: {
    payment?: { entity?: RzpPaymentEntity };
    refund?: { entity?: RzpRefundEntity };
  };
}
interface RzpPaymentEntity {
  id: string;
  order_id?: string;
  amount: number; // paise
  currency?: string;
  status?: string;
  method?: string;
  notes?: { booking_session_id?: string; identity_id?: string };
}
interface RzpRefundEntity {
  id: string;
  payment_id: string;
  amount: number; // paise
  status?: string;
}

const PAYMENT_METHOD_MAP: Record<string, PaymentMethod> = {
  card: PaymentMethod.CARD,
  upi: PaymentMethod.UPI,
  netbanking: PaymentMethod.NETBANKING,
  wallet: PaymentMethod.WALLET,
};

@Injectable()
export class RazorpayWebhookHandlerService {
  private readonly logger = new Logger(RazorpayWebhookHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly availability: AvailabilityService,
  ) {}

  // Dispatch by event.type. Returns "PROCESSED" | "IGNORED"; the controller
  // updates the receipt accordingly. Throws only for genuine handler errors
  // (unrecoverable DB error, etc.) — those bubble to a 500 for Razorpay retry.
  async dispatch(envelope: RazorpayEnvelope): Promise<'PROCESSED' | 'IGNORED'> {
    switch (envelope.event) {
      case 'payment.captured':
        return this.handlePaymentCaptured(envelope);
      case 'payment.failed':
        return this.handlePaymentFailed(envelope);
      case 'refund.created':
      case 'refund.processed':
        return this.handleRefund(envelope);
      case 'refund.failed':
        this.logger.warn({ event: envelope.event, id: envelope.id }, 'refund.failed received — admin review required');
        return 'IGNORED';
      default:
        this.logger.debug({ event: envelope.event }, 'unhandled razorpay event — acknowledging');
        return 'IGNORED';
    }
  }

  // Fallback path for Part 3.4 §7 — promote a session to a booking when the
  // client's confirm call didn't land. Idempotent via payments.transaction_reference UNIQUE.
  private async handlePaymentCaptured(envelope: RazorpayEnvelope): Promise<'PROCESSED' | 'IGNORED'> {
    const p = envelope.payload?.payment?.entity;
    if (!p || !p.id) return 'IGNORED';
    const sessionId = p.notes?.booking_session_id;
    if (!sessionId) {
      this.logger.warn({ payment_id: p.id }, 'payment.captured missing notes.booking_session_id — ignored');
      return 'IGNORED';
    }

    // Fast path: already promoted client-side. transaction_reference is UNIQUE.
    const existing = await this.prisma.payment.findFirst({
      where: { transactionReference: p.id },
      select: { id: true },
    });
    if (existing) return 'IGNORED';

    try {
      await this.prisma.$transaction(async (tx) => {
        // FOR UPDATE — block concurrent client-confirm on the same session.
        const rows = await tx.$queryRaw<{ id: string }[]>(
          Prisma.sql`SELECT id FROM booking_sessions WHERE id = ${sessionId}::uuid FOR UPDATE`,
        );
        if (rows.length === 0) {
          this.logger.warn({ session_id: sessionId, payment_id: p.id }, 'session not found — payment orphaned');
          return;
        }

        const session = await tx.bookingSession.findUnique({
          where: { id: sessionId },
          include: { ground: { include: { venue: true } } },
        });
        if (!session) return;

        // Client-side confirm already landed while we were waiting on the lock.
        const already = await tx.booking.findUnique({ where: { bookingSessionId: session.id } });
        if (already) return;

        if (session.status !== BookingSessionStatus.ACTIVE) {
          // Session expired but payment succeeded. Log for support; refund is
          // an operator decision. ponytail: log-only, add auto-refund when ops confirms policy.
          this.logger.error(
            { session_id: sessionId, session_status: session.status, payment_id: p.id, amount_paise: p.amount },
            'payment.captured on non-ACTIVE session — requires manual refund review',
          );
          return;
        }

        const expectedPaise = Math.round(Number(session.totalAmount) * 100);
        if (p.amount !== expectedPaise) {
          // Amount mismatch → do NOT create booking with wrong total. Log for support.
          this.logger.error(
            { session_id: sessionId, payment_id: p.id, expected: expectedPaise, got: p.amount },
            'payment.captured amount mismatch — no booking created',
          );
          return;
        }

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
            createdBy: session.identityId,
          },
        });

        const paymentRow = await tx.payment.create({
          data: {
            bookingId: booking.id,
            paymentProvider: PaymentProvider.RAZORPAY,
            transactionReference: p.id,
            amount: session.totalAmount,
            currency: 'INR',
            paymentMethod: PAYMENT_METHOD_MAP[(p.method ?? '').toLowerCase()] ?? PaymentMethod.UPI,
            paymentStatus: PaymentStatus.SUCCESS,
            paidAt: new Date(),
            providerPayload: {
              razorpay_order_id: p.order_id ?? null,
              razorpay_payment_id: p.id,
              method: p.method ?? null,
              source: 'WEBHOOK',
              envelope_id: envelope.id ?? null,
            } as Prisma.InputJsonValue,
          },
        });

        await tx.bookingSession.update({
          where: { id: session.id },
          data: { status: BookingSessionStatus.CANCELLED, updatedBy: session.identityId },
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
            via: 'WEBHOOK',
          },
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
            transaction_reference: p.id,
            via: 'WEBHOOK',
          },
        });

        this.availability.invalidate(session.groundId, session.bookingDate.toISOString().slice(0, 10));
      });
      return 'PROCESSED';
    } catch (err) {
      // 23505 on payments.transaction_reference — client-side confirm won the race.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return 'IGNORED';
      }
      throw err;
    }
  }

  private async handlePaymentFailed(envelope: RazorpayEnvelope): Promise<'PROCESSED' | 'IGNORED'> {
    const p = envelope.payload?.payment?.entity;
    if (!p) return 'IGNORED';
    const sessionId = p.notes?.booking_session_id;
    if (!sessionId) return 'IGNORED';

    await this.prisma.$transaction(async (tx) => {
      const session = await tx.bookingSession.findUnique({ where: { id: sessionId } });
      if (!session || session.status !== BookingSessionStatus.ACTIVE) return;

      await tx.bookingSession.update({
        where: { id: session.id },
        data: { status: BookingSessionStatus.CANCELLED, updatedBy: session.identityId },
      });
      await this.outbox.emit(tx, {
        aggregateType: 'BookingSession',
        aggregateId: session.id,
        eventType: 'PaymentFailed',
        payload: {
          session_id: session.id,
          identity_id: session.identityId,
          razorpay_payment_id: p.id,
          amount_paise: p.amount,
        },
      });
    });
    return 'PROCESSED';
  }

  private async handleRefund(envelope: RazorpayEnvelope): Promise<'PROCESSED' | 'IGNORED'> {
    const r = envelope.payload?.refund?.entity;
    if (!r) return 'IGNORED';

    const payment = await this.prisma.payment.findFirst({
      where: { transactionReference: r.payment_id },
      select: { id: true, bookingId: true, refundedAt: true, paymentStatus: true },
    });
    if (!payment) {
      this.logger.warn({ payment_id: r.payment_id, refund_id: r.id }, 'refund for unknown payment — ignored');
      return 'IGNORED';
    }

    await this.prisma.$transaction(async (tx) => {
      if (envelope.event === 'refund.created' && payment.paymentStatus !== PaymentStatus.REFUNDED) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            paymentStatus: PaymentStatus.REFUNDED,
            refundedAt: payment.refundedAt ?? new Date(),
            refundAmount: new Prisma.Decimal(r.amount / 100),
            refundReason: 'Provider-initiated refund',
          },
        });
      }
      if (envelope.event === 'refund.processed') {
        await this.outbox.emit(tx, {
          aggregateType: 'Payment',
          aggregateId: payment.id,
          eventType: 'RefundCompleted',
          payload: {
            payment_id: payment.id,
            booking_id: payment.bookingId,
            refund_reference: r.id,
            amount_paise: r.amount,
          },
        });
      }
    });
    return 'PROCESSED';
  }
}

function fmtTime(t: Date): string {
  return t.toISOString().slice(11, 16);
}
