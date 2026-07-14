import { Injectable } from '@nestjs/common';
import { GroundStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OutboxService } from '../../shared/outbox/outbox.service';
import { AuditService } from '../../shared/audit/audit.service';
import { DomainException } from '../../shared/errors/domain.exception';
import type { AuthContext } from '../../shared/auth/auth-context';
import { toGroundResource, GroundResource, toGroundMediaResource, GroundMediaResource } from './dtos/ground-response';
import type { CreateGroundDto } from './dtos/create-ground.dto';
import type { UpdateGroundDto } from './dtos/update-ground.dto';
import type { UpsertGroundConfigurationDto } from './dtos/upsert-configuration.dto';
import type { SetMaintenanceDto } from './dtos/set-maintenance.dto';
import type { AttachGroundMediaDto, UpdateGroundMediaDto } from './dtos/attach-media.dto';

interface RequestMeta { requestId?: string; route?: string; sourceIp?: string; userAgent?: string }

@Injectable()
export class GroundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  // ── POST /venues/:venue_id/grounds ─────────────────────────────────────
  async create(ctx: AuthContext, venueId: string, dto: CreateGroundDto, meta: RequestMeta): Promise<GroundResource> {
    const groundId = await this.prisma.$transaction(async (tx) => {
      const venue = await tx.venue.findFirst({ where: { id: venueId, deletedAt: null } });
      if (!venue) throw new DomainException('VENUE_NOT_FOUND');
      await this.assertOwnership(ctx, venue.partnerId);
      const sport = await tx.sport.findUnique({ where: { id: dto.sport_id } });
      if (!sport || !sport.isActive) throw new DomainException('SPORT_NOT_FOUND');

      const created = await tx.ground.create({
        data: {
          venueId,
          sportId: dto.sport_id,
          name: dto.name,
          surfaceType: dto.surface_type,
          indoor: dto.indoor ?? false,
          maxPlayers: dto.max_players,
          lighting: dto.lighting ?? true,
          description: dto.description ?? null,
          status: GroundStatus.DRAFT,
          createdBy: ctx.identityId,
        },
      });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'GroundCreated',
        resourceType: 'Ground',
        resourceId: created.id,
        resourceReferenceCode: created.referenceCode,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Ground',
        aggregateId: created.id,
        eventType: 'GroundCreated',
        payload: { ground_id: created.id, venue_id: venueId, reference_code: created.referenceCode },
        correlationId: meta.requestId,
      });
      return created.id;
    });

    return this.loadDetail(groundId);
  }

  async listForVenue(ctx: AuthContext, venueId: string): Promise<GroundResource[]> {
    const venue = await this.prisma.venue.findFirst({ where: { id: venueId, deletedAt: null } });
    if (!venue) throw new DomainException('VENUE_NOT_FOUND');
    // Owners see everything under their venues; others see nothing here.
    await this.assertOwnership(ctx, venue.partnerId);
    const grounds = await this.prisma.ground.findMany({
      where: { venueId, deletedAt: null },
      include: { sport: true, configuration: true, media: { where: { deletedAt: null } } },
      orderBy: { createdAt: 'asc' },
    });
    return grounds.map(toGroundResource);
  }

  async getDetail(ctx: AuthContext, id: string): Promise<GroundResource> {
    const ground = await this.loadDetail(id);
    const venue = await this.prisma.venue.findFirst({ where: { id: ground.venue_id } });
    if (!venue) throw new DomainException('GROUND_NOT_FOUND');
    if (ctx.role !== Role.ADMIN) await this.assertOwnership(ctx, venue.partnerId);
    return ground;
  }

  // ── PATCH /grounds/:id ──────────────────────────────────────────────────
  async update(ctx: AuthContext, id: string, dto: UpdateGroundDto, meta: RequestMeta): Promise<GroundResource> {
    await this.prisma.$transaction(async (tx) => {
      const g = await tx.ground.findFirst({ where: { id, deletedAt: null }, include: { venue: true } });
      if (!g) throw new DomainException('GROUND_NOT_FOUND');
      await this.assertOwnership(ctx, g.venue.partnerId);

      const data: Prisma.GroundUpdateInput = { updatedBy: ctx.identityId };
      const changes: Record<string, { before: unknown; after: unknown }> = {};

      const pairs: Array<[keyof UpdateGroundDto, keyof typeof g, string]> = [
        ['name', 'name', 'name'],
        ['surface_type', 'surfaceType', 'surface_type'],
        ['indoor', 'indoor', 'indoor'],
        ['max_players', 'maxPlayers', 'max_players'],
        ['lighting', 'lighting', 'lighting'],
        ['description', 'description', 'description'],
      ];
      for (const [dtoKey, colKey, jsonKey] of pairs) {
        const next = dto[dtoKey];
        const prev = (g as unknown as Record<string, unknown>)[colKey as string];
        if (next !== undefined && next !== prev) {
          changes[jsonKey] = { before: prev, after: next };
          (data as Record<string, unknown>)[colKey as string] = next;
        }
      }
      if (Object.keys(changes).length === 0) return;
      const updated = await tx.ground.update({ where: { id: g.id }, data });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'GroundUpdated',
        resourceType: 'Ground',
        resourceId: updated.id,
        resourceReferenceCode: updated.referenceCode,
        changes,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Ground',
        aggregateId: updated.id,
        eventType: 'GroundUpdated',
        payload: { ground_id: updated.id, changes },
        correlationId: meta.requestId,
      });
    });
    return this.loadDetail(id);
  }

  // ── PUT /grounds/:id/configuration ──────────────────────────────────────
  async upsertConfiguration(ctx: AuthContext, id: string, dto: UpsertGroundConfigurationDto, meta: RequestMeta) {
    // Cross-field: booking_interval >= booking_duration - buffer_time (Part 3.2 §15).
    const buffer = dto.buffer_time ?? 0;
    if (dto.booking_interval < dto.booking_duration - buffer) {
      throw new DomainException('GROUND_CONFIG_INVALID', {
        message: 'booking_interval must be >= booking_duration - buffer_time (slots may not overlap).',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const g = await tx.ground.findFirst({ where: { id, deletedAt: null }, include: { venue: true } });
      if (!g) throw new DomainException('GROUND_NOT_FOUND');
      await this.assertOwnership(ctx, g.venue.partnerId);

      await tx.groundConfiguration.upsert({
        where: { groundId: id },
        create: {
          groundId: id,
          bookingDuration: dto.booking_duration,
          bookingInterval: dto.booking_interval,
          bufferTime: buffer,
          cleaningTime: dto.cleaning_time ?? 0,
          maxAdvanceBookingDays: dto.max_advance_booking_days ?? 30,
          minNoticeMinutes: dto.min_notice_minutes ?? 30,
          cancellationWindowHours: dto.cancellation_window_hours ?? 4,
          createdBy: ctx.identityId,
        },
        update: {
          bookingDuration: dto.booking_duration,
          bookingInterval: dto.booking_interval,
          bufferTime: buffer,
          cleaningTime: dto.cleaning_time ?? 0,
          maxAdvanceBookingDays: dto.max_advance_booking_days ?? 30,
          minNoticeMinutes: dto.min_notice_minutes ?? 30,
          cancellationWindowHours: dto.cancellation_window_hours ?? 4,
          updatedBy: ctx.identityId,
        },
      });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'GroundConfigurationUpserted',
        resourceType: 'Ground',
        resourceId: id,
        context: meta,
      });
    });
    return this.loadDetail(id);
  }

  // ── activate ────────────────────────────────────────────────────────────
  async activate(ctx: AuthContext, id: string, meta: RequestMeta) {
    return this.prisma.$transaction(async (tx) => {
      const g = await tx.ground.findFirst({
        where: { id, deletedAt: null },
        include: {
          venue: true,
          configuration: true,
          operatingHours: { where: { deletedAt: null } },
          pricingRules: { where: { active: true, deletedAt: null } },
        },
      });
      if (!g) throw new DomainException('GROUND_NOT_FOUND');
      await this.assertOwnership(ctx, g.venue.partnerId);
      if (g.status === GroundStatus.ACTIVE) return { status: g.status };
      if (!([GroundStatus.DRAFT, GroundStatus.MAINTENANCE, GroundStatus.BLOCKED] as GroundStatus[]).includes(g.status)) {
        throw new DomainException('GROUND_STATE_TRANSITION_INVALID');
      }
      if (!g.configuration) throw new DomainException('GROUND_CONFIG_MISSING');
      if (g.operatingHours.length === 0) throw new DomainException('AVAILABILITY_NO_OPERATING_HOURS');
      if (g.pricingRules.length === 0) throw new DomainException('GROUND_NO_ACTIVE_PRICING');

      const updated = await tx.ground.update({
        where: { id: g.id },
        data: { status: GroundStatus.ACTIVE, updatedBy: ctx.identityId },
      });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'GroundActivated',
        resourceType: 'Ground',
        resourceId: updated.id,
        resourceReferenceCode: updated.referenceCode,
        changes: { status: { before: g.status, after: GroundStatus.ACTIVE } },
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Ground',
        aggregateId: updated.id,
        eventType: 'GroundActivated',
        payload: { ground_id: updated.id, from: g.status, to: GroundStatus.ACTIVE },
        correlationId: meta.requestId,
      });
      return { status: updated.status, activated_at: updated.updatedAt.toISOString() };
    });
  }

  async setMaintenance(ctx: AuthContext, id: string, dto: SetMaintenanceDto, meta: RequestMeta) {
    return this.transitionStatus(ctx, id, GroundStatus.MAINTENANCE, 'GroundMaintenanceStarted', meta, [
      GroundStatus.ACTIVE,
    ], { reason: dto.reason, estimated_resume_at: dto.estimated_resume_at });
  }

  async resume(ctx: AuthContext, id: string, meta: RequestMeta) {
    return this.transitionStatus(ctx, id, GroundStatus.ACTIVE, 'GroundResumed', meta, [
      GroundStatus.MAINTENANCE,
      GroundStatus.BLOCKED,
    ]);
  }

  async archive(ctx: AuthContext, id: string, meta: RequestMeta) {
    return this.transitionStatus(ctx, id, GroundStatus.ARCHIVED, 'GroundArchived', meta, [
      GroundStatus.DRAFT,
      GroundStatus.ACTIVE,
      GroundStatus.MAINTENANCE,
      GroundStatus.BLOCKED,
    ]);
  }

  // ── media ──────────────────────────────────────────────────────────────
  async attachMedia(ctx: AuthContext, groundId: string, dto: AttachGroundMediaDto, meta: RequestMeta): Promise<GroundMediaResource> {
    return this.prisma.$transaction(async (tx) => {
      const g = await tx.ground.findFirst({ where: { id: groundId, deletedAt: null }, include: { venue: true } });
      if (!g) throw new DomainException('GROUND_NOT_FOUND');
      await this.assertOwnership(ctx, g.venue.partnerId);

      const activeCount = await tx.groundMedia.count({ where: { groundId, deletedAt: null } });
      if (activeCount >= 20) {
        throw new DomainException('VALIDATION_FAILED', {
          fieldErrors: [{ field: 'media', code: 'GROUND_MEDIA_LIMIT', message: 'Maximum 20 media items per ground.' }],
        });
      }

      const created = await tx.groundMedia.create({
        data: { groundId, fileUrl: dto.file_url, displayOrder: dto.display_order ?? activeCount, createdBy: ctx.identityId },
      });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'GroundMediaAttached',
        resourceType: 'GroundMedia',
        resourceId: created.id,
        context: meta,
      });
      return toGroundMediaResource(created);
    });
  }

  async updateMedia(ctx: AuthContext, groundId: string, mediaId: string, dto: UpdateGroundMediaDto, meta: RequestMeta) {
    return this.prisma.$transaction(async (tx) => {
      const m = await tx.groundMedia.findFirst({ where: { id: mediaId, groundId, deletedAt: null } });
      if (!m) throw new DomainException('GROUND_MEDIA_NOT_FOUND');
      const g = await tx.ground.findFirst({ where: { id: groundId }, include: { venue: true } });
      if (!g) throw new DomainException('GROUND_NOT_FOUND');
      await this.assertOwnership(ctx, g.venue.partnerId);

      if (dto.display_order === undefined || dto.display_order === m.displayOrder) {
        return toGroundMediaResource(m);
      }
      const updated = await tx.groundMedia.update({
        where: { id: mediaId },
        data: { displayOrder: dto.display_order, updatedBy: ctx.identityId },
      });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'GroundMediaReordered',
        resourceType: 'GroundMedia',
        resourceId: updated.id,
        changes: { display_order: { before: m.displayOrder, after: updated.displayOrder } },
        context: meta,
      });
      return toGroundMediaResource(updated);
    });
  }

  async removeMedia(ctx: AuthContext, groundId: string, mediaId: string, meta: RequestMeta) {
    await this.prisma.$transaction(async (tx) => {
      const m = await tx.groundMedia.findFirst({ where: { id: mediaId, groundId, deletedAt: null } });
      if (!m) throw new DomainException('GROUND_MEDIA_NOT_FOUND');
      const g = await tx.ground.findFirst({ where: { id: groundId }, include: { venue: true } });
      if (!g) throw new DomainException('GROUND_NOT_FOUND');
      await this.assertOwnership(ctx, g.venue.partnerId);
      await tx.groundMedia.update({ where: { id: mediaId }, data: { deletedAt: new Date(), deletedBy: ctx.identityId } });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'GroundMediaRemoved',
        resourceType: 'GroundMedia',
        resourceId: mediaId,
        context: meta,
      });
    });
    return null;
  }

  // ── helpers ─────────────────────────────────────────────────────────────
  async assertOwnership(ctx: AuthContext, partnerId: string): Promise<void> {
    if (ctx.role === Role.ADMIN) return;
    const partner = ctx.partnerId
      ? { id: ctx.partnerId }
      : await this.prisma.partner.findFirst({ where: { identityId: ctx.identityId, deletedAt: null } });
    if (!partner || partner.id !== partnerId) throw new DomainException('AUTH_INSUFFICIENT_PERMISSIONS');
  }

  private async loadDetail(id: string): Promise<GroundResource> {
    const g = await this.prisma.ground.findFirst({
      where: { id, deletedAt: null },
      include: {
        sport: true,
        configuration: true,
        media: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } },
      },
    });
    if (!g) throw new DomainException('GROUND_NOT_FOUND');
    return toGroundResource(g);
  }

  private async transitionStatus(
    ctx: AuthContext,
    id: string,
    target: GroundStatus,
    eventType: string,
    meta: RequestMeta,
    allowedFrom: GroundStatus[],
    extraPayload?: Record<string, unknown>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const g = await tx.ground.findFirst({ where: { id, deletedAt: null }, include: { venue: true } });
      if (!g) throw new DomainException('GROUND_NOT_FOUND');
      await this.assertOwnership(ctx, g.venue.partnerId);
      if (!allowedFrom.includes(g.status)) throw new DomainException('GROUND_STATE_TRANSITION_INVALID');

      const updated = await tx.ground.update({
        where: { id: g.id },
        data: { status: target, updatedBy: ctx.identityId },
      });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: eventType,
        resourceType: 'Ground',
        resourceId: updated.id,
        resourceReferenceCode: updated.referenceCode,
        changes: { status: { before: g.status, after: target } },
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Ground',
        aggregateId: updated.id,
        eventType,
        payload: { ground_id: updated.id, from: g.status, to: target, ...(extraPayload ?? {}) },
        correlationId: meta.requestId,
      });
      return { status: updated.status, updated_at: updated.updatedAt.toISOString() };
    });
  }
}
