import { Injectable } from '@nestjs/common';
import {
  BookingSource,
  BookingStatus,
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
import { BookingService } from './booking.service';
import { encodeCursor, decodeCursor } from '../../shared/pagination/cursor';
import { generateSlots } from '../availability/slot-generator';
import type { AuthContext } from '../../shared/auth/auth-context';
import type { PartnerCancelBookingDto } from './dtos/partner-cancel-booking.dto';
import type { ListPartnerBookingsDto } from './dtos/list-partner-bookings.dto';
import type { PartnerCalendarDto } from './dtos/partner-calendar.dto';

interface RequestMeta { requestId?: string; route?: string; sourceIp?: string; userAgent?: string }

const CHECK_IN_LEAD_MS = 30 * 60_000;
const NO_SHOW_LAG_MS = 30 * 60_000;
const MAX_CALENDAR_DAYS = 31;

@Injectable()
export class PartnerBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly razorpay: RazorpayService,
    private readonly availability: AvailabilityService,
    private readonly booking: BookingService,
  ) {}

  // ── State transitions ──────────────────────────────────────────────────

  async checkIn(ctx: AuthContext, id: string, meta: RequestMeta) {
    return this.runTransition(ctx, id, meta, {
      allowedFrom: [BookingStatus.CONFIRMED],
      to: BookingStatus.CHECKED_IN,
      action: 'BookingCheckedIn',
      timeGate(b, now) {
        const start = wallClock(b.bookingDate, b.startTime);
        const end = wallClock(b.bookingDate, b.endTime);
        if (now.getTime() < start.getTime() - CHECK_IN_LEAD_MS || now > end) {
          throw new DomainException('BOOKING_CHECK_IN_WINDOW');
        }
      },
      patch: (now) => ({ checkedInAt: now }),
    });
  }

  async complete(ctx: AuthContext, id: string, meta: RequestMeta) {
    return this.runTransition(ctx, id, meta, {
      allowedFrom: [BookingStatus.CHECKED_IN],
      to: BookingStatus.COMPLETED,
      action: 'BookingCompleted',
      patch: (now) => ({ completedAt: now }),
    });
  }

  async markNoShow(ctx: AuthContext, id: string, meta: RequestMeta) {
    return this.runTransition(ctx, id, meta, {
      allowedFrom: [BookingStatus.CONFIRMED],
      to: BookingStatus.NO_SHOW,
      action: 'BookingNoShow',
      timeGate(b, now) {
        const start = wallClock(b.bookingDate, b.startTime);
        if (now.getTime() < start.getTime() + NO_SHOW_LAG_MS) {
          throw new DomainException('BOOKING_NO_SHOW_WINDOW');
        }
      },
      patch: () => ({}),
    });
  }

  // Partner-initiated cancellation. Bypasses customer window; always full
  // refund unless caller specifies a smaller amount. Mirrors BookingService.cancel
  // but with partner-side rules — kept here to keep partner surface self-contained.
  async partnerCancel(ctx: AuthContext, id: string, dto: PartnerCancelBookingDto, meta: RequestMeta) {
    const bookingId = await this.resolveBookingId(id);
    const partnerId = await this.resolvePartnerId(ctx);

    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, deletedAt: null },
        include: { payment: true },
      });
      if (!booking) throw new DomainException('BOOKING_NOT_FOUND');
      if (ctx.role !== Role.ADMIN && booking.partnerId !== partnerId) throw new DomainException('BOOKING_NOT_FOUND');
      if (booking.bookingStatus === BookingStatus.CANCELLED) throw new DomainException('BOOKING_ALREADY_CANCELLED');
      if (
        booking.bookingStatus !== BookingStatus.CONFIRMED &&
        booking.bookingStatus !== BookingStatus.CHECKED_IN
      ) {
        throw new DomainException('BOOKING_NOT_CANCELLABLE');
      }
      if (!booking.payment) throw new DomainException('BOOKING_NOT_CANCELLABLE');

      const totalPaise = Math.round(Number(booking.totalAmount) * 100);
      const refundPaise = dto.refund_amount_paise ?? totalPaise;
      if (refundPaise > totalPaise) throw new DomainException('REFUND_INELIGIBLE');

      let refundRef: string | null = null;
      if (refundPaise > 0 && booking.payment.paymentProvider === PaymentProvider.RAZORPAY) {
        const refund = await this.razorpay.createRefund(booking.payment.transactionReference, refundPaise, {
          booking_reference: booking.referenceCode,
          initiated_by: 'PARTNER',
        });
        refundRef = refund.id;
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
      if (refundPaise > 0) {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: {
            paymentStatus: PaymentStatus.REFUNDED,
            refundedAt: now,
            refundAmount: new Prisma.Decimal(refundPaise / 100),
            refundReason: dto.reason ?? null,
          },
        });
      }

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'BookingCancelledByPartner',
        resourceType: 'Booking',
        resourceId: booking.id,
        resourceReferenceCode: booking.referenceCode,
        changes: { booking_status: { before: booking.bookingStatus, after: BookingStatus.CANCELLED } },
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Booking',
        aggregateId: booking.id,
        eventType: 'BookingCancelledByPartner',
        payload: {
          booking_id: booking.id,
          reference_code: booking.referenceCode,
          cancelled_by: 'PARTNER',
          reason: dto.reason ?? null,
        },
        correlationId: meta.requestId,
      });
      if (refundPaise > 0) {
        await this.outbox.emit(tx, {
          aggregateType: 'Payment',
          aggregateId: booking.payment.id,
          eventType: 'RefundInitiated',
          payload: {
            payment_id: booking.payment.id,
            booking_id: booking.id,
            amount_paise: refundPaise,
            refund_reference: refundRef,
          },
          correlationId: meta.requestId,
        });
      }

      return { updated, refundPaise, refundRef };
    });

    const b = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (b) this.availability.invalidate(b.groundId, isoDate(b.bookingDate));

    return {
      booking: {
        id: result.updated.id,
        booking_status: result.updated.bookingStatus,
        cancelled_at: result.updated.cancelledAt?.toISOString() ?? null,
        cancellation_reason: result.updated.cancellationReason,
      },
      refund: {
        amount_paise: result.refundPaise,
        expected_settlement_days: 5,
        reference: result.refundRef,
      },
    };
  }

  // ── Reads ──────────────────────────────────────────────────────────────

  // GET /partners/me/bookings
  async listBookings(ctx: AuthContext, dto: ListPartnerBookingsDto) {
    const partnerId = await this.resolvePartnerId(ctx);
    const limit = Math.min(100, Math.max(1, dto.limit ?? 20));

    const where: Prisma.BookingWhereInput = { deletedAt: null };
    if (partnerId) where.partnerId = partnerId;
    if (dto.venue_id) where.venueId = dto.venue_id;
    if (dto.ground_id) where.groundId = dto.ground_id;
    if (dto.status?.length) where.bookingStatus = { in: dto.status };
    if (dto.source?.length) where.bookingSource = { in: dto.source };
    if (dto.from || dto.to) {
      where.bookingDate = {};
      if (dto.from) (where.bookingDate as Prisma.DateTimeFilter).gte = new Date(`${dto.from}T00:00:00Z`);
      if (dto.to) (where.bookingDate as Prisma.DateTimeFilter).lte = new Date(`${dto.to}T00:00:00Z`);
    }
    if (dto.q) {
      const q = dto.q.trim();
      // Reference code exact-ish + customer phone/name fuzzy. Simple ILIKE — good enough
      // for MVP; upgrade to trigram/FTS if partner catalogs grow past ~10k bookings.
      where.OR = [
        { referenceCode: { contains: q, mode: 'insensitive' } },
        { identity: { phone: { contains: q } } },
        { identity: { profile: { OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ] } } },
      ];
    }

    const decoded = dto.cursor ? decodeCursor<{ createdAt: string; id: string }>(dto.cursor) : null;
    if (decoded) {
      const cursorClause: Prisma.BookingWhereInput = {
        OR: [
          { createdAt: { lt: new Date(decoded.createdAt) } },
          { createdAt: new Date(decoded.createdAt), id: { lt: decoded.id } },
        ],
      };
      Object.assign(where, { AND: [{ ...where }, cursorClause] });
    }

    const rows = await this.prisma.booking.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        venue: { select: { id: true, name: true } },
        ground: { select: { id: true, name: true } },
        identity: { select: { id: true, referenceCode: true, phone: true, profile: { select: { firstName: true, lastName: true } } } },
        payment: { select: { paymentStatus: true } },
      },
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    return {
      data: page.map((b) => ({
        id: b.id,
        reference_code: b.referenceCode,
        customer: {
          identity_id: b.identity.id,
          reference_code: b.identity.referenceCode,
          name: fullName(b.identity.profile),
          phone: b.identity.phone,
        },
        venue: { id: b.venue.id, name: b.venue.name },
        ground: { id: b.ground.id, name: b.ground.name },
        booking_date: isoDate(b.bookingDate),
        start_time: fmtTime(b.startTime),
        end_time: fmtTime(b.endTime),
        booking_status: b.bookingStatus,
        booking_source: b.bookingSource,
        total_amount_paise: Math.round(Number(b.totalAmount) * 100),
        payment_status: b.payment?.paymentStatus ?? null,
        created_at: b.createdAt.toISOString(),
      })),
      pagination: {
        cursor: dto.cursor ?? null,
        next_cursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null,
        has_more: hasMore,
        total: null,
      },
    };
  }

  // GET /partners/me/calendar
  async calendar(ctx: AuthContext, dto: PartnerCalendarDto) {
    const partnerId = await this.resolvePartnerId(ctx);
    const from = new Date(`${dto.from}T00:00:00+05:30`);
    const to = new Date(`${dto.to}T00:00:00+05:30`);
    const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
    if (Number.isNaN(days) || days < 1 || days > MAX_CALENDAR_DAYS) {
      throw new DomainException('CALENDAR_RANGE_INVALID');
    }

    // ponytail: single-ground view. Aggregate-across-grounds view is deferred;
    // when a partner has one venue with a handful of grounds, the client can fan
    // out this endpoint per ground and merge client-side. Reconsider if profiling
    // shows N calls hurting the partner app cold-start.
    if (!dto.ground_id) throw new DomainException('CALENDAR_RANGE_INVALID');

    const ground = await this.prisma.ground.findFirst({
      where: { id: dto.ground_id, deletedAt: null },
      include: {
        venue: { select: { id: true, partnerId: true } },
        configuration: true,
        pricingRules: { where: { deletedAt: null } },
        operatingHours: { where: { deletedAt: null } },
      },
    });
    if (!ground) throw new DomainException('GROUND_NOT_FOUND');
    if (ctx.role !== Role.ADMIN && ground.venue.partnerId !== partnerId) {
      throw new DomainException('GROUND_NOT_FOUND');
    }

    const rangeStart = new Date(`${dto.from}T00:00:00Z`);
    const rangeEnd = new Date(`${dto.to}T00:00:00Z`);
    const [bookings, sessions, exceptions, maintenance] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          groundId: ground.id,
          bookingDate: { gte: rangeStart, lte: rangeEnd },
          deletedAt: null,
        },
        include: { identity: { select: { profile: { select: { firstName: true, lastName: true } } } } },
      }),
      this.prisma.bookingSession.findMany({
        where: {
          groundId: ground.id,
          bookingDate: { gte: rangeStart, lte: rangeEnd },
          status: 'ACTIVE',
          deletedAt: null,
        },
      }),
      this.prisma.availabilityException.findMany({
        where: {
          groundId: ground.id,
          exceptionDate: { gte: rangeStart, lte: rangeEnd },
          deletedAt: null,
        },
      }),
      this.prisma.maintenanceBlock.findMany({
        where: {
          groundId: ground.id,
          deletedAt: null,
          startDatetime: { lte: new Date(`${dto.to}T23:59:59+05:30`) },
          endDatetime: { gte: new Date(`${dto.from}T00:00:00+05:30`) },
        },
      }),
    ]);

    const bookingsByDate = groupByDate(bookings, (b) => isoDate(b.bookingDate));
    const now = new Date();
    const daysOut: Array<Record<string, unknown>> = [];

    for (let i = 0; i < days; i += 1) {
      const dt = new Date(from.getTime() + i * 86_400_000);
      const dateStr = isoDateFromMs(dt.getTime());
      const dow = ((dt.getUTCDay() + 6) % 7) + 1;
      const operatingHour = ground.operatingHours.find((oh) => oh.dayOfWeek === dow) ?? null;

      const slots = generateSlots({
        ground: { id: ground.id, status: ground.status },
        configuration: ground.configuration,
        operatingHour,
        exceptions: exceptions.filter((e) => isoDate(e.exceptionDate) === dateStr),
        maintenance,
        pricingRules: ground.pricingRules,
        existingBookings: bookings,
        activeBookingSessions: sessions,
        date: dateStr,
        now,
      });

      const dateBookings = bookingsByDate.get(dateStr) ?? [];
      const enriched = slots.map((s) => {
        if (s.state === 'BOOKED') {
          const match = dateBookings.find((b) => fmtTime(b.startTime) === s.start_time);
          if (match) {
            return {
              ...s,
              booking_id: match.id,
              booking_reference: match.referenceCode,
              customer_name: shortName(match.identity.profile),
            };
          }
        }
        if (s.state === 'MAINTENANCE') {
          const block = maintenance.find(
            (m) => overlapsDay(m.startDatetime, m.endDatetime, dateStr, s.start_time, s.end_time),
          );
          if (block) return { ...s, reason: block.title };
        }
        return s;
      });

      daysOut.push({
        date: dateStr,
        day_of_week: dow,
        slots: enriched,
        exceptions: exceptions
          .filter((e) => isoDate(e.exceptionDate) === dateStr)
          .map((e) => ({ title: e.title, start_time: fmtTime(e.startTime), end_time: fmtTime(e.endTime) })),
      });
    }

    return { from: dto.from, to: dto.to, days: daysOut };
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private async runTransition(
    ctx: AuthContext,
    id: string,
    meta: RequestMeta,
    spec: {
      allowedFrom: BookingStatus[];
      to: BookingStatus;
      action: string;
      timeGate?: (b: { bookingDate: Date; startTime: Date; endTime: Date }, now: Date) => void;
      patch: (now: Date) => Prisma.BookingUpdateInput;
    },
  ) {
    const bookingId = await this.resolveBookingId(id);
    const partnerId = await this.resolvePartnerId(ctx);

    await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, deletedAt: null },
      });
      if (!booking) throw new DomainException('BOOKING_NOT_FOUND');
      if (ctx.role !== Role.ADMIN && booking.partnerId !== partnerId) throw new DomainException('BOOKING_NOT_FOUND');
      if (!spec.allowedFrom.includes(booking.bookingStatus)) throw new DomainException('BOOKING_INVALID_STATE');

      const now = new Date();
      spec.timeGate?.(booking, now);

      await tx.booking.update({
        where: { id: booking.id },
        data: { ...spec.patch(now), bookingStatus: spec.to, updatedBy: ctx.identityId },
      });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: spec.action,
        resourceType: 'Booking',
        resourceId: booking.id,
        resourceReferenceCode: booking.referenceCode,
        changes: { booking_status: { before: booking.bookingStatus, after: spec.to } },
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Booking',
        aggregateId: booking.id,
        eventType: spec.action,
        payload: {
          booking_id: booking.id,
          reference_code: booking.referenceCode,
          identity_id: booking.identityId,
          partner_id: booking.partnerId,
          ground_id: booking.groundId,
          from: booking.bookingStatus,
          to: spec.to,
        },
        correlationId: meta.requestId,
      });
    });

    // Availability cache reflects slot state — check-in/complete/no-show don't
    // free the slot but the partner calendar reads this endpoint's response,
    // so invalidate to keep both surfaces coherent on retries.
    const b = await this.prisma.booking.findUnique({ where: { id: bookingId }, select: { groundId: true, bookingDate: true } });
    if (b) this.availability.invalidate(b.groundId, isoDate(b.bookingDate));

    return this.booking.serializeBookingResponse(bookingId);
  }

  private async resolveBookingId(idOrRef: string): Promise<string> {
    if (/^TX-BK-\d{4}\d{6}$/.test(idOrRef)) {
      const b = await this.prisma.booking.findFirst({ where: { referenceCode: idOrRef } });
      if (!b) throw new DomainException('BOOKING_NOT_FOUND');
      return b.id;
    }
    return idOrRef;
  }

  private async resolvePartnerId(ctx: AuthContext): Promise<string | null> {
    if (ctx.role === Role.ADMIN) return null;
    if (ctx.partnerId) return ctx.partnerId;
    const partner = await this.prisma.partner.findFirst({
      where: { identityId: ctx.identityId, deletedAt: null },
      select: { id: true },
    });
    if (!partner) throw new DomainException('AUTH_INSUFFICIENT_PERMISSIONS');
    return partner.id;
  }
}

function wallClock(bookingDate: Date, timeOfDay: Date): Date {
  return new Date(`${isoDate(bookingDate)}T${fmtTime(timeOfDay)}:00+05:30`);
}

function fmtTime(t: Date): string {
  return t.toISOString().slice(11, 16);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isoDateFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function fullName(profile: { firstName: string; lastName: string | null } | null): string {
  if (!profile) return '';
  return profile.lastName ? `${profile.firstName} ${profile.lastName}` : profile.firstName;
}

function shortName(profile: { firstName: string; lastName: string | null } | null): string {
  if (!profile) return 'Customer';
  const last = profile.lastName?.trim();
  return last ? `${profile.firstName} ${last[0]}.` : profile.firstName;
}

function groupByDate<T>(items: T[], keyFn: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = keyFn(it);
    const arr = m.get(k);
    if (arr) arr.push(it); else m.set(k, [it]);
  }
  return m;
}

// Exported for the assert-based self-check next to the service. Not part of
// the module public API — keep imports scoped to test files.
export const __internals = { wallClock, fmtTime, isoDate, shortName, groupByDate, overlapsDay };

function overlapsDay(
  start: Date,
  end: Date,
  dateStr: string,
  slotStart: string,
  slotEnd: string,
): boolean {
  const s = new Date(`${dateStr}T${slotStart}:00+05:30`).getTime();
  const e = new Date(`${dateStr}T${slotEnd}:00+05:30`).getTime();
  return start.getTime() < e && end.getTime() > s;
}
