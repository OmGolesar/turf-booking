import { Injectable } from '@nestjs/common';
import { GroundStatus, Prisma, VenueStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { DomainException } from '../../shared/errors/domain.exception';
import { AvailabilityService } from '../availability/availability.service';
import { encodeCursor, decodeCursor } from '../../shared/pagination/cursor';
import type { AuthContext } from '../../shared/auth/auth-context';
import type { ListVenuesDto, NearMeDto } from './dtos/list-venues.dto';

export interface VenueSummary {
  id: string;
  reference_code: string;
  name: string;
  slug: string;
  cover_image_url: string | null;
  address: string;
  area: string | null;
  city: string;
  latitude: string;
  longitude: string;
  distance_km?: number;
  average_rating: number;
  total_reviews: number;
  supported_sports: Array<{ code: string; display_name: string; icon_url: string | null }>;
  starting_price_paise: number | null;
  amenities: unknown;
}

export interface VenuesPage {
  data: VenueSummary[];
  pagination: import('../../shared/response/envelope').PaginationMeta;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService, private readonly availability: AvailabilityService) {}

  // ── GET /discovery/venues ─────────────────────────────────────────────
  async listVenues(dto: ListVenuesDto): Promise<VenuesPage> {
    const limit = Math.min(100, Math.max(1, dto.limit ?? 20));
    const cursor = dto.cursor ? decodeCursor<CursorPayload>(dto.cursor) : null;
    const near = parseNear(dto.near);

    // Geospatial + FTS both benefit from a raw SQL query. Keyset pagination
    // uses (avg_rating desc, id) as the tiebreaker for the non-near path;
    // (distance asc, id) for near.
    const rows = near
      ? await this.queryByDistance(near, dto.radius_km ?? 10, dto, limit + 1, cursor as NearCursor | null)
      : await this.queryByRating(dto, limit + 1, cursor as RatingCursor | null);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const summaries = await this.hydrateSummaries(page);

    const last = page[page.length - 1];
    const nextCursor = hasMore && last
      ? near
        ? encodeCursor({ distanceKm: last.distance_km ?? 0, id: last.id })
        : encodeCursor({ rating: last.average_rating, totalReviews: last.total_reviews, name: last.name, id: last.id })
      : null;

    return {
      data: summaries,
      pagination: {
        cursor: dto.cursor ?? null,
        next_cursor: nextCursor,
        has_more: hasMore,
        total: null,
      },
    };
  }

  async nearMe(dto: NearMeDto): Promise<VenuesPage> {
    return this.listVenues({
      near: `${dto.lat},${dto.lng}`,
      radius_km: dto.radius_km ?? 5,
      limit: dto.limit,
      cursor: dto.cursor,
    });
  }

  // ── GET /discovery/venues/:idOrSlug ───────────────────────────────────
  async venueDetail(idOrSlug: string, ctx: AuthContext | null) {
    const where: Prisma.VenueWhereInput = UUID_RE.test(idOrSlug)
      ? { id: idOrSlug, status: VenueStatus.PUBLISHED, deletedAt: null }
      : { slug: idOrSlug, status: VenueStatus.PUBLISHED, deletedAt: null };

    const venue = await this.prisma.venue.findFirst({
      where,
      include: {
        media: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } },
        grounds: {
          where: { deletedAt: null, status: GroundStatus.ACTIVE },
          include: { sport: true, media: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' }, take: 1 } },
        },
      },
    });
    if (!venue) throw new DomainException('VENUE_NOT_FOUND');

    const groundIds = venue.grounds.map((g) => g.id);
    const startingByGround = await this.startingPriceByGround(groundIds);
    const venueStartingPaise = minOrNull(Object.values(startingByGround));

    const [recentReviews, isFavourited, hours] = await Promise.all([
      this.prisma.review.findMany({
        where: { venueId: venue.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { identity: { include: { profile: true } } },
      }),
      ctx
        ? this.prisma.customerFavourite.findFirst({ where: { identityId: ctx.identityId, venueId: venue.id } }).then(Boolean)
        : Promise.resolve(false),
      groundIds.length > 0
        ? this.prisma.operatingHour.findMany({
            where: { groundId: { in: groundIds }, deletedAt: null },
            orderBy: { dayOfWeek: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    return {
      id: venue.id,
      reference_code: venue.referenceCode,
      name: venue.name,
      slug: venue.slug,
      description: venue.description,
      phone: venue.phone,
      email: venue.email,
      address: venue.address,
      area: venue.area,
      city: venue.city,
      state: venue.state,
      postal_code: venue.postalCode,
      latitude: venue.latitude.toString(),
      longitude: venue.longitude.toString(),
      google_maps_url: venue.googleMapsUrl,
      amenities: venue.amenities,
      status: venue.status,
      average_rating: venue.averageRating,
      total_reviews: venue.totalReviews,
      media: venue.media.map((m) => ({ id: m.id, file_url: m.fileUrl, media_type: m.mediaType, display_order: m.displayOrder })),
      grounds: venue.grounds.map((g) => ({
        id: g.id,
        reference_code: g.referenceCode,
        name: g.name,
        sport: { code: g.sport.code, display_name: g.sport.displayName, icon_url: g.sport.iconUrl },
        surface_type: g.surfaceType,
        max_players: g.maxPlayers,
        indoor: g.indoor,
        lighting: g.lighting,
        starting_price_paise: startingByGround[g.id] ?? null,
        status: g.status,
        cover_image_url: g.media[0]?.fileUrl ?? null,
      })),
      starting_price_paise: venueStartingPaise,
      operating_summary: this.summariseHours(hours),
      is_favourited: Boolean(isFavourited),
      recent_reviews: recentReviews.map((r) => ({
        identity_display_name: this.privacyDisplayName(r.identity.profile),
        rating: r.rating,
        review_text: r.reviewText,
        created_at: r.createdAt.toISOString(),
      })),
    };
  }

  // ── GET /discovery/venues/:id/grounds ────────────────────────────────
  async listVenueGrounds(venueId: string, sportCode?: string) {
    if (!UUID_RE.test(venueId)) throw new DomainException('VENUE_NOT_FOUND');
    const venue = await this.prisma.venue.findFirst({
      where: { id: venueId, status: VenueStatus.PUBLISHED, deletedAt: null },
    });
    if (!venue) throw new DomainException('VENUE_NOT_FOUND');
    const where: Prisma.GroundWhereInput = { venueId, status: GroundStatus.ACTIVE, deletedAt: null };
    if (sportCode) where.sport = { code: sportCode };
    const grounds = await this.prisma.ground.findMany({
      where,
      include: { sport: true, media: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' }, take: 1 } },
      orderBy: { createdAt: 'asc' },
    });
    const starting = await this.startingPriceByGround(grounds.map((g) => g.id));
    return grounds.map((g) => ({
      id: g.id,
      reference_code: g.referenceCode,
      name: g.name,
      sport: { code: g.sport.code, display_name: g.sport.displayName, icon_url: g.sport.iconUrl },
      surface_type: g.surfaceType,
      max_players: g.maxPlayers,
      indoor: g.indoor,
      lighting: g.lighting,
      starting_price_paise: starting[g.id] ?? null,
      cover_image_url: g.media[0]?.fileUrl ?? null,
    }));
  }

  // ── GET /discovery/grounds/:id ────────────────────────────────────────
  async groundDetail(id: string) {
    const g = await this.prisma.ground.findFirst({
      where: { id, deletedAt: null },
      include: {
        venue: true,
        sport: true,
        configuration: true,
        media: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } },
        pricingRules: { where: { active: true, deletedAt: null } },
      },
    });
    if (!g) throw new DomainException('GROUND_NOT_FOUND');
    if (g.venue.status !== VenueStatus.PUBLISHED) throw new DomainException('GROUND_NOT_FOUND');
    if (g.status !== GroundStatus.ACTIVE) throw new DomainException('GROUND_NOT_ACTIVE');

    const startingPaise = g.pricingRules.length
      ? Math.round(Math.min(...g.pricingRules.map((r) => Number(r.pricePerSlot))) * 100)
      : null;

    return {
      id: g.id,
      reference_code: g.referenceCode,
      name: g.name,
      venue: { id: g.venue.id, reference_code: g.venue.referenceCode, name: g.venue.name, slug: g.venue.slug },
      sport: { code: g.sport.code, display_name: g.sport.displayName, icon_url: g.sport.iconUrl },
      surface_type: g.surfaceType,
      indoor: g.indoor,
      max_players: g.maxPlayers,
      lighting: g.lighting,
      description: g.description,
      media: g.media.map((m) => ({ id: m.id, file_url: m.fileUrl, display_order: m.displayOrder })),
      booking_config: g.configuration
        ? {
            booking_duration_minutes: g.configuration.bookingDuration,
            min_notice_minutes: g.configuration.minNoticeMinutes,
            max_advance_booking_days: g.configuration.maxAdvanceBookingDays,
            cancellation_window_hours: g.configuration.cancellationWindowHours,
          }
        : null,
      pricing_summary: {
        starting_price_paise: startingPaise,
        sample_bands: g.pricingRules
          .sort((a, b) => b.priority - a.priority)
          .map((r) => ({
            label: r.name,
            time_range: `${fmtTime(r.startTime)}-${fmtTime(r.endTime)}`,
            price_paise: Math.round(Number(r.pricePerSlot) * 100),
          })),
      },
    };
  }

  // ── GET /discovery/grounds/:id/availability ────────────────────────────
  getAvailability(id: string, date: string, duration?: number) {
    return this.availability.getSlots(id, date, duration);
  }

  // ── GET /discovery/grounds/:id/reviews ────────────────────────────────
  async reviewsForGround(groundId: string, limit: number, cursor?: string) {
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, deletedAt: null } });
    if (!ground) throw new DomainException('GROUND_NOT_FOUND');
    // Reviews attach to the parent venue.
    const decoded = cursor ? decodeCursor<{ createdAt: string; id: string }>(cursor) : null;
    const where: Prisma.ReviewWhereInput = { venueId: ground.venueId };
    if (decoded) {
      where.OR = [
        { createdAt: { lt: new Date(decoded.createdAt) } },
        { createdAt: new Date(decoded.createdAt), id: { lt: decoded.id } },
      ];
    }
    const rows = await this.prisma.review.findMany({
      where,
      include: { identity: { include: { profile: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    const [summary, distribution] = await Promise.all([
      this.prisma.review.aggregate({ where: { venueId: ground.venueId }, _avg: { rating: true }, _count: { _all: true } }),
      this.prisma.review.groupBy({ where: { venueId: ground.venueId }, by: ['rating'], _count: { _all: true } }),
    ]);
    const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const r of distribution) dist[String(r.rating)] = r._count._all;

    return {
      data: page.map((r) => ({
        id: r.id,
        identity: {
          display_name: this.privacyDisplayName(r.identity.profile),
          avatar_url: r.identity.profile?.avatarUrl ?? null,
        },
        rating: r.rating,
        review_text: r.reviewText,
        created_at: r.createdAt.toISOString(),
      })),
      pagination: {
        cursor: cursor ?? null,
        next_cursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null,
        has_more: hasMore,
        total: summary._count._all,
      },
      summary: {
        average_rating: Number((summary._avg.rating ?? 0).toFixed(2)),
        total_reviews: summary._count._all,
        distribution: dist,
      },
    };
  }

  // ── GET /discovery/featured ──────────────────────────────────────────
  async featured() {
    // MVP: top-6 published by rating. Banner/admin toggles are deferred (Part 3.3 §10).
    const rows = await this.prisma.venue.findMany({
      where: { status: VenueStatus.PUBLISHED, deletedAt: null },
      orderBy: [{ averageRating: 'desc' }, { totalReviews: 'desc' }],
      take: 6,
      include: {
        media: { where: { mediaType: 'COVER', deletedAt: null }, take: 1 },
        grounds: { where: { deletedAt: null, status: GroundStatus.ACTIVE }, include: { sport: true } },
      },
    });
    const groundIds = rows.flatMap((v) => v.grounds.map((g) => g.id));
    const startingByGround = await this.startingPriceByGround(groundIds);
    const summaries: VenueSummary[] = rows.map((v) => this.buildSummary(v, startingByGround));

    const sports = await this.prisma.sport.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    return {
      featured_venues: summaries,
      featured_sports: sports.map((s) => ({
        id: s.id,
        code: s.code,
        display_name: s.displayName,
        icon_url: s.iconUrl,
        default_duration_minutes: s.defaultDurationMinutes,
        default_max_players: s.defaultMaxPlayers,
      })),
      banners: [], // ponytail: admin-editable banners land with the admin portal
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async queryByRating(dto: ListVenuesDto, take: number, cursor: RatingCursor | null) {
    // Simple keyset: rating DESC, total_reviews DESC, name ASC, id ASC.
    // Filters implemented via SQL for FTS / amenities.
    const filters: Prisma.Sql[] = [Prisma.sql`v.status = 'PUBLISHED'::"VenueStatus" AND v.deleted_at IS NULL AND v.city = 'Nashik'`];

    if (dto.q) filters.push(Prisma.sql`v.search_vector @@ plainto_tsquery('english', ${dto.q})`);
    if (dto.min_rating != null) filters.push(Prisma.sql`v.average_rating >= ${dto.min_rating}`);
    if (dto.amenities?.length) filters.push(Prisma.sql`v.amenities ?& ${dto.amenities}::text[]`);

    if (dto.sport?.length) {
      filters.push(Prisma.sql`
        EXISTS (
          SELECT 1 FROM grounds g JOIN sports s ON s.id = g.sport_id
          WHERE g.venue_id = v.id AND g.deleted_at IS NULL AND g.status = 'ACTIVE'::"GroundStatus"
            AND s.code IN (${Prisma.join(dto.sport)})
        )
      `);
    }
    if (dto.indoor != null) {
      filters.push(Prisma.sql`
        EXISTS (
          SELECT 1 FROM grounds g
          WHERE g.venue_id = v.id AND g.deleted_at IS NULL AND g.status = 'ACTIVE'::"GroundStatus"
            AND g.indoor = ${dto.indoor}
        )
      `);
    }

    if (cursor) {
      filters.push(Prisma.sql`
        (v.average_rating, v.total_reviews, v.name, v.id) <
          (${cursor.rating}::double precision, ${cursor.totalReviews}, ${cursor.name}, ${cursor.id}::uuid)
      `);
    }

    const where = Prisma.join(filters, ' AND ');
    return this.prisma.$queryRaw<VenueRow[]>(Prisma.sql`
      SELECT v.id, v.reference_code, v.name, v.slug, v.address, v.area, v.city,
             v.latitude::text AS latitude, v.longitude::text AS longitude,
             v.average_rating, v.total_reviews, v.amenities, v.status
        FROM venues v
       WHERE ${where}
       ORDER BY v.average_rating DESC, v.total_reviews DESC, v.name ASC, v.id ASC
       LIMIT ${take}
    `);
  }

  private async queryByDistance(near: { lat: number; lng: number }, radiusKm: number, dto: ListVenuesDto, take: number, cursor: NearCursor | null) {
    const filters: Prisma.Sql[] = [Prisma.sql`v.status = 'PUBLISHED'::"VenueStatus" AND v.deleted_at IS NULL AND v.city = 'Nashik'`];
    if (dto.q) filters.push(Prisma.sql`v.search_vector @@ plainto_tsquery('english', ${dto.q})`);
    if (dto.min_rating != null) filters.push(Prisma.sql`v.average_rating >= ${dto.min_rating}`);
    if (dto.amenities?.length) filters.push(Prisma.sql`v.amenities ?& ${dto.amenities}::text[]`);
    if (dto.sport?.length) {
      filters.push(Prisma.sql`
        EXISTS (SELECT 1 FROM grounds g JOIN sports s ON s.id = g.sport_id
                WHERE g.venue_id = v.id AND g.deleted_at IS NULL AND g.status='ACTIVE'::"GroundStatus"
                  AND s.code IN (${Prisma.join(dto.sport)}))
      `);
    }
    if (dto.indoor != null) {
      filters.push(Prisma.sql`EXISTS (SELECT 1 FROM grounds g WHERE g.venue_id=v.id AND g.deleted_at IS NULL AND g.status='ACTIVE'::"GroundStatus" AND g.indoor=${dto.indoor})`);
    }
    filters.push(Prisma.sql`ST_DWithin(v.location, ST_MakePoint(${near.lng}, ${near.lat})::geography, ${radiusKm * 1000})`);
    if (cursor) filters.push(Prisma.sql`(distance_km, v.id::text) > (${cursor.distanceKm}, ${cursor.id})`);

    const where = Prisma.join(filters, ' AND ');
    return this.prisma.$queryRaw<VenueRow[]>(Prisma.sql`
      SELECT v.id, v.reference_code, v.name, v.slug, v.address, v.area, v.city,
             v.latitude::text AS latitude, v.longitude::text AS longitude,
             v.average_rating, v.total_reviews, v.amenities, v.status,
             ST_Distance(v.location, ST_MakePoint(${near.lng}, ${near.lat})::geography) / 1000.0 AS distance_km
        FROM venues v
       WHERE ${where}
       ORDER BY distance_km ASC, v.id ASC
       LIMIT ${take}
    `);
  }

  private async hydrateSummaries(rows: VenueRow[]): Promise<VenueSummary[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [covers, grounds] = await Promise.all([
      this.prisma.venueMedia.findMany({
        where: { venueId: { in: ids }, mediaType: 'COVER', deletedAt: null },
      }),
      this.prisma.ground.findMany({
        where: { venueId: { in: ids }, status: GroundStatus.ACTIVE, deletedAt: null },
        include: { sport: true },
      }),
    ]);
    const starting = await this.startingPriceByGround(grounds.map((g) => g.id));
    const coverByVenue = new Map(covers.map((c) => [c.venueId, c.fileUrl]));
    const groundsByVenue = new Map<string, typeof grounds>();
    for (const g of grounds) {
      const arr = groundsByVenue.get(g.venueId) ?? [];
      arr.push(g);
      groundsByVenue.set(g.venueId, arr);
    }
    return rows.map((v) => this.buildSummaryFromRow(v, coverByVenue.get(v.id) ?? null, groundsByVenue.get(v.id) ?? [], starting));
  }

  private buildSummary(
    v: { id: string; referenceCode: string; name: string; slug: string; address: string; area: string | null; city: string; latitude: Prisma.Decimal; longitude: Prisma.Decimal; averageRating: number; totalReviews: number; amenities: unknown; media: Array<{ fileUrl: string }>; grounds: Array<{ id: string; sport: { code: string; displayName: string; iconUrl: string | null } }> },
    startingByGround: Record<string, number>,
  ): VenueSummary {
    const sports = uniqueSports(v.grounds.map((g) => g.sport));
    const startingPrices = v.grounds.map((g) => startingByGround[g.id]).filter((p): p is number => typeof p === 'number');
    return {
      id: v.id,
      reference_code: v.referenceCode,
      name: v.name,
      slug: v.slug,
      cover_image_url: v.media[0]?.fileUrl ?? null,
      address: v.address,
      area: v.area,
      city: v.city,
      latitude: v.latitude.toString(),
      longitude: v.longitude.toString(),
      average_rating: v.averageRating,
      total_reviews: v.totalReviews,
      supported_sports: sports,
      starting_price_paise: startingPrices.length ? Math.min(...startingPrices) : null,
      amenities: v.amenities,
    };
  }

  private buildSummaryFromRow(
    v: VenueRow,
    cover: string | null,
    grounds: Array<{ id: string; sport: { code: string; displayName: string; iconUrl: string | null } }>,
    startingByGround: Record<string, number>,
  ): VenueSummary {
    const startingPrices = grounds.map((g) => startingByGround[g.id]).filter((p): p is number => typeof p === 'number');
    return {
      id: v.id,
      reference_code: v.reference_code,
      name: v.name,
      slug: v.slug,
      cover_image_url: cover,
      address: v.address,
      area: v.area,
      city: v.city,
      latitude: v.latitude,
      longitude: v.longitude,
      average_rating: v.average_rating,
      total_reviews: v.total_reviews,
      supported_sports: uniqueSports(grounds.map((g) => g.sport)),
      starting_price_paise: startingPrices.length ? Math.min(...startingPrices) : null,
      amenities: v.amenities,
      ...(v.distance_km != null ? { distance_km: Math.round(v.distance_km * 100) / 100 } : {}),
    };
  }

  private async startingPriceByGround(groundIds: string[]): Promise<Record<string, number>> {
    if (groundIds.length === 0) return {};
    const rows = await this.prisma.pricingRule.groupBy({
      by: ['groundId'],
      where: { groundId: { in: groundIds }, active: true, deletedAt: null },
      _min: { pricePerSlot: true },
    });
    const out: Record<string, number> = {};
    for (const r of rows) {
      if (r._min.pricePerSlot != null) out[r.groundId] = Math.round(Number(r._min.pricePerSlot) * 100);
    }
    return out;
  }

  private summariseHours(hours: Array<{ dayOfWeek: number; openingTime: Date; closingTime: Date; isClosed: boolean }>) {
    if (hours.length === 0) return { typical_hours: null, closed_days: [] };
    const open = new Set<string>();
    const close = new Set<string>();
    const closed_days: number[] = [];
    for (const h of hours) {
      if (h.isClosed) { closed_days.push(h.dayOfWeek); continue; }
      open.add(fmtTime(h.openingTime));
      close.add(fmtTime(h.closingTime));
    }
    const typical = open.size === 1 && close.size === 1
      ? `${Array.from(open)[0]} – ${Array.from(close)[0]}`
      : 'Varies by day';
    return { typical_hours: typical, closed_days };
  }

  private privacyDisplayName(profile: { firstName: string; lastName: string | null } | null | undefined): string {
    if (!profile) return 'TurfX Member';
    const last = profile.lastName ? `${profile.lastName[0].toUpperCase()}.` : '';
    return [profile.firstName, last].filter(Boolean).join(' ');
  }
}

interface CursorPayload { [k: string]: unknown }
interface RatingCursor extends CursorPayload { rating: number; totalReviews: number; name: string; id: string }
interface NearCursor extends CursorPayload { distanceKm: number; id: string }

interface VenueRow {
  id: string;
  reference_code: string;
  name: string;
  slug: string;
  address: string;
  area: string | null;
  city: string;
  latitude: string;
  longitude: string;
  average_rating: number;
  total_reviews: number;
  amenities: unknown;
  status: string;
  distance_km?: number;
}

function parseNear(near: string | undefined): { lat: number; lng: number } | null {
  if (!near) return null;
  const [lat, lng] = near.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function minOrNull(nums: Array<number | undefined>): number | null {
  const filtered = nums.filter((n): n is number => typeof n === 'number');
  return filtered.length ? Math.min(...filtered) : null;
}

function uniqueSports(sports: Array<{ code: string; displayName: string; iconUrl: string | null }>) {
  const seen = new Set<string>();
  const out: Array<{ code: string; display_name: string; icon_url: string | null }> = [];
  for (const s of sports) {
    if (seen.has(s.code)) continue;
    seen.add(s.code);
    out.push({ code: s.code, display_name: s.displayName, icon_url: s.iconUrl });
  }
  return out;
}

function fmtTime(t: Date): string {
  return t.toISOString().slice(11, 16);
}
