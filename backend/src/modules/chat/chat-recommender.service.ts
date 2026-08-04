import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';

export interface RecommendInput {
  lat: number;
  lng: number;
  date: string;             // YYYY-MM-DD (IST)
  start_time?: string;      // HH:MM (IST); when omitted we recommend the earliest available slot
  duration_minutes?: number;
  sport_code?: string;
  max_price_rupees?: number;
  radius_km?: number;
}

export interface Recommendation {
  venue_id: string;
  venue_name: string;
  venue_slug: string;
  ground_id: string;
  ground_name: string;
  sport_code: string;
  distance_km: number;
  average_rating: number;
  total_reviews: number;
  price_paise: number;
  start_time: string;
  end_time: string;
  score: number;
  rationale: string;
}

/**
 * Deterministic scorer. Not an LLM.
 *
 * Contract:
 *   1. Find published venues in Nashik within `radius_km` (default 10) of (lat,lng),
 *      optionally filtered to a sport code.
 *   2. For each candidate ground, ask AvailabilityService for the requested date.
 *   3. Pick the slot at `start_time` if given, else the earliest AVAILABLE slot.
 *      Drop candidates with no free slot (or over `max_price_rupees` if given).
 *   4. Rank by weighted score and return the top 3 with a short rationale string
 *      the LLM can quote verbatim.
 *
 * Weights: distance 40%, rating 35%, price 25%. Tuned so a nearby high-rated
 * venue always beats a far mediocre one, but a much closer cheaper venue can
 * still edge out a slightly-further one.
 */
@Injectable()
export class ChatRecommenderService {
  private static readonly W_DISTANCE = 0.4;
  private static readonly W_RATING = 0.35;
  private static readonly W_PRICE = 0.25;
  private static readonly DEFAULT_RADIUS_KM = 10;
  private static readonly CANDIDATE_LIMIT = 8;

  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
  ) {}

  async recommend(input: RecommendInput): Promise<Recommendation[]> {
    const radiusKm = input.radius_km ?? ChatRecommenderService.DEFAULT_RADIUS_KM;
    const candidates = await this.findCandidateGrounds(input, radiusKm);
    if (candidates.length === 0) return [];

    const scored: Recommendation[] = [];
    const maxDistance = Math.max(...candidates.map((c) => c.distance_km), 0.1);
    const maxPricePaise = input.max_price_rupees != null
      ? Math.round(input.max_price_rupees * 100)
      : null;

    for (const c of candidates) {
      const slot = await this.pickSlot(c.ground_id, input);
      if (!slot) continue;
      if (maxPricePaise != null && slot.price_paise > maxPricePaise) continue;

      const distanceNorm = 1 - Math.min(1, c.distance_km / Math.max(maxDistance, radiusKm));
      const ratingNorm = c.average_rating / 5;
      const priceNorm = this.priceFitScore(slot.price_paise, maxPricePaise);
      const score =
        ChatRecommenderService.W_DISTANCE * distanceNorm +
        ChatRecommenderService.W_RATING * ratingNorm +
        ChatRecommenderService.W_PRICE * priceNorm;

      scored.push({
        venue_id: c.venue_id,
        venue_name: c.venue_name,
        venue_slug: c.venue_slug,
        ground_id: c.ground_id,
        ground_name: c.ground_name,
        sport_code: c.sport_code,
        distance_km: Math.round(c.distance_km * 100) / 100,
        average_rating: c.average_rating,
        total_reviews: c.total_reviews,
        price_paise: slot.price_paise,
        start_time: slot.start_time,
        end_time: slot.end_time,
        score: Math.round(score * 1000) / 1000,
        rationale: this.rationaleFor(c, slot),
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async findCandidateGrounds(input: RecommendInput, radiusKm: number) {
    const sportFilter = input.sport_code
      ? Prisma.sql`AND s.code = ${input.sport_code}`
      : Prisma.empty;

    return this.prisma.$queryRaw<CandidateRow[]>(Prisma.sql`
      SELECT
        v.id             AS venue_id,
        v.name           AS venue_name,
        v.slug           AS venue_slug,
        v.average_rating AS average_rating,
        v.total_reviews  AS total_reviews,
        g.id             AS ground_id,
        g.name           AS ground_name,
        s.code           AS sport_code,
        ST_Distance(v.location, ST_MakePoint(${input.lng}, ${input.lat})::geography) / 1000.0 AS distance_km
      FROM venues v
      JOIN grounds g ON g.venue_id = v.id AND g.deleted_at IS NULL AND g.status = 'ACTIVE'::"GroundStatus"
      JOIN sports  s ON s.id = g.sport_id
      WHERE v.status = 'PUBLISHED'::"VenueStatus"
        AND v.deleted_at IS NULL
        AND ST_DWithin(v.location, ST_MakePoint(${input.lng}, ${input.lat})::geography, ${radiusKm * 1000})
        ${sportFilter}
      ORDER BY distance_km ASC
      LIMIT ${ChatRecommenderService.CANDIDATE_LIMIT}
    `);
  }

  private async pickSlot(groundId: string, input: RecommendInput) {
    try {
      const result = await this.availability.getSlots(groundId, input.date, input.duration_minutes);
      if (input.start_time) {
        const exact = result.slots.find(
          (s) => s.start_time === input.start_time && s.state === 'AVAILABLE',
        );
        return exact ?? null;
      }
      return result.slots.find((s) => s.state === 'AVAILABLE') ?? null;
    } catch {
      // Ground has no operating hours for that day, outside window, etc. — drop it.
      return null;
    }
  }

  private priceFitScore(pricePaise: number, maxPaise: number | null): number {
    if (maxPaise == null) {
      // No budget → cheaper is a mild plus, capped so it doesn't dominate.
      const anchor = 100_000; // ₹1,000 = neutral
      return Math.max(0, Math.min(1, 1 - pricePaise / (anchor * 2)));
    }
    // With budget → deeper below budget scores higher; at-budget = 0.5.
    return Math.max(0, Math.min(1, 1 - pricePaise / (maxPaise * 2)));
  }

  private rationaleFor(c: CandidateRow, slot: { price_paise: number; start_time: string }): string {
    const parts: string[] = [];
    parts.push(`${(Math.round(c.distance_km * 10) / 10).toFixed(1)}km away`);
    if (c.average_rating > 0) parts.push(`${c.average_rating.toFixed(1)}★ (${c.total_reviews})`);
    parts.push(`₹${Math.round(slot.price_paise / 100)}/slot`);
    parts.push(`open at ${slot.start_time}`);
    return parts.join(' · ');
  }
}

interface CandidateRow {
  venue_id: string;
  venue_name: string;
  venue_slug: string;
  average_rating: number;
  total_reviews: number;
  ground_id: string;
  ground_name: string;
  sport_code: string;
  distance_km: number;
}
