import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentStatus,
  Prisma,
  RefundRequestSource,
  RefundRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OutboxService } from '../../shared/outbox/outbox.service';
import { AuditService } from '../../shared/audit/audit.service';
import { RazorpayService } from '../../shared/razorpay/razorpay.service';
import { DomainException } from '../../shared/errors/domain.exception';
import { encodeCursor, decodeCursor } from '../../shared/pagination/cursor';
import type { AuthContext } from '../../shared/auth/auth-context';
import type { ListRefundRequestsDto } from './dtos/list-refund-requests.dto';

interface RequestMeta { requestId?: string; route?: string; sourceIp?: string; userAgent?: string }

export interface CreateOrphanRefundArgs {
  razorpayPaymentId: string;
  amountPaise: number;
  bookingSessionId?: string | null;
  bookingId?: string | null;
  paymentId?: string | null;
  reason?: string;
  correlationId?: string;
}

// RefundService — admin-approval queue for refunds.
//
// Sources of a RefundRequest:
//   ORPHANED_PAYMENT  — payment captured on a lapsed/cancelled session
//                        (webhook or client confirm hits the orphan branch).
//   CUSTOMER_REQUEST  — customer asks for a refund outside the auto-cancel window.
//   ADMIN_MANUAL      — admin creates one from the console.
//
// Idempotency: the partial UNIQUE index on refund_requests
// (razorpay_payment_id) WHERE status IN ('PENDING_ADMIN','APPROVED') ensures
// that repeated attempts (webhook retries, client-confirm retries) collapse
// to the same row. `createInTx` catches P2002 and short-circuits to the
// existing row so callers can retry safely.
@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly razorpay: RazorpayService,
  ) {}

  // Insert a RefundRequest inside an existing transaction. Idempotent via
  // the partial UNIQUE (razorpay_payment_id) WHERE status IN
  // ('PENDING_ADMIN','APPROVED'). If a matching open request already exists,
  // returns it and skips the outbox emit (the first-insert already emitted).
  async createInTx(
    tx: Prisma.TransactionClient,
    args: CreateOrphanRefundArgs & { source: RefundRequestSource; actorIdentityId: string | null },
    context?: RequestMeta,
  ): Promise<{ id: string; created: boolean }> {
    try {
      const row = await tx.refundRequest.create({
        data: {
          razorpayPaymentId: args.razorpayPaymentId,
          paymentId: args.paymentId ?? null,
          bookingId: args.bookingId ?? null,
          bookingSessionId: args.bookingSessionId ?? null,
          amountPaise: args.amountPaise,
          source: args.source,
          status: RefundRequestStatus.PENDING_ADMIN,
          reason: args.reason ?? null,
        },
        select: { id: true },
      });

      await this.audit.record(tx, {
        actorIdentityId: args.actorIdentityId,
        actorRole: args.actorIdentityId ? 'ADMIN' : 'SYSTEM',
        action: 'RefundRequestCreated',
        resourceType: 'RefundRequest',
        resourceId: row.id,
        changes: { status: { before: null, after: RefundRequestStatus.PENDING_ADMIN } },
        context,
      });

      await this.outbox.emit(tx, {
        aggregateType: 'RefundRequest',
        aggregateId: row.id,
        eventType: 'RefundRequestCreated',
        payload: {
          refund_request_id: row.id,
          razorpay_payment_id: args.razorpayPaymentId,
          amount_paise: args.amountPaise,
          source: args.source,
          booking_id: args.bookingId ?? null,
          booking_session_id: args.bookingSessionId ?? null,
          reason: args.reason ?? null,
        },
        correlationId: args.correlationId,
      });

      return { id: row.id, created: true };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Open request already exists for this payment — reuse it.
        const existing = await tx.refundRequest.findFirst({
          where: {
            razorpayPaymentId: args.razorpayPaymentId,
            status: { in: [RefundRequestStatus.PENDING_ADMIN, RefundRequestStatus.APPROVED] },
          },
          select: { id: true },
        });
        if (!existing) throw err;
        this.logger.log(
          { refund_request_id: existing.id, razorpay_payment_id: args.razorpayPaymentId },
          'RefundRequest already open for payment — reused',
        );
        return { id: existing.id, created: false };
      }
      throw err;
    }
  }

  // Convenience wrapper: open a fresh tx and delegate.
  async createFromOrphanedPayment(args: CreateOrphanRefundArgs, context?: RequestMeta): Promise<{ id: string; created: boolean }> {
    return this.prisma.$transaction((tx) =>
      this.createInTx(tx, { ...args, source: RefundRequestSource.ORPHANED_PAYMENT, actorIdentityId: null }, context),
    );
  }

  // ── Admin queue ────────────────────────────────────────────────────────

  async listPending(_ctx: AuthContext, dto: ListRefundRequestsDto) {
    const limit = Math.min(100, Math.max(1, dto.limit ?? 20));
    const where: Prisma.RefundRequestWhereInput = {};
    if (dto.status) where.status = dto.status;
    else where.status = RefundRequestStatus.PENDING_ADMIN;

    const decoded = dto.cursor ? decodeCursor<{ createdAt: string; id: string }>(dto.cursor) : null;
    if (decoded) {
      where.OR = [
        { createdAt: { gt: new Date(decoded.createdAt) } },
        { createdAt: new Date(decoded.createdAt), id: { gt: decoded.id } },
      ];
    }

    const rows = await this.prisma.refundRequest.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    return {
      data: page.map(serialize),
      pagination: {
        cursor: dto.cursor ?? null,
        next_cursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null,
        has_more: hasMore,
        total: null,
      },
    };
  }

  async getOne(_ctx: AuthContext, id: string) {
    const row = await this.prisma.refundRequest.findUnique({ where: { id } });
    if (!row) throw new DomainException('REFUND_REQUEST_NOT_FOUND');
    return serialize(row);
  }

  // Approve → mark APPROVED, execute Razorpay refund (via
  // findOrCreateRefund so retries dedupe), transition to EXECUTED, update
  // the associated payment row. All in one tx to match the codebase's
  // "refund inside tx" convention.
  async approve(ctx: AuthContext, id: string, adminNotes: string | undefined, meta: RequestMeta) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT id FROM refund_requests WHERE id = ${id}::uuid FOR UPDATE`,
      );
      if (rows.length === 0) throw new DomainException('REFUND_REQUEST_NOT_FOUND');

      const req = await tx.refundRequest.findUnique({ where: { id } });
      if (!req) throw new DomainException('REFUND_REQUEST_NOT_FOUND');
      if (req.status !== RefundRequestStatus.PENDING_ADMIN) {
        throw new DomainException('REFUND_REQUEST_INVALID_STATE');
      }

      const idempotencyKey = `refund-request:${req.id}`;
      const extraNotes: Record<string, string> = { refund_request_id: req.id };
      if (req.bookingId) extraNotes.booking_id = req.bookingId;
      if (req.bookingSessionId) extraNotes.booking_session_id = req.bookingSessionId;

      const { refund, reused } = await this.razorpay.findOrCreateRefund(
        req.razorpayPaymentId,
        req.amountPaise,
        idempotencyKey,
        extraNotes,
      );

      const now = new Date();
      const updated = await tx.refundRequest.update({
        where: { id: req.id },
        data: {
          status: RefundRequestStatus.EXECUTED,
          decidedBy: ctx.identityId,
          decidedAt: now,
          executedAt: now,
          razorpayRefundId: refund.id,
          adminNotes: adminNotes ?? null,
          attempts: { increment: 1 },
        },
      });

      // Mirror onto payments if we can. Only touch if not already refunded.
      if (req.paymentId) {
        const payment = await tx.payment.findUnique({ where: { id: req.paymentId } });
        if (payment && payment.paymentStatus !== PaymentStatus.REFUNDED) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              paymentStatus: PaymentStatus.REFUNDED,
              refundedAt: payment.refundedAt ?? now,
              refundAmount: new Prisma.Decimal(refund.amount / 100),
              refundReason: adminNotes ?? req.reason ?? 'Admin-approved refund',
            },
          });
        }
      }

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: reused ? 'RefundRequestApprovedReusedExistingRefund' : 'RefundRequestApproved',
        resourceType: 'RefundRequest',
        resourceId: req.id,
        changes: { status: { before: req.status, after: RefundRequestStatus.EXECUTED } },
        context: meta,
      });

      await this.outbox.emit(tx, {
        aggregateType: 'RefundRequest',
        aggregateId: req.id,
        eventType: 'RefundRequestExecuted',
        payload: {
          refund_request_id: req.id,
          razorpay_payment_id: req.razorpayPaymentId,
          razorpay_refund_id: refund.id,
          booking_id: req.bookingId ?? null,
          amount_paise: refund.amount,
          reused_existing: reused,
        },
        correlationId: meta.requestId,
      });

      return serialize(updated);
    });
  }

  async reject(ctx: AuthContext, id: string, adminNotes: string, meta: RequestMeta) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT id FROM refund_requests WHERE id = ${id}::uuid FOR UPDATE`,
      );
      if (rows.length === 0) throw new DomainException('REFUND_REQUEST_NOT_FOUND');

      const req = await tx.refundRequest.findUnique({ where: { id } });
      if (!req) throw new DomainException('REFUND_REQUEST_NOT_FOUND');
      if (req.status !== RefundRequestStatus.PENDING_ADMIN) {
        throw new DomainException('REFUND_REQUEST_INVALID_STATE');
      }

      const updated = await tx.refundRequest.update({
        where: { id: req.id },
        data: {
          status: RefundRequestStatus.REJECTED,
          decidedBy: ctx.identityId,
          decidedAt: new Date(),
          adminNotes,
        },
      });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'RefundRequestRejected',
        resourceType: 'RefundRequest',
        resourceId: req.id,
        changes: { status: { before: req.status, after: RefundRequestStatus.REJECTED } },
        context: meta,
      });

      await this.outbox.emit(tx, {
        aggregateType: 'RefundRequest',
        aggregateId: req.id,
        eventType: 'RefundRequestRejected',
        payload: {
          refund_request_id: req.id,
          razorpay_payment_id: req.razorpayPaymentId,
          amount_paise: req.amountPaise,
          admin_notes: adminNotes,
        },
        correlationId: meta.requestId,
      });

      return serialize(updated);
    });
  }
}

function serialize(r: {
  id: string;
  razorpayPaymentId: string;
  paymentId: string | null;
  bookingId: string | null;
  bookingSessionId: string | null;
  amountPaise: number;
  currency: string;
  source: RefundRequestSource;
  status: RefundRequestStatus;
  reason: string | null;
  adminNotes: string | null;
  decidedBy: string | null;
  decidedAt: Date | null;
  executedAt: Date | null;
  razorpayRefundId: string | null;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    razorpay_payment_id: r.razorpayPaymentId,
    payment_id: r.paymentId,
    booking_id: r.bookingId,
    booking_session_id: r.bookingSessionId,
    amount_paise: r.amountPaise,
    currency: r.currency,
    source: r.source,
    status: r.status,
    reason: r.reason,
    admin_notes: r.adminNotes,
    decided_by: r.decidedBy,
    decided_at: r.decidedAt?.toISOString() ?? null,
    executed_at: r.executedAt?.toISOString() ?? null,
    razorpay_refund_id: r.razorpayRefundId,
    attempts: r.attempts,
    last_error: r.lastError,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}
