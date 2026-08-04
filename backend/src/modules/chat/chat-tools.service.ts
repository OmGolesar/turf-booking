import { Injectable, Logger } from '@nestjs/common';
import { BookingSource, Role } from '@prisma/client';
import { DiscoveryService } from '../discovery/discovery.service';
import { AvailabilityService } from '../availability/availability.service';
import { BookingSessionService } from '../booking/booking-session.service';
import { BookingService } from '../booking/booking.service';
import { CustomersService } from '../customers/customers.service';
import { ChatRecommenderService } from './chat-recommender.service';
import { DomainException } from '../../shared/errors/domain.exception';
import type { AuthContext } from '../../shared/auth/auth-context';

// The LLM receives whatever we return here as a tool_result. Keep responses
// small — every extra field ends up in the next request's token count. Wrap
// domain errors so the LLM can decide to retry with different args instead
// of the whole turn failing.

export interface ToolContext {
  auth: AuthContext | null;
  requestId: string;
}

// A `handoff` is returned when a tool result carries state the CLIENT must act
// on (not the LLM). Typed as a discriminated union so Phase 4 handoffs (e.g.
// "open venue detail", "start review flow") can be added by widening the
// union without breaking existing type-narrowing on `type`.
export interface ConfirmBookingHandoff {
  type: 'confirm_booking';
  booking_session_id: string;
  razorpay_order_id: string;
  razorpay_key_id: string;
  amount_paise: number;
  expires_at: string;
}
export type ChatHandoff = ConfirmBookingHandoff;

export interface ToolExecutionResult {
  ok: boolean;
  data?: unknown;
  error?: { code: string; message: string };
  handoff?: ChatHandoff;
}

@Injectable()
export class ChatToolsService {
  private readonly logger = new Logger(ChatToolsService.name);

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly availability: AvailabilityService,
    private readonly recommender: ChatRecommenderService,
    private readonly bookingSessions: BookingSessionService,
    private readonly bookings: BookingService,
    private readonly customers: CustomersService,
  ) {}

  async execute(
    name: string,
    input: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolExecutionResult> {
    try {
      switch (name) {
        case 'search_venues':
          return { ok: true, data: await this.searchVenues(input) };
        case 'find_nearby_venues':
          return { ok: true, data: await this.findNearbyVenues(input) };
        case 'get_venue_details':
          return { ok: true, data: await this.getVenueDetails(input) };
        case 'check_availability':
          return { ok: true, data: await this.checkAvailability(input) };
        case 'recommend_best':
          return { ok: true, data: await this.recommendBest(input) };
        case 'hold_slot':
          return await this.holdSlot(input, ctx);
        case 'get_my_bookings':
          return { ok: true, data: await this.getMyBookings(input, ctx) };
        case 'cancel_booking':
          return { ok: true, data: await this.cancelBooking(input, ctx) };
        default:
          return { ok: false, error: { code: 'UNKNOWN_TOOL', message: `Tool "${name}" is not defined.` } };
      }
    } catch (err) {
      if (err instanceof DomainException) {
        return { ok: false, error: { code: err.code, message: err.message } };
      }
      this.logger.error(`Tool "${name}" failed: ${(err as Error).message}`);
      return { ok: false, error: { code: 'TOOL_EXECUTION_ERROR', message: 'Tool failed unexpectedly.' } };
    }
  }

  // ── Discovery tools ──────────────────────────────────────────────────

  private async searchVenues(input: Record<string, unknown>) {
    const q = asString(input.q);
    const sport = asString(input.sport);
    const min_rating = asNumber(input.min_rating);
    const indoor = asBool(input.indoor);
    const limit = clampInt(asNumber(input.limit) ?? 5, 1, 10);

    const result = await this.discovery.listVenues({
      q,
      sport: sport ? [sport] : undefined,
      min_rating,
      indoor,
      limit,
    });
    return { venues: result.data.map(compactVenue), has_more: result.pagination.has_more };
  }

  private async findNearbyVenues(input: Record<string, unknown>) {
    const lat = requireNumber(input.lat, 'lat');
    const lng = requireNumber(input.lng, 'lng');
    const sport = asString(input.sport);
    const radius_km = clampNum(asNumber(input.radius_km) ?? 10, 0.5, 25);
    const limit = clampInt(asNumber(input.limit) ?? 5, 1, 10);

    const result = await this.discovery.listVenues({
      near: `${lat},${lng}`,
      radius_km,
      sport: sport ? [sport] : undefined,
      limit,
    });
    return { venues: result.data.map(compactVenue), has_more: result.pagination.has_more };
  }

  private async getVenueDetails(input: Record<string, unknown>) {
    const idOrSlug = requireString(input.venue_id_or_slug, 'venue_id_or_slug');
    const v = await this.discovery.venueDetail(idOrSlug, null);
    return {
      id: v.id,
      name: v.name,
      slug: v.slug,
      area: v.area,
      address: v.address,
      average_rating: v.average_rating,
      total_reviews: v.total_reviews,
      starting_price_paise: v.starting_price_paise,
      amenities: v.amenities,
      operating_summary: v.operating_summary,
      grounds: v.grounds.map((g) => ({
        id: g.id,
        name: g.name,
        sport_code: g.sport.code,
        indoor: g.indoor,
        max_players: g.max_players,
        starting_price_paise: g.starting_price_paise,
      })),
    };
  }

  private async checkAvailability(input: Record<string, unknown>) {
    const ground_id = requireString(input.ground_id, 'ground_id');
    const date = requireString(input.date, 'date');
    const duration = asNumber(input.duration_minutes);
    const r = await this.availability.getSlots(ground_id, date, duration);
    return {
      ground_id: r.ground_id,
      date: r.date,
      slots: r.slots.map((s) => ({
        start_time: s.start_time,
        end_time: s.end_time,
        state: s.state,
        price_paise: s.price_paise,
      })),
      available_count: r.slots.filter((s) => s.state === 'AVAILABLE').length,
    };
  }

  private async recommendBest(input: Record<string, unknown>) {
    const results = await this.recommender.recommend({
      lat: requireNumber(input.lat, 'lat'),
      lng: requireNumber(input.lng, 'lng'),
      date: requireString(input.date, 'date'),
      start_time: asString(input.start_time),
      duration_minutes: asNumber(input.duration_minutes),
      sport_code: asString(input.sport_code),
      max_price_rupees: asNumber(input.max_price_rupees),
      radius_km: asNumber(input.radius_km),
    });
    return { recommendations: results };
  }

  // ── Booking tools ────────────────────────────────────────────────────

  private async holdSlot(
    input: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolExecutionResult> {
    this.assertCustomerAuth(ctx);
    const ground_id = requireString(input.ground_id, 'ground_id');
    const booking_date = requireString(input.date, 'date');
    const start_time = requireString(input.start_time, 'start_time');
    const duration_minutes = asNumber(input.duration_minutes);

    // Phone-verification, min-notice, advance-window and slot-conflict checks
    // all live in BookingSessionService; we just pass the DTO through.
    const result = await this.bookingSessions.create(
      ctx.auth!,
      { ground_id, booking_date, start_time, duration_minutes },
      this.meta(ctx),
      BookingSource.CHATBOT,
    );

    const handoff: ChatHandoff = {
      type: 'confirm_booking',
      booking_session_id: result.session.id,
      razorpay_order_id: result.payment_order.order_id,
      razorpay_key_id: result.payment_order.razorpay_key_id,
      amount_paise: result.payment_order.amount_paise,
      expires_at: result.session.expires_at,
    };

    // What the LLM sees in tool_result — just enough to compose the reply.
    // Session id, Razorpay key, and slot echo ride the top-level `handoff`
    // for the client and are intentionally kept out of the LLM turn history.
    return {
      ok: true,
      data: { held: true, amount_paise: handoff.amount_paise, expires_at: handoff.expires_at },
      handoff,
    };
  }

  private async getMyBookings(input: Record<string, unknown>, ctx: ToolContext) {
    this.assertCustomerAuth(ctx);
    const timeframe = asString(input.timeframe) as 'UPCOMING' | 'PAST' | 'ALL' | undefined;
    const limit = clampInt(asNumber(input.limit) ?? 5, 1, 20);

    const result = await this.customers.listMyBookings(ctx.auth!, { timeframe, limit });
    return {
      bookings: result.data.map((b) => ({
        id: b.id,
        reference_code: b.reference_code,
        venue_name: b.venue.name,
        sport: b.ground.sport.code,
        date: b.booking_date,
        start_time: b.start_time,
        end_time: b.end_time,
        status: b.booking_status,
        total_paise: b.total_amount_paise,
        can_cancel: b.can_cancel,
      })),
      has_more: result.pagination.has_more,
    };
  }

  private async cancelBooking(input: Record<string, unknown>, ctx: ToolContext) {
    this.assertCustomerAuth(ctx);
    const idOrRef = requireString(input.booking_id_or_reference, 'booking_id_or_reference');
    const reason = asString(input.reason);

    const result = await this.bookings.cancel(
      ctx.auth!,
      idOrRef,
      reason ? { reason } : {},
      this.meta(ctx),
    );
    return {
      booking_id: result.booking.id,
      status: result.booking.booking_status,
      cancelled_at: result.booking.cancelled_at,
      refund: result.refund
        ? {
            amount_paise: result.refund.amount_paise,
            expected_settlement_days: result.refund.expected_settlement_days,
          }
        : null,
    };
  }

  // ── Auth guard + RequestMeta helper ──────────────────────────────────

  private assertCustomerAuth(ctx: ToolContext): asserts ctx is ToolContext & { auth: AuthContext } {
    if (!ctx.auth) throw new DomainException('CHAT_AUTH_REQUIRED');
    if (ctx.auth.role !== Role.CUSTOMER) {
      // Partner/admin identities exist but the customer flow (holds, my-bookings,
      // customer cancel) is CUSTOMER-only.
      throw new DomainException('AUTH_INSUFFICIENT_PERMISSIONS');
    }
  }

  private meta(ctx: ToolContext) {
    return { requestId: ctx.requestId, route: '/v1/chat/messages' };
  }
}

// ── Coercers ────────────────────────────────────────────────────────

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}
function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
function asBool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}
function requireNumber(v: unknown, field: string): number {
  const n = asNumber(v);
  if (n == null) throw new DomainException('VALIDATION_FAILED', { fieldErrors: [{ field, code: 'REQUIRED', message: `${field} required` }] });
  return n;
}
function requireString(v: unknown, field: string): string {
  const s = asString(v);
  if (!s) throw new DomainException('VALIDATION_FAILED', { fieldErrors: [{ field, code: 'REQUIRED', message: `${field} required` }] });
  return s;
}
function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(n)));
}
function clampNum(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// Compact venue payload sent to the LLM. Full response has more fields;
// we cut noise so the LLM does not spend tokens re-reading them.
function compactVenue(v: {
  id: string;
  name: string;
  slug: string;
  area: string | null;
  address: string;
  average_rating: number;
  total_reviews: number;
  starting_price_paise: number | null;
  supported_sports: Array<{ code: string; display_name: string }>;
  distance_km?: number;
}) {
  return {
    id: v.id,
    name: v.name,
    slug: v.slug,
    area: v.area,
    average_rating: v.average_rating,
    total_reviews: v.total_reviews,
    starting_price_paise: v.starting_price_paise,
    sports: v.supported_sports.map((s) => s.code),
    ...(v.distance_km != null ? { distance_km: v.distance_km } : {}),
  };
}
