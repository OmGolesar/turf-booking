import { Injectable } from '@nestjs/common';
import { PartnerStatus, Prisma, Role, VenueStatus, GroundStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OutboxService } from '../../shared/outbox/outbox.service';
import { AuditService } from '../../shared/audit/audit.service';
import { DomainException } from '../../shared/errors/domain.exception';
import type { AuthContext } from '../../shared/auth/auth-context';
import { toPartnerResource, PartnerResource } from './dtos/partner-response';
import type { CreatePartnerDto } from './dtos/create-partner.dto';
import type { UpdatePartnerDto } from './dtos/update-partner.dto';
import type { DashboardRange } from './dtos/dashboard.dto';

interface RequestMeta {
  requestId?: string;
  route?: string;
  sourceIp?: string;
  userAgent?: string;
}

interface VerificationChecklist {
  business_details_complete: boolean;
  phone_verified: boolean;
  email_verified: boolean;
  at_least_one_venue: boolean;
  at_least_one_ground_active: boolean;
}

export interface PartnerWithChecklist extends PartnerResource {
  verification_checklist: VerificationChecklist;
  counts: {
    venues: number;
    grounds_active: number;
    bookings_upcoming: number;
    bookings_this_month: number;
  };
}

@Injectable()
export class PartnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  // ── POST /partners ─────────────────────────────────────────────────────
  async create(ctx: AuthContext, dto: CreatePartnerDto, meta: RequestMeta): Promise<PartnerResource> {
    // Verification precondition applies unless already a PARTNER (idempotent conversion).
    const identity = await this.prisma.identity.findUnique({ where: { id: ctx.identityId } });
    if (!identity) throw new DomainException('IDENTITY_NOT_FOUND');
    if (!identity.phoneVerifiedAt || !identity.emailVerifiedAt) {
      throw new DomainException('IDENTITY_VERIFICATION_INCOMPLETE');
    }

    const partner = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.partner.findUnique({ where: { identityId: ctx.identityId } });
      if (existing) throw new DomainException('PARTNER_ALREADY_EXISTS');

      const created = await tx.partner.create({
        data: {
          identityId: ctx.identityId,
          businessName: dto.business_name,
          displayName: dto.display_name,
          email: dto.email ?? null,
          phone: dto.phone,
          address: dto.address ?? null,
          city: dto.city,
          state: dto.state,
          status: PartnerStatus.PENDING,
          isVerified: false,
          createdBy: ctx.identityId,
        },
      });

      // Upgrade the identity role in the same tx so guards see PARTNER on next request.
      await tx.identity.update({ where: { id: ctx.identityId }, data: { role: Role.PARTNER } });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: Role.PARTNER,
        action: 'PartnerCreated',
        resourceType: 'Partner',
        resourceId: created.id,
        resourceReferenceCode: created.referenceCode,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Partner',
        aggregateId: created.id,
        eventType: 'PartnerCreated',
        payload: {
          partner_id: created.id,
          reference_code: created.referenceCode,
          identity_id: ctx.identityId,
          business_name: created.businessName,
        },
        correlationId: meta.requestId,
      });
      return created;
    });

    return toPartnerResource(partner);
  }

  // ── GET /partners/me ───────────────────────────────────────────────────
  async me(ctx: AuthContext): Promise<PartnerWithChecklist> {
    const partner = await this.prisma.partner.findFirst({
      where: { identityId: ctx.identityId, deletedAt: null },
      include: { identity: true },
    });
    if (!partner) throw new DomainException('PARTNER_NOT_FOUND');

    const [venueCount, activeGroundCount, upcomingBookings, monthBookings] = await Promise.all([
      this.prisma.venue.count({ where: { partnerId: partner.id, deletedAt: null } }),
      this.prisma.ground.count({
        where: { status: GroundStatus.ACTIVE, deletedAt: null, venue: { partnerId: partner.id } },
      }),
      this.prisma.booking.count({
        where: { partnerId: partner.id, bookingDate: { gte: new Date() }, bookingStatus: { in: ['CONFIRMED', 'CHECKED_IN'] } },
      }),
      this.prisma.booking.count({
        where: { partnerId: partner.id, bookingDate: { gte: startOfMonth() } },
      }),
    ]);

    const checklist: VerificationChecklist = {
      business_details_complete: Boolean(partner.email && partner.phone && partner.address),
      phone_verified: Boolean(partner.identity.phoneVerifiedAt),
      email_verified: Boolean(partner.identity.emailVerifiedAt),
      at_least_one_venue: venueCount > 0,
      at_least_one_ground_active: activeGroundCount > 0,
    };

    return {
      ...toPartnerResource(partner),
      verification_checklist: checklist,
      counts: {
        venues: venueCount,
        grounds_active: activeGroundCount,
        bookings_upcoming: upcomingBookings,
        bookings_this_month: monthBookings,
      },
    };
  }

  // ── PATCH /partners/me ─────────────────────────────────────────────────
  async update(ctx: AuthContext, dto: UpdatePartnerDto, meta: RequestMeta): Promise<PartnerResource> {
    const partner = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.partner.findFirst({ where: { identityId: ctx.identityId, deletedAt: null } });
      if (!existing) throw new DomainException('PARTNER_NOT_FOUND');

      const data: Prisma.PartnerUpdateInput = {};
      const changes: Record<string, { before: unknown; after: unknown }> = {};

      if (dto.business_name !== undefined && dto.business_name !== existing.businessName) {
        // business_name locks once status leaves PENDING (Part 3.2 §5).
        if (existing.status !== PartnerStatus.PENDING) throw new DomainException('VENUE_STATUS_LOCKED');
        changes.business_name = { before: existing.businessName, after: dto.business_name };
        data.businessName = dto.business_name;
      }
      const fields: Array<[keyof UpdatePartnerDto, keyof typeof existing, string]> = [
        ['display_name', 'displayName', 'display_name'],
        ['email', 'email', 'email'],
        ['phone', 'phone', 'phone'],
        ['address', 'address', 'address'],
      ];
      for (const [dtoKey, colKey, jsonKey] of fields) {
        const next = dto[dtoKey];
        if (next !== undefined && next !== (existing as Record<string, unknown>)[colKey as string]) {
          changes[jsonKey] = { before: (existing as Record<string, unknown>)[colKey as string], after: next };
          (data as Record<string, unknown>)[colKey as string] = next;
        }
      }
      if (Object.keys(changes).length === 0) return existing;
      data.updatedBy = ctx.identityId;
      const updated = await tx.partner.update({ where: { id: existing.id }, data });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'PartnerUpdated',
        resourceType: 'Partner',
        resourceId: updated.id,
        resourceReferenceCode: updated.referenceCode,
        changes,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Partner',
        aggregateId: updated.id,
        eventType: 'PartnerUpdated',
        payload: { partner_id: updated.id, changes },
        correlationId: meta.requestId,
      });
      return updated;
    });

    return toPartnerResource(partner);
  }

  // ── POST /partners/me/actions/submit-for-review ────────────────────────
  async submitForReview(ctx: AuthContext, meta: RequestMeta) {
    const result = await this.prisma.$transaction(async (tx) => {
      const partner = await tx.partner.findFirst({
        where: { identityId: ctx.identityId, deletedAt: null },
        include: { identity: true },
      });
      if (!partner) throw new DomainException('PARTNER_NOT_FOUND');
      if (partner.status !== PartnerStatus.PENDING) throw new DomainException('PARTNER_SUBMIT_PRECONDITIONS');

      // Checklist preconditions
      const detailsOk = Boolean(partner.email && partner.phone && partner.address);
      const verifiedOk = Boolean(partner.identity.phoneVerifiedAt && partner.identity.emailVerifiedAt);
      const venuesWithGrounds = await tx.venue.count({
        where: {
          partnerId: partner.id,
          deletedAt: null,
          grounds: { some: { status: { in: [GroundStatus.DRAFT, GroundStatus.ACTIVE] }, deletedAt: null } },
        },
      });
      if (!detailsOk || !verifiedOk || venuesWithGrounds === 0) {
        throw new DomainException('PARTNER_SUBMIT_PRECONDITIONS');
      }

      const now = new Date();
      const updated = await tx.partner.update({
        where: { id: partner.id },
        data: { status: PartnerStatus.UNDER_REVIEW, updatedBy: ctx.identityId },
      });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'PartnerSubmittedForReview',
        resourceType: 'Partner',
        resourceId: updated.id,
        resourceReferenceCode: updated.referenceCode,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Partner',
        aggregateId: updated.id,
        eventType: 'PartnerSubmittedForReview',
        payload: { partner_id: updated.id, submitted_at: now.toISOString() },
        correlationId: meta.requestId,
      });
      return { updated, submittedAt: now };
    });

    return {
      status: result.updated.status,
      submitted_at: result.submittedAt.toISOString(),
      estimated_review_hours: 24,
    };
  }

  // ── GET /partners/me/dashboard ─────────────────────────────────────────
  // Aggregation only reflects DB state. Booking-heavy metrics (occupancy,
  // top_grounds, upcoming) turn on once Slice D lands. Everything is still
  // computed live from bookings/payments so the response upgrades itself.
  async dashboard(ctx: AuthContext, range: DashboardRange = 'today') {
    const partner = await this.prisma.partner.findFirst({ where: { identityId: ctx.identityId, deletedAt: null } });
    if (!partner) throw new DomainException('PARTNER_NOT_FOUND');

    const [fromDate, toDate] = rangeToDates(range);

    const [bookingsInRange, revenueAgg, occupancy, topGrounds, upcoming] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['bookingStatus'],
        where: {
          partnerId: partner.id,
          bookingDate: { gte: fromDate, lte: toDate },
        },
        _count: { _all: true },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          paymentStatus: 'SUCCESS',
          booking: { partnerId: partner.id, bookingDate: { gte: fromDate, lte: toDate } },
        },
      }),
      this.computeOccupancy(partner.id, fromDate, toDate),
      this.prisma.booking.groupBy({
        by: ['groundId'],
        where: { partnerId: partner.id, bookingDate: { gte: fromDate, lte: toDate } },
        _count: { _all: true },
        orderBy: { _count: { groundId: 'desc' } },
        take: 5,
      }),
      this.prisma.booking.findMany({
        where: {
          partnerId: partner.id,
          bookingDate: { gte: new Date() },
          bookingStatus: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
        include: { ground: true, identity: { include: { profile: true } } },
        orderBy: [{ bookingDate: 'asc' }, { startTime: 'asc' }],
        take: 5,
      }),
    ]);

    const groundNames = await this.prisma.ground.findMany({
      where: { id: { in: topGrounds.map((g) => g.groundId) } },
    });
    const nameById = new Map(groundNames.map((g) => [g.id, g]));

    const bookingsByStatus = {
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };
    for (const row of bookingsInRange) {
      if (row.bookingStatus === 'CONFIRMED') bookingsByStatus.confirmed = row._count._all;
      else if (row.bookingStatus === 'COMPLETED') bookingsByStatus.completed = row._count._all;
      else if (row.bookingStatus === 'CANCELLED') bookingsByStatus.cancelled = row._count._all;
      else if (row.bookingStatus === 'NO_SHOW') bookingsByStatus.no_show = row._count._all;
    }

    const revenueRupees = Number(revenueAgg._sum.amount ?? 0);
    const revenuePaise = Math.round(revenueRupees * 100);

    return {
      range,
      revenue: {
        amount_paise: revenuePaise,
        currency: 'INR' as const,
        display: formatInr(revenueRupees),
      },
      bookings: bookingsByStatus,
      occupancy_rate: occupancy,
      top_grounds: topGrounds.map((row) => {
        const g = nameById.get(row.groundId);
        return {
          ground_id: row.groundId,
          ground_reference: g?.referenceCode ?? null,
          name: g?.name ?? '',
          bookings: row._count._all,
        };
      }),
      upcoming: upcoming.map((b) => ({
        booking_id: b.id,
        booking_reference: b.referenceCode,
        customer_name: [b.identity.profile?.firstName, b.identity.profile?.lastName].filter(Boolean).join(' ').trim() || null,
        ground_name: b.ground.name,
        start_time: (b.startTime as unknown as string).slice(0, 5) || fmtTime(b.startTime),
        date: (b.bookingDate as unknown as string).slice(0, 10) || fmtDate(b.bookingDate),
        amount_paise: Math.round(Number(b.totalAmount) * 100),
      })),
    };
  }

  private async computeOccupancy(_partnerId: string, _from: Date, _to: Date): Promise<number> {
    // Real occupancy = booked minutes / operating minutes across grounds in range.
    // The availability generator (Slice C) is the authoritative source. Until it
    // ships, return 0.0 rather than fabricating a number. Once Slice C is in,
    // swap this for a call to AvailabilityService.
    // ponytail: naive placeholder; replace with availability-driven calc after Slice C
    return 0;
  }
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function rangeToDates(range: DashboardRange): [Date, Date] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
  switch (range) {
    case 'today':
      return [today, endOfDay];
    case 'this_week': {
      const day = (today.getDay() + 6) % 7; // Monday = 0
      const from = new Date(today.getTime() - day * 24 * 60 * 60 * 1000);
      const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return [from, to];
    }
    case 'this_month':
      return [startOfMonth(), new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)];
    case 'last_30_days':
      return [new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), endOfDay];
  }
}

function formatInr(rupees: number): string {
  // Indian number formatting; e.g. 54000 → "₹54,000".
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(rupees))}`;
}

// Prisma returns @db.Time as a JS Date (UTC 1970-01-01T…). Serialize as HH:MM.
function fmtTime(t: Date): string {
  return t.toISOString().slice(11, 16);
}
function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
