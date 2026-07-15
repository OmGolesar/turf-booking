import type { PricingRule } from '@prisma/client';

// Time helpers shared with slot-generator. Kept local so booking flow doesn't
// depend on availability internals.
export function toMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}
export function timeColToMinutes(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
export function dayOfWeekIst(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00+05:30`);
  return ((d.getUTCDay() + 6) % 7) + 1;
}

export interface PricedSlot {
  price_rupees: number;
  price_paise: number;
  matched_rule_id: string;
}

// Highest-priority active rule whose window covers the slot start.
// Booking flow needs an authoritative price, so this is called fresh — no cache.
export function resolvePrice(
  rules: PricingRule[],
  date: string,
  startTime: string,
  now: Date,
): PricedSlot | null {
  const day = dayOfWeekIst(date);
  const startMin = toMinutes(startTime);

  const candidates = rules
    .filter((r) => r.active)
    .filter((r) => r.dayOfWeek == null || r.dayOfWeek === day)
    .filter((r) => (r.effectiveFrom ? now >= r.effectiveFrom : true))
    .filter((r) => (r.effectiveTo ? now <= r.effectiveTo : true))
    .filter((r) => {
      const s = timeColToMinutes(r.startTime);
      const e = timeColToMinutes(r.endTime);
      return startMin >= s && startMin < e;
    })
    .sort((a, b) => b.priority - a.priority);

  const match = candidates[0];
  if (!match) return null;
  const rupees = Number(match.pricePerSlot);
  return {
    price_rupees: rupees,
    price_paise: Math.round(rupees * 100),
    matched_rule_id: match.id,
  };
}
