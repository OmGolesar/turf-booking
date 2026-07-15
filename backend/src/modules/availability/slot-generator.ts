// Pure slot generator. No DB, no Nest dependencies — takes a snapshot,
// returns slot list. Same input → same output. Easy to reason about and
// integration-test in isolation.

import type {
  AvailabilityException,
  Booking,
  BookingSession,
  Ground,
  GroundConfiguration,
  MaintenanceBlock,
  OperatingHour,
  PricingRule,
} from '@prisma/client';

export type SlotState =
  | 'AVAILABLE'
  | 'HELD'
  | 'BOOKED'
  | 'MAINTENANCE'
  | 'EXCEPTION'
  | 'CLOSED'
  | 'PAST'
  | 'MIN_NOTICE';

export interface Slot {
  start_time: string; // "HH:MM"
  end_time: string;
  state: SlotState;
  price_paise: number;
  matched_pricing_rule_id: string | null;
  held_until?: string; // ISO-8601
}

export interface GenerateSlotsInput {
  ground: Pick<Ground, 'id' | 'status'>;
  configuration: GroundConfiguration | null;
  operatingHour: OperatingHour | null;
  exceptions: AvailabilityException[];
  maintenance: MaintenanceBlock[];
  pricingRules: PricingRule[];
  existingBookings: Booking[];
  activeBookingSessions: BookingSession[];
  date: string; // "YYYY-MM-DD" IST
  now: Date;
  durationOverrideMinutes?: number;
}

/**
 * Generate slots for the given day. See Part 3.3 §7 for the algorithm.
 * All time arithmetic uses minutes-since-midnight; wall-clock IST because
 * TIME columns are naive IST and Asia/Kolkata has no DST.
 */
export function generateSlots(input: GenerateSlotsInput): Slot[] {
  // GROUND state gates the whole response.
  if (!input.configuration || !input.operatingHour) return [];

  const day = dayOfWeek(input.date); // 1..7 Mon..Sun

  // Ground MAINTENANCE renders every operating-hour slot as MAINTENANCE (spec §7 step 2).
  const groundMaintenance = input.ground.status === 'MAINTENANCE';

  // Closed day → CLOSED for every operating-hour slot (empty list is fine too, but
  // clients expect a placeholder to render "closed today"). Spec §7 step 3 chooses CLOSED.
  const closedAllDay = input.operatingHour.isClosed;

  const openMin = timeToMinutes(fmtTime(input.operatingHour.openingTime));
  const closeMin = timeToMinutes(fmtTime(input.operatingHour.closingTime));

  const duration = input.durationOverrideMinutes ?? input.configuration.bookingDuration;
  const interval = input.configuration.bookingInterval;

  const nowMinInDate = minutesFromNowInDate(input.now, input.date);
  const minNoticeCutoff = nowMinInDate + input.configuration.minNoticeMinutes;

  const bookings = indexByStartMinute(
    input.existingBookings
      .filter((b) => sameDate(b.bookingDate, input.date))
      .filter((b) => ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(b.bookingStatus))
      .map((b) => ({ start: timeToMinutes(fmtTime(b.startTime)), end: timeToMinutes(fmtTime(b.endTime)) })),
  );
  const sessions = input.activeBookingSessions
    .filter((s) => sameDate(s.bookingDate, input.date))
    .filter((s) => s.status === 'ACTIVE' && s.expiresAt > input.now)
    .map((s) => ({
      start: timeToMinutes(fmtTime(s.startTime)),
      end: timeToMinutes(fmtTime(s.endTime)),
      heldUntil: s.expiresAt.toISOString(),
    }));

  const exceptions = input.exceptions
    .filter((e) => sameDate(e.exceptionDate, input.date) && e.isClosed)
    .map((e) => ({ start: timeToMinutes(fmtTime(e.startTime)), end: timeToMinutes(fmtTime(e.endTime)) }));

  const maintenance = input.maintenance
    .filter((m) => overlapsDate(m.startDatetime, m.endDatetime, input.date))
    .map((m) => ({ start: minutesFromDatetime(m.startDatetime, input.date), end: minutesFromDatetime(m.endDatetime, input.date) }));

  const activeRules = input.pricingRules
    .filter((r) => r.active)
    .filter((r) => r.dayOfWeek == null || r.dayOfWeek === day)
    .filter((r) => withinEffective(r, input.now))
    .sort((a, b) => b.priority - a.priority);

  const slots: Slot[] = [];
  for (let start = openMin; start + duration <= closeMin; start += interval) {
    const end = start + duration;
    const pricing = matchPricing(activeRules, start);
    const price_paise = pricing ? Math.round(Number(pricing.pricePerSlot) * 100) : 0;
    const matched_pricing_rule_id = pricing?.id ?? null;
    const base: Omit<Slot, 'state'> = {
      start_time: minutesToTime(start),
      end_time: minutesToTime(end),
      price_paise,
      matched_pricing_rule_id,
    };

    // Order matters — first match wins.
    if (closedAllDay) {
      slots.push({ ...base, state: 'CLOSED' });
      continue;
    }
    if (groundMaintenance || overlaps(maintenance, start, end)) {
      slots.push({ ...base, state: 'MAINTENANCE' });
      continue;
    }
    if (overlaps(exceptions, start, end)) {
      slots.push({ ...base, state: 'EXCEPTION' });
      continue;
    }
    if (bookings.has(start)) {
      slots.push({ ...base, state: 'BOOKED' });
      continue;
    }
    const session = sessions.find((s) => s.start === start);
    if (session) {
      slots.push({ ...base, state: 'HELD', held_until: session.heldUntil });
      continue;
    }
    if (end <= nowMinInDate) {
      slots.push({ ...base, state: 'PAST' });
      continue;
    }
    if (start < minNoticeCutoff) {
      slots.push({ ...base, state: 'MIN_NOTICE' });
      continue;
    }
    slots.push({ ...base, state: 'AVAILABLE' });
  }
  return slots;
}

function matchPricing(rules: PricingRule[], slotStart: number): PricingRule | null {
  for (const r of rules) {
    const s = timeToMinutes(fmtTime(r.startTime));
    const e = timeToMinutes(fmtTime(r.endTime));
    if (slotStart >= s && slotStart < e) return r;
  }
  return null;
}

function withinEffective(rule: PricingRule, now: Date): boolean {
  if (rule.effectiveFrom && now < rule.effectiveFrom) return false;
  if (rule.effectiveTo && now > rule.effectiveTo) return false;
  return true;
}

function overlaps(ranges: Array<{ start: number; end: number }>, s: number, e: number): boolean {
  return ranges.some((r) => r.start < e && r.end > s);
}

function indexByStartMinute(ranges: Array<{ start: number; end: number }>): Set<number> {
  return new Set(ranges.map((r) => r.start));
}

// ── date helpers ──

function dayOfWeek(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00+05:30`);
  // JS: Sunday=0..Saturday=6. Spec: Mon=1..Sun=7.
  return ((d.getUTCDay() + 6) % 7) + 1;
}

function timeToMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fmtTime(t: Date): string {
  return t.toISOString().slice(11, 16);
}

function sameDate(d: Date, dateStr: string): boolean {
  return d.toISOString().slice(0, 10) === dateStr;
}

function overlapsDate(start: Date, end: Date, dateStr: string): boolean {
  const dayStart = new Date(`${dateStr}T00:00:00+05:30`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  return start.getTime() < dayEnd && end.getTime() > dayStart;
}

// Convert a datetime to minutes-since-midnight IST for the given date.
// Clamps to [0, 1440] so a maintenance block that starts the day before
// still reads as "starts at 00:00 on this date".
function minutesFromDatetime(dt: Date, dateStr: string): number {
  const dayStart = new Date(`${dateStr}T00:00:00+05:30`).getTime();
  const min = Math.floor((dt.getTime() - dayStart) / 60000);
  return Math.min(1440, Math.max(0, min));
}

function minutesFromNowInDate(now: Date, dateStr: string): number {
  const dayStart = new Date(`${dateStr}T00:00:00+05:30`).getTime();
  const diff = Math.floor((now.getTime() - dayStart) / 60000);
  if (diff < 0) return -1; // future date — nothing is past yet
  if (diff > 1440) return Number.POSITIVE_INFINITY; // past date — everything is past
  return diff;
}
