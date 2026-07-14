import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OutboxService } from '../../shared/outbox/outbox.service';
import { AuditService } from '../../shared/audit/audit.service';
import { DomainException } from '../../shared/errors/domain.exception';
import { GroundService } from '../ground/ground.service';
import type { AuthContext } from '../../shared/auth/auth-context';
import type { PutOperatingHoursDto, OperatingHourDto } from './dtos/operating-hours.dto';
import type { CreateExceptionDto } from './dtos/exception.dto';
import type { CreateMaintenanceBlockDto } from './dtos/maintenance-block.dto';

interface RequestMeta { requestId?: string; route?: string; sourceIp?: string; userAgent?: string }

@Injectable()
export class SchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly grounds: GroundService,
  ) {}

  // ── PUT /grounds/:id/operating-hours ─────────────────────────────────
  async putOperatingHours(ctx: AuthContext, groundId: string, dto: PutOperatingHoursDto, meta: RequestMeta) {
    this.validateHoursShape(dto.hours);
    await this.prisma.$transaction(async (tx) => {
      const g = await tx.ground.findFirst({ where: { id: groundId, deletedAt: null }, include: { venue: true } });
      if (!g) throw new DomainException('GROUND_NOT_FOUND');
      await this.grounds.assertOwnership(ctx, g.venue.partnerId);

      // Atomic replace: delete old rows, insert 7 fresh ones.
      await tx.operatingHour.deleteMany({ where: { groundId } });
      await tx.operatingHour.createMany({
        data: dto.hours.map((h) => ({
          groundId,
          dayOfWeek: h.day_of_week,
          openingTime: hmToDate(h.opening_time),
          closingTime: hmToDate(h.closing_time),
          isClosed: h.is_closed ?? false,
          createdBy: ctx.identityId,
        })),
      });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'OperatingHoursUpdated',
        resourceType: 'Ground',
        resourceId: groundId,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Ground',
        aggregateId: groundId,
        eventType: 'OperatingHoursUpdated',
        payload: { ground_id: groundId },
        correlationId: meta.requestId,
      });
    });
    return this.listOperatingHours(ctx, groundId);
  }

  async listOperatingHours(ctx: AuthContext, groundId: string) {
    const g = await this.prisma.ground.findFirst({ where: { id: groundId, deletedAt: null }, include: { venue: true } });
    if (!g) throw new DomainException('GROUND_NOT_FOUND');
    await this.grounds.assertOwnership(ctx, g.venue.partnerId);
    const rows = await this.prisma.operatingHour.findMany({
      where: { groundId, deletedAt: null },
      orderBy: { dayOfWeek: 'asc' },
    });
    return {
      hours: rows.map((r) => ({
        day_of_week: r.dayOfWeek,
        opening_time: fmtTime(r.openingTime),
        closing_time: fmtTime(r.closingTime),
        is_closed: r.isClosed,
      })),
    };
  }

  // ── Exceptions ─────────────────────────────────────────────────────────
  async createException(ctx: AuthContext, groundId: string, dto: CreateExceptionDto, meta: RequestMeta) {
    if (dto.start_time >= dto.end_time) throw new DomainException('OPERATING_HOURS_INVALID');

    return this.prisma.$transaction(async (tx) => {
      const g = await tx.ground.findFirst({ where: { id: groundId, deletedAt: null }, include: { venue: true } });
      if (!g) throw new DomainException('GROUND_NOT_FOUND');
      await this.grounds.assertOwnership(ctx, g.venue.partnerId);

      // Reject if this window overlaps a confirmed booking (Part 3.2 §19).
      const conflict = await tx.booking.findFirst({
        where: {
          groundId,
          bookingDate: new Date(`${dto.exception_date}T00:00:00Z`),
          bookingStatus: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
          startTime: { lt: hmToDate(dto.end_time) },
          endTime: { gt: hmToDate(dto.start_time) },
        },
      });
      if (conflict) throw new DomainException('EXCEPTION_CONFLICTS_BOOKING');

      const created = await tx.availabilityException.create({
        data: {
          groundId,
          title: dto.title,
          exceptionDate: new Date(`${dto.exception_date}T00:00:00Z`),
          startTime: hmToDate(dto.start_time),
          endTime: hmToDate(dto.end_time),
          isClosed: dto.is_closed ?? true,
          reason: dto.reason ?? null,
          createdBy: ctx.identityId,
        },
      });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'AvailabilityExceptionCreated',
        resourceType: 'AvailabilityException',
        resourceId: created.id,
        context: meta,
      });
      return this.serializeException(created);
    });
  }

  async listExceptions(ctx: AuthContext, groundId: string, from?: string, to?: string) {
    const g = await this.prisma.ground.findFirst({ where: { id: groundId, deletedAt: null }, include: { venue: true } });
    if (!g) throw new DomainException('GROUND_NOT_FOUND');
    await this.grounds.assertOwnership(ctx, g.venue.partnerId);
    const where: Prisma.AvailabilityExceptionWhereInput = { groundId, deletedAt: null };
    if (from) where.exceptionDate = { ...(where.exceptionDate as object), gte: new Date(`${from}T00:00:00Z`) };
    if (to) where.exceptionDate = { ...(where.exceptionDate as object), lte: new Date(`${to}T23:59:59Z`) };
    const rows = await this.prisma.availabilityException.findMany({ where, orderBy: { exceptionDate: 'asc' } });
    return rows.map((r) => this.serializeException(r));
  }

  async removeException(ctx: AuthContext, groundId: string, id: string, meta: RequestMeta) {
    await this.prisma.$transaction(async (tx) => {
      const e = await tx.availabilityException.findFirst({ where: { id, groundId, deletedAt: null } });
      if (!e) throw new DomainException('EXCEPTION_NOT_FOUND');
      const g = await tx.ground.findFirst({ where: { id: groundId }, include: { venue: true } });
      if (!g) throw new DomainException('GROUND_NOT_FOUND');
      await this.grounds.assertOwnership(ctx, g.venue.partnerId);

      await tx.availabilityException.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy: ctx.identityId },
      });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'AvailabilityExceptionRemoved',
        resourceType: 'AvailabilityException',
        resourceId: id,
        context: meta,
      });
    });
    return null;
  }

  // ── Maintenance blocks ──────────────────────────────────────────────────
  async createMaintenanceBlock(
    ctx: AuthContext,
    groundId: string,
    dto: CreateMaintenanceBlockDto,
    force: boolean,
    meta: RequestMeta,
  ) {
    const startAt = new Date(dto.start_datetime);
    const endAt = new Date(dto.end_datetime);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      throw new DomainException('VALIDATION_FAILED', {
        fieldErrors: [{ field: 'end_datetime', code: 'INVALID_RANGE', message: 'end_datetime must be after start_datetime' }],
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const g = await tx.ground.findFirst({ where: { id: groundId, deletedAt: null }, include: { venue: true } });
      if (!g) throw new DomainException('GROUND_NOT_FOUND');
      await this.grounds.assertOwnership(ctx, g.venue.partnerId);

      // Surface conflicting bookings in the response so the partner sees the blast radius.
      const conflicts = await tx.booking.findMany({
        where: {
          groundId,
          bookingStatus: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
          // Time-of-day overlap within the block window across dates: we filter on booking_date
          // then rely on the caller to interpret. For MVP the simpler check by date-range covers 99%.
          bookingDate: { gte: dateOnly(startAt), lte: dateOnly(endAt) },
        },
        include: { identity: { include: { profile: true } } },
      });

      if (conflicts.length > 0 && !force) {
        throw new DomainException('MAINTENANCE_CONFLICTS_BOOKING', {
          details: {
            conflicts: conflicts.map((b) => ({
              booking_id: b.id,
              booking_reference: b.referenceCode,
              customer_name: [b.identity.profile?.firstName, b.identity.profile?.lastName].filter(Boolean).join(' '),
            })),
          },
        });
      }

      const created = await tx.maintenanceBlock.create({
        data: {
          groundId,
          title: dto.title,
          startDatetime: startAt,
          endDatetime: endAt,
          description: dto.description ?? null,
          createdBy: ctx.identityId,
        },
      });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'MaintenanceBlockCreated',
        resourceType: 'MaintenanceBlock',
        resourceId: created.id,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Ground',
        aggregateId: groundId,
        eventType: 'MaintenanceBlockCreated',
        payload: { ground_id: groundId, block_id: created.id, forced: force, conflict_count: conflicts.length },
        correlationId: meta.requestId,
      });

      return {
        id: created.id,
        title: created.title,
        start_datetime: created.startDatetime.toISOString(),
        end_datetime: created.endDatetime.toISOString(),
        description: created.description,
        conflicts: conflicts.map((b) => ({
          booking_id: b.id,
          booking_reference: b.referenceCode,
          customer_name: [b.identity.profile?.firstName, b.identity.profile?.lastName].filter(Boolean).join(' '),
        })),
      };
    });
  }

  async listMaintenanceBlocks(ctx: AuthContext, groundId: string) {
    const g = await this.prisma.ground.findFirst({ where: { id: groundId, deletedAt: null }, include: { venue: true } });
    if (!g) throw new DomainException('GROUND_NOT_FOUND');
    await this.grounds.assertOwnership(ctx, g.venue.partnerId);
    const rows = await this.prisma.maintenanceBlock.findMany({
      where: { groundId, deletedAt: null },
      orderBy: { startDatetime: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      start_datetime: r.startDatetime.toISOString(),
      end_datetime: r.endDatetime.toISOString(),
      description: r.description,
    }));
  }

  async removeMaintenanceBlock(ctx: AuthContext, groundId: string, blockId: string, meta: RequestMeta) {
    await this.prisma.$transaction(async (tx) => {
      const b = await tx.maintenanceBlock.findFirst({ where: { id: blockId, groundId, deletedAt: null } });
      if (!b) throw new DomainException('MAINTENANCE_BLOCK_NOT_FOUND');
      const g = await tx.ground.findFirst({ where: { id: groundId }, include: { venue: true } });
      if (!g) throw new DomainException('GROUND_NOT_FOUND');
      await this.grounds.assertOwnership(ctx, g.venue.partnerId);

      await tx.maintenanceBlock.update({
        where: { id: blockId },
        data: { deletedAt: new Date(), deletedBy: ctx.identityId },
      });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'MaintenanceBlockRemoved',
        resourceType: 'MaintenanceBlock',
        resourceId: blockId,
        context: meta,
      });
    });
    return null;
  }

  // ── helpers ──
  private validateHoursShape(hours: OperatingHourDto[]): void {
    const seen = new Set<number>();
    for (const h of hours) {
      if (seen.has(h.day_of_week)) throw new DomainException('OPERATING_HOURS_INVALID', { message: 'duplicate day_of_week' });
      seen.add(h.day_of_week);
      if (!h.is_closed && h.opening_time >= h.closing_time) {
        throw new DomainException('OPERATING_HOURS_INVALID', { message: 'opening_time must be < closing_time' });
      }
    }
  }

  private serializeException(e: {
    id: string;
    title: string;
    exceptionDate: Date;
    startTime: Date;
    endTime: Date;
    isClosed: boolean;
    reason: string | null;
  }) {
    return {
      id: e.id,
      title: e.title,
      exception_date: e.exceptionDate.toISOString().slice(0, 10),
      start_time: fmtTime(e.startTime),
      end_time: fmtTime(e.endTime),
      is_closed: e.isClosed,
      reason: e.reason,
    };
  }
}

// Convert "HH:mm" into a Date for the @db.Time column. Prisma stores the date
// portion as 1970-01-01; we only care about the time-of-day component.
function hmToDate(hm: string): Date {
  return new Date(`1970-01-01T${hm.length === 5 ? `${hm}:00` : hm}Z`);
}

function fmtTime(t: Date): string {
  return t.toISOString().slice(11, 16);
}

function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
