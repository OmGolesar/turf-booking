import { Injectable, Logger } from '@nestjs/common';
import { MediaType, Prisma, VenueStatus, Role } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OutboxService } from '../../shared/outbox/outbox.service';
import { AuditService } from '../../shared/audit/audit.service';
import { DomainException } from '../../shared/errors/domain.exception';
import { paginate } from '../../shared/pagination/paginate';
import type { AuthContext } from '../../shared/auth/auth-context';
import type { CreateVenueDto } from './dtos/create-venue.dto';
import type { UpdateVenueDto } from './dtos/update-venue.dto';
import type { AttachVenueMediaDto, UpdateVenueMediaDto } from './dtos/attach-media.dto';
import type { ListMyVenuesDto } from './dtos/list-venues.dto';
import {
  toVenueResource,
  toVenueDetailResource,
  toVenueMediaResource,
  VenueResource,
  VenueDetailResource,
  VenueMediaResource,
} from './dtos/venue-response';
import { isNashikCoords } from './dtos/venue-common';

interface RequestMeta {
  requestId?: string;
  route?: string;
  sourceIp?: string;
  userAgent?: string;
}

@Injectable()
export class VenueService {
  private readonly logger = new Logger(VenueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  // ── POST /venues ───────────────────────────────────────────────────────
  async create(ctx: AuthContext, dto: CreateVenueDto, meta: RequestMeta): Promise<VenueDetailResource> {
    const partnerId = await this.resolvePartnerId(ctx);
    if (!isNashikCoords(dto.latitude, dto.longitude)) throw new DomainException('VENUE_LOCATION_OUT_OF_SCOPE');

    const created = await this.prisma.$transaction(async (tx) => {
      const dup = await tx.venue.findUnique({ where: { slug: dto.slug } });
      if (dup) throw new DomainException('VENUE_SLUG_TAKEN');
      const venue = await tx.venue.create({
        data: {
          partnerId,
          name: dto.name,
          slug: dto.slug,
          description: dto.description ?? null,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          address: dto.address,
          area: dto.area ?? null,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postal_code ?? null,
          latitude: new Prisma.Decimal(dto.latitude),
          longitude: new Prisma.Decimal(dto.longitude),
          googleMapsUrl: dto.google_maps_url ?? null,
          amenities: (dto.amenities ?? []) as unknown as Prisma.InputJsonValue,
          status: VenueStatus.DRAFT,
          createdBy: ctx.identityId,
        },
      });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'VenueCreated',
        resourceType: 'Venue',
        resourceId: venue.id,
        resourceReferenceCode: venue.referenceCode,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Venue',
        aggregateId: venue.id,
        eventType: 'VenueCreated',
        payload: { venue_id: venue.id, partner_id: partnerId, reference_code: venue.referenceCode, slug: venue.slug },
        correlationId: meta.requestId,
      });
      return venue.id;
    });

    return this.loadDetail(created);
  }

  // ── GET /venues/mine ───────────────────────────────────────────────────
  async listMine(ctx: AuthContext, dto: ListMyVenuesDto) {
    const partnerId = await this.resolvePartnerId(ctx);
    // Default: exclude ARCHIVED unless the caller explicitly asks for it.
    const statuses = dto.status ?? Object.values(VenueStatus).filter((s) => s !== VenueStatus.ARCHIVED);
    const base: Prisma.VenueWhereInput = { partnerId, deletedAt: null, status: { in: statuses } };

    return paginate<VenueResource, { createdAt: string; id: string }>(
      { cursor: dto.cursor ?? null, limit: dto.limit ?? 20 },
      async ({ limit, cursor }) => {
        const cursorWhere: Prisma.VenueWhereInput | undefined = cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
              ],
            }
          : undefined;
        const rows = await this.prisma.venue.findMany({
          where: cursorWhere ? { AND: [base, cursorWhere] } : base,
          include: { media: { where: { mediaType: MediaType.COVER, deletedAt: null }, take: 1 }, grounds: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit,
        });
        return rows.map((v) => toVenueResource(v));
      },
      (row) => ({ createdAt: row.created_at, id: row.id }),
    );
  }

  // ── GET /venues/:id ────────────────────────────────────────────────────
  async getDetail(ctx: AuthContext, venueId: string): Promise<VenueDetailResource> {
    const detail = await this.loadDetail(venueId);
    // Partner-owned view; discovery uses a different endpoint (Part 3.3).
    // Only the owning partner (and ADMIN) may read draft/under-review venues.
    if (ctx.role !== Role.ADMIN) {
      const partnerId = await this.resolvePartnerId(ctx).catch(() => null);
      if (detail.partner_id !== partnerId) throw new DomainException('VENUE_NOT_FOUND');
    }
    return detail;
  }

  // ── PATCH /venues/:id (If-Match) ───────────────────────────────────────
  async update(
    ctx: AuthContext,
    venueId: string,
    dto: UpdateVenueDto,
    ifMatch: string | undefined,
    meta: RequestMeta,
  ): Promise<VenueDetailResource> {
    const updatedId = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.venue.findFirst({ where: { id: venueId, deletedAt: null } });
      if (!existing) throw new DomainException('VENUE_NOT_FOUND');
      await this.assertOwnership(ctx, existing.partnerId);
      this.assertIfMatch(existing.updatedAt, ifMatch);

      if ((dto.latitude !== undefined || dto.longitude !== undefined)) {
        const lat = dto.latitude ?? Number(existing.latitude);
        const lng = dto.longitude ?? Number(existing.longitude);
        if (!isNashikCoords(lat, lng)) throw new DomainException('VENUE_LOCATION_OUT_OF_SCOPE');
      }

      const data: Prisma.VenueUpdateInput = { updatedBy: ctx.identityId };
      const changes: Record<string, { before: unknown; after: unknown }> = {};

      const scalarPairs: Array<[keyof UpdateVenueDto, keyof typeof existing, string]> = [
        ['name', 'name', 'name'],
        ['description', 'description', 'description'],
        ['phone', 'phone', 'phone'],
        ['email', 'email', 'email'],
        ['address', 'address', 'address'],
        ['area', 'area', 'area'],
        ['postal_code', 'postalCode', 'postal_code'],
        ['google_maps_url', 'googleMapsUrl', 'google_maps_url'],
      ];
      for (const [dtoKey, colKey, jsonKey] of scalarPairs) {
        const next = dto[dtoKey];
        const prev = (existing as unknown as Record<string, unknown>)[colKey as string];
        if (next !== undefined && next !== prev) {
          changes[jsonKey] = { before: prev, after: next };
          (data as Record<string, unknown>)[colKey as string] = next;
        }
      }
      if (dto.latitude !== undefined && Number(existing.latitude) !== dto.latitude) {
        changes.latitude = { before: existing.latitude.toString(), after: dto.latitude };
        data.latitude = new Prisma.Decimal(dto.latitude);
      }
      if (dto.longitude !== undefined && Number(existing.longitude) !== dto.longitude) {
        changes.longitude = { before: existing.longitude.toString(), after: dto.longitude };
        data.longitude = new Prisma.Decimal(dto.longitude);
      }
      if (dto.amenities !== undefined) {
        changes.amenities = { before: existing.amenities, after: dto.amenities };
        data.amenities = dto.amenities as unknown as Prisma.InputJsonValue;
      }

      if (Object.keys(changes).length === 0) return existing.id;
      const updated = await tx.venue.update({ where: { id: existing.id }, data });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'VenueUpdated',
        resourceType: 'Venue',
        resourceId: updated.id,
        resourceReferenceCode: updated.referenceCode,
        changes,
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Venue',
        aggregateId: updated.id,
        eventType: 'VenueUpdated',
        payload: { venue_id: updated.id, changes },
        correlationId: meta.requestId,
      });
      return updated.id;
    });

    return this.loadDetail(updatedId);
  }

  // ── venue-status actions ────────────────────────────────────────────────
  async submitForReview(ctx: AuthContext, venueId: string, meta: RequestMeta) {
    return this.transitionStatus(ctx, venueId, VenueStatus.UNDER_REVIEW, 'VenueSubmittedForReview', meta, [
      VenueStatus.DRAFT,
    ]);
  }

  async suspend(ctx: AuthContext, venueId: string, meta: RequestMeta) {
    return this.transitionStatus(ctx, venueId, VenueStatus.SUSPENDED, 'VenueSuspended', meta, [
      VenueStatus.PUBLISHED,
    ]);
  }

  async archive(ctx: AuthContext, venueId: string, meta: RequestMeta) {
    return this.transitionStatus(ctx, venueId, VenueStatus.ARCHIVED, 'VenueArchived', meta, [
      VenueStatus.DRAFT,
      VenueStatus.UNDER_REVIEW,
      VenueStatus.SUSPENDED,
      VenueStatus.PUBLISHED,
    ]);
  }

  // ── media ──────────────────────────────────────────────────────────────
  async attachMedia(ctx: AuthContext, venueId: string, dto: AttachVenueMediaDto, meta: RequestMeta): Promise<VenueMediaResource> {
    return this.prisma.$transaction(async (tx) => {
      const venue = await tx.venue.findFirst({ where: { id: venueId, deletedAt: null } });
      if (!venue) throw new DomainException('VENUE_NOT_FOUND');
      await this.assertOwnership(ctx, venue.partnerId);

      // COVER / LOGO are singletons per venue — soft-delete the previous incumbent
      // so the partial unique index doesn't reject the insert.
      if (dto.media_type === MediaType.COVER || dto.media_type === MediaType.LOGO) {
        await tx.venueMedia.updateMany({
          where: { venueId, mediaType: dto.media_type, deletedAt: null },
          data: { deletedAt: new Date(), deletedBy: ctx.identityId },
        });
      }

      const created = await tx.venueMedia.create({
        data: {
          venueId,
          fileUrl: dto.file_url,
          mediaType: dto.media_type,
          displayOrder: dto.display_order ?? 0,
          createdBy: ctx.identityId,
        },
      });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'VenueMediaAttached',
        resourceType: 'VenueMedia',
        resourceId: created.id,
        changes: { media_type: { before: null, after: created.mediaType } },
        context: meta,
      });
      return toVenueMediaResource(created);
    });
  }

  async updateMedia(
    ctx: AuthContext,
    venueId: string,
    mediaId: string,
    dto: UpdateVenueMediaDto,
    meta: RequestMeta,
  ): Promise<VenueMediaResource> {
    return this.prisma.$transaction(async (tx) => {
      const media = await tx.venueMedia.findFirst({ where: { id: mediaId, venueId, deletedAt: null } });
      if (!media) throw new DomainException('VENUE_MEDIA_NOT_FOUND');
      const venue = await tx.venue.findFirst({ where: { id: venueId } });
      if (!venue) throw new DomainException('VENUE_NOT_FOUND');
      await this.assertOwnership(ctx, venue.partnerId);

      const data: Prisma.VenueMediaUpdateInput = { updatedBy: ctx.identityId };
      const changes: Record<string, { before: unknown; after: unknown }> = {};

      if (dto.media_type !== undefined && dto.media_type !== media.mediaType) {
        if (dto.media_type === MediaType.COVER || dto.media_type === MediaType.LOGO) {
          await tx.venueMedia.updateMany({
            where: { venueId, mediaType: dto.media_type, deletedAt: null, id: { not: mediaId } },
            data: { deletedAt: new Date(), deletedBy: ctx.identityId },
          });
        }
        changes.media_type = { before: media.mediaType, after: dto.media_type };
        data.mediaType = dto.media_type;
      }
      if (dto.display_order !== undefined && dto.display_order !== media.displayOrder) {
        changes.display_order = { before: media.displayOrder, after: dto.display_order };
        data.displayOrder = dto.display_order;
      }

      if (Object.keys(changes).length === 0) return toVenueMediaResource(media);
      const updated = await tx.venueMedia.update({ where: { id: mediaId }, data });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'VenueMediaUpdated',
        resourceType: 'VenueMedia',
        resourceId: updated.id,
        changes,
        context: meta,
      });
      return toVenueMediaResource(updated);
    });
  }

  async removeMedia(ctx: AuthContext, venueId: string, mediaId: string, meta: RequestMeta) {
    await this.prisma.$transaction(async (tx) => {
      const media = await tx.venueMedia.findFirst({ where: { id: mediaId, venueId, deletedAt: null } });
      if (!media) throw new DomainException('VENUE_MEDIA_NOT_FOUND');
      const venue = await tx.venue.findFirst({ where: { id: venueId } });
      if (!venue) throw new DomainException('VENUE_NOT_FOUND');
      await this.assertOwnership(ctx, venue.partnerId);

      await tx.venueMedia.update({
        where: { id: mediaId },
        data: { deletedAt: new Date(), deletedBy: ctx.identityId },
      });
      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: 'VenueMediaRemoved',
        resourceType: 'VenueMedia',
        resourceId: mediaId,
        context: meta,
      });
    });
    return null;
  }

  // ── shared helpers ─────────────────────────────────────────────────────
  async resolvePartnerId(ctx: AuthContext): Promise<string> {
    if (ctx.partnerId) return ctx.partnerId;
    const partner = await this.prisma.partner.findFirst({ where: { identityId: ctx.identityId, deletedAt: null } });
    if (!partner) throw new DomainException('PARTNER_NOT_FOUND');
    return partner.id;
  }

  private async assertOwnership(ctx: AuthContext, ownerPartnerId: string): Promise<void> {
    if (ctx.role === Role.ADMIN) return;
    const myPartnerId = await this.resolvePartnerId(ctx);
    if (myPartnerId !== ownerPartnerId) throw new DomainException('AUTH_INSUFFICIENT_PERMISSIONS');
  }

  private assertIfMatch(currentUpdatedAt: Date, ifMatch: string | undefined): void {
    if (!ifMatch) return; // If-Match is optional; skipping just weakens optimistic locking for that call.
    const currentIso = currentUpdatedAt.toISOString();
    // Accept quoted or unquoted timestamp.
    const cleaned = ifMatch.replace(/^"/, '').replace(/"$/, '');
    if (cleaned !== currentIso) throw new DomainException('RESOURCE_STALE');
  }

  private async loadDetail(venueId: string): Promise<VenueDetailResource> {
    const venue = await this.prisma.venue.findFirst({
      where: { id: venueId, deletedAt: null },
      include: {
        partner: true,
        media: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } },
        grounds: { where: { deletedAt: null }, include: { sport: true } },
      },
    });
    if (!venue) throw new DomainException('VENUE_NOT_FOUND');
    return toVenueDetailResource(venue);
  }

  private async transitionStatus(
    ctx: AuthContext,
    venueId: string,
    target: VenueStatus,
    eventType: string,
    meta: RequestMeta,
    allowedFrom: VenueStatus[],
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const venue = await tx.venue.findFirst({ where: { id: venueId, deletedAt: null } });
      if (!venue) throw new DomainException('VENUE_NOT_FOUND');
      await this.assertOwnership(ctx, venue.partnerId);
      if (!allowedFrom.includes(venue.status)) throw new DomainException('VENUE_STATUS_LOCKED');

      const now = new Date();
      const updated = await tx.venue.update({
        where: { id: venue.id },
        data: { status: target, updatedBy: ctx.identityId },
      });

      await this.audit.record(tx, {
        actorIdentityId: ctx.identityId,
        actorRole: ctx.role,
        action: eventType,
        resourceType: 'Venue',
        resourceId: updated.id,
        resourceReferenceCode: updated.referenceCode,
        changes: { status: { before: venue.status, after: target } },
        context: meta,
      });
      await this.outbox.emit(tx, {
        aggregateType: 'Venue',
        aggregateId: updated.id,
        eventType,
        payload: { venue_id: updated.id, from: venue.status, to: target, at: now.toISOString() },
        correlationId: meta.requestId,
      });
      return updated;
    });

    return { status: result.status, updated_at: result.updatedAt.toISOString() };
  }
}
