import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma, VenueStatus, GroundStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { DomainException } from '../../shared/errors/domain.exception';
import { encodeCursor, decodeCursor } from '../../shared/pagination/cursor';
import type { AuthContext } from '../../shared/auth/auth-context';
import type { ListCustomerBookingsDto } from './dtos/list-customer-bookings.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Favourites ───────────────────────────────────────────────────────

  async addFavourite(ctx: AuthContext, venueId: string) {
    // Spec §12: succeed silently if the venue exists but isn't published
    // (we don't leak status). Only 404 when the venue truly does not exist.
    const venue = await this.prisma.venue.findFirst({ where: { id: venueId, deletedAt: null } });
    if (!venue) throw new DomainException('VENUE_NOT_FOUND');

    // Upsert-by-composite-key gives idempotency for free.
    const fav = await this.prisma.customerFavourite.upsert({
      where: { identityId_venueId: { identityId: ctx.identityId, venueId } },
      create: { identityId: ctx.identityId, venueId },
      update: {},
    });
    return { venue_id: venueId, favourited_at: fav.createdAt.toISOString() };
  }

  async removeFavourite(ctx: AuthContext, venueId: string) {
    await this.prisma.customerFavourite.deleteMany({ where: { identityId: ctx.identityId, venueId } });
    return null;
  }

  async listFavourites(ctx: AuthContext, limit = 20, cursor?: string) {
    const clamped = Math.min(100, Math.max(1, limit));
    const decoded = cursor ? decodeCursor<{ createdAt: string; venueId: string }>(cursor) : null;
    const where: Prisma.CustomerFavouriteWhereInput = { identityId: ctx.identityId };
    if (decoded) {
      where.OR = [
        { createdAt: { lt: new Date(decoded.createdAt) } },
        { createdAt: new Date(decoded.createdAt), venueId: { lt: decoded.venueId } },
      ];
    }
    const rows = await this.prisma.customerFavourite.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { venueId: 'desc' }],
      take: clamped + 1,
      include: {
        venue: {
          include: {
            media: { where: { mediaType: 'COVER', deletedAt: null }, take: 1 },
            grounds: { where: { deletedAt: null, status: GroundStatus.ACTIVE }, include: { sport: true } },
          },
        },
      },
    });

    // Show favourites even when the venue drifts out of PUBLISHED (partner suspended, etc.).
    // Ponytail: don't hide them silently — the customer needs to know they favourited it.
    const hasMore = rows.length > clamped;
    const page = hasMore ? rows.slice(0, clamped) : rows;
    const last = page[page.length - 1];
    const summaries = page.map((f) => ({
      id: f.venue.id,
      reference_code: f.venue.referenceCode,
      name: f.venue.name,
      slug: f.venue.slug,
      cover_image_url: f.venue.media[0]?.fileUrl ?? null,
      address: f.venue.address,
      area: f.venue.area,
      city: f.venue.city,
      latitude: f.venue.latitude.toString(),
      longitude: f.venue.longitude.toString(),
      average_rating: f.venue.averageRating,
      total_reviews: f.venue.totalReviews,
      supported_sports: dedupeSports(f.venue.grounds.map((g) => g.sport)),
      amenities: f.venue.amenities,
      is_published: f.venue.status === VenueStatus.PUBLISHED,
      favourited_at: f.createdAt.toISOString(),
    }));

    return {
      data: summaries,
      pagination: {
        cursor: cursor ?? null,
        next_cursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), venueId: last.venueId }) : null,
        has_more: hasMore,
        total: null,
      },
    };
  }

  // ── Customer bookings read ────────────────────────────────────────────

  async listMyBookings(ctx: AuthContext, dto: ListCustomerBookingsDto) {
    const limit = Math.min(100, Math.max(1, dto.limit ?? 20));
    const timeframe = dto.timeframe ?? 'UPCOMING';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: Prisma.BookingWhereInput = { identityId: ctx.identityId };
    if (dto.status?.length) where.bookingStatus = { in: dto.status };
    if (timeframe === 'UPCOMING') {
      where.bookingDate = { gte: today };
      where.bookingStatus = where.bookingStatus ?? { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] };
    } else if (timeframe === 'PAST') {
      where.bookingDate = { lt: today };
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
        venue: { include: { media: { where: { mediaType: 'COVER', deletedAt: null }, take: 1 } } },
        ground: { include: { sport: true, configuration: true } },
        payment: true,
        review: true,
      },
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    const now = new Date();
    const data = page.map((b) => {
      const cancelDeadline = this.cancellationDeadline(b);
      const canCancel =
        b.bookingStatus === BookingStatus.CONFIRMED &&
        cancelDeadline != null &&
        now < cancelDeadline;
      return {
        id: b.id,
        reference_code: b.referenceCode,
        venue: {
          id: b.venue.id,
          name: b.venue.name,
          cover_image_url: b.venue.media[0]?.fileUrl ?? null,
          area: b.venue.area,
          city: b.venue.city,
        },
        ground: {
          id: b.ground.id,
          name: b.ground.name,
          sport: { code: b.ground.sport.code, display_name: b.ground.sport.displayName, icon_url: b.ground.sport.iconUrl },
        },
        booking_date: b.bookingDate.toISOString().slice(0, 10),
        start_time: fmtTime(b.startTime),
        end_time: fmtTime(b.endTime),
        booking_status: b.bookingStatus,
        total_amount_paise: Math.round(Number(b.totalAmount) * 100),
        payment: b.payment
          ? {
              reference_code: b.payment.referenceCode,
              status: b.payment.paymentStatus,
              method: b.payment.paymentMethod,
            }
          : null,
        can_cancel: canCancel,
        cancel_deadline: cancelDeadline ? cancelDeadline.toISOString() : null,
        review: b.review ? { rating: b.review.rating, created_at: b.review.createdAt.toISOString() } : null,
        created_at: b.createdAt.toISOString(),
      };
    });

    return {
      data,
      pagination: {
        cursor: dto.cursor ?? null,
        next_cursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null,
        has_more: hasMore,
        total: null,
      },
    };
  }

  private cancellationDeadline(b: {
    bookingDate: Date;
    startTime: Date;
    ground: { configuration: { cancellationWindowHours: number } | null };
  }): Date | null {
    const hours = b.ground.configuration?.cancellationWindowHours;
    if (hours == null) return null;
    // booking_date + start_time treated as IST wall clock
    const dateStr = b.bookingDate.toISOString().slice(0, 10);
    const timeStr = fmtTime(b.startTime);
    const startAt = new Date(`${dateStr}T${timeStr}:00+05:30`);
    return new Date(startAt.getTime() - hours * 3600_000);
  }
}

function fmtTime(t: Date): string {
  return t.toISOString().slice(11, 16);
}

function dedupeSports(sports: Array<{ code: string; displayName: string; iconUrl: string | null }>) {
  const seen = new Set<string>();
  const out: Array<{ code: string; display_name: string; icon_url: string | null }> = [];
  for (const s of sports) {
    if (seen.has(s.code)) continue;
    seen.add(s.code);
    out.push({ code: s.code, display_name: s.displayName, icon_url: s.iconUrl });
  }
  return out;
}
