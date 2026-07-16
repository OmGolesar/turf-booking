// Standalone assert-based sanity check for the pure logic bits of Slice E.
// Run: `npx ts-node src/modules/booking/partner-booking.check.ts`
// No frameworks; no DB; only exercises deterministic helpers + the state
// machine that gates check-in / no-show / complete.

import assert from 'node:assert/strict';
import { BookingStatus } from '@prisma/client';
import { __internals } from './partner-booking.service';

const { wallClock, fmtTime, isoDate, shortName, groupByDate, overlapsDay } = __internals;

const CHECK_IN_LEAD_MS = 30 * 60_000;
const NO_SHOW_LAG_MS = 30 * 60_000;

// Prisma renders Time(6) columns as Date at 1970-01-01T{HH:MM:SS}Z.
const TIME = (hm: string) => new Date(`1970-01-01T${hm}:00Z`);
const DATE = (d: string) => new Date(`${d}T00:00:00Z`);

// ── fmtTime / isoDate ─────────────────────────────────────────────────
assert.equal(fmtTime(TIME('18:00')), '18:00');
assert.equal(fmtTime(TIME('06:05')), '06:05');
assert.equal(isoDate(DATE('2026-07-16')), '2026-07-16');

// ── wallClock joins date + time in IST ────────────────────────────────
const wc = wallClock(DATE('2026-07-16'), TIME('18:00'));
assert.equal(wc.toISOString(), '2026-07-16T12:30:00.000Z'); // 18:00 IST → 12:30 UTC

// ── shortName ─────────────────────────────────────────────────────────
assert.equal(shortName({ firstName: 'Aditya', lastName: 'Sharma' }), 'Aditya S.');
assert.equal(shortName({ firstName: 'Ramesh', lastName: null }), 'Ramesh');
assert.equal(shortName({ firstName: 'Priya', lastName: '   ' }), 'Priya');
assert.equal(shortName(null), 'Customer');

// ── groupByDate ───────────────────────────────────────────────────────
const grouped = groupByDate(
  [{ d: 'a' }, { d: 'b' }, { d: 'a' }],
  (x) => x.d,
);
assert.equal(grouped.get('a')?.length, 2);
assert.equal(grouped.get('b')?.length, 1);

// ── overlapsDay ───────────────────────────────────────────────────────
// Maintenance 18:00–19:00 IST overlaps the 18:00 slot, not the 17:00 slot.
const mStart = new Date('2026-07-16T12:30:00Z'); // 18:00 IST
const mEnd = new Date('2026-07-16T13:30:00Z');   // 19:00 IST
assert.equal(overlapsDay(mStart, mEnd, '2026-07-16', '18:00', '19:00'), true);
assert.equal(overlapsDay(mStart, mEnd, '2026-07-16', '17:00', '18:00'), false);
assert.equal(overlapsDay(mStart, mEnd, '2026-07-16', '19:00', '20:00'), false);

// ── Check-in window: [start - 30 min, end] ────────────────────────────
function inCheckIn(nowISO: string, date: string, start: string, end: string): boolean {
  const now = new Date(nowISO);
  const s = wallClock(DATE(date), TIME(start));
  const e = wallClock(DATE(date), TIME(end));
  return now.getTime() >= s.getTime() - CHECK_IN_LEAD_MS && now <= e;
}
// Slot: 2026-07-16 18:00–19:00 IST → 12:30–13:30 UTC
assert.equal(inCheckIn('2026-07-16T11:59:00Z', '2026-07-16', '18:00', '19:00'), false, 'earlier than -30min');
assert.equal(inCheckIn('2026-07-16T12:00:00Z', '2026-07-16', '18:00', '19:00'), true,  'exactly -30min boundary');
assert.equal(inCheckIn('2026-07-16T13:00:00Z', '2026-07-16', '18:00', '19:00'), true,  'mid-slot');
assert.equal(inCheckIn('2026-07-16T13:30:00Z', '2026-07-16', '18:00', '19:00'), true,  'exactly end');
assert.equal(inCheckIn('2026-07-16T13:30:01Z', '2026-07-16', '18:00', '19:00'), false, 'after end');

// ── No-show window: after start + 30 min ──────────────────────────────
function canMarkNoShow(nowISO: string, date: string, start: string): boolean {
  const now = new Date(nowISO);
  const s = wallClock(DATE(date), TIME(start));
  return now.getTime() >= s.getTime() + NO_SHOW_LAG_MS;
}
assert.equal(canMarkNoShow('2026-07-16T12:59:59Z', '2026-07-16', '18:00'), false, 'before +30');
assert.equal(canMarkNoShow('2026-07-16T13:00:00Z', '2026-07-16', '18:00'), true,  'exactly +30');
assert.equal(canMarkNoShow('2026-07-16T15:00:00Z', '2026-07-16', '18:00'), true,  'well after');

// ── Transition state machine ──────────────────────────────────────────
// Mirrors the `allowedFrom` sets used inside PartnerBookingService.
const ALLOWED: Record<string, BookingStatus[]> = {
  CHECK_IN: [BookingStatus.CONFIRMED],
  COMPLETE: [BookingStatus.CHECKED_IN],
  NO_SHOW: [BookingStatus.CONFIRMED],
  PARTNER_CANCEL: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN],
};
for (const s of Object.values(BookingStatus)) {
  const canCheckIn = ALLOWED.CHECK_IN.includes(s);
  assert.equal(canCheckIn, s === BookingStatus.CONFIRMED);
  const canComplete = ALLOWED.COMPLETE.includes(s);
  assert.equal(canComplete, s === BookingStatus.CHECKED_IN);
  const canNoShow = ALLOWED.NO_SHOW.includes(s);
  assert.equal(canNoShow, s === BookingStatus.CONFIRMED);
  const canPartnerCancel = ALLOWED.PARTNER_CANCEL.includes(s);
  assert.equal(
    canPartnerCancel,
    s === BookingStatus.CONFIRMED || s === BookingStatus.CHECKED_IN,
  );
}

// ── Calendar range validation (1..31 days inclusive) ──────────────────
function calendarDays(from: string, to: string): number {
  const f = new Date(`${from}T00:00:00+05:30`);
  const t = new Date(`${to}T00:00:00+05:30`);
  return Math.floor((t.getTime() - f.getTime()) / 86_400_000) + 1;
}
assert.equal(calendarDays('2026-07-16', '2026-07-16'), 1);
assert.equal(calendarDays('2026-07-16', '2026-07-22'), 7);
assert.equal(calendarDays('2026-07-01', '2026-07-31'), 31);
assert.equal(calendarDays('2026-07-16', '2026-07-15'), 0); // invalid, rejected upstream
assert.equal(calendarDays('2026-07-01', '2026-08-01'), 32); // rejected upstream

// eslint-disable-next-line no-console
console.log('✅ partner-booking self-check: all assertions passed');
