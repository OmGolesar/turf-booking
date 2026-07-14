// IST helpers. Every booking-window field is IST-scoped per Part 3.0 §14.
// We keep this tiny and dep-free: JS built-ins are enough for a fixed-offset
// timezone (Asia/Kolkata has no DST).

export const IST_OFFSET_MINUTES = 330; // +05:30

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

// Current wall-clock instant, unchanged (Date is always UTC epoch internally).
// Callers should use formatIstIso() to see the IST view.
export function nowIst(): Date {
  return new Date();
}

// 'YYYY-MM-DD' → Date representing 00:00:00 IST on that day (as UTC epoch).
export function parseIstDate(str: string): Date {
  if (!DATE_RE.test(str)) throw new Error(`Invalid IST date "${str}"; expected YYYY-MM-DD`);
  return new Date(`${str}T00:00:00+05:30`);
}

// 'YYYY-MM-DD' + 'HH:mm[:ss]' → Date at that IST wall-clock time.
export function parseIstDateTime(date: string, time: string): Date {
  if (!TIME_RE.test(time)) throw new Error(`Invalid IST time "${time}"; expected HH:mm or HH:mm:ss`);
  const normalized = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${normalized}+05:30`);
}

// Formats a Date as ISO-8601 with the +05:30 offset ("2026-01-15T15:04:12.123+05:30").
export function formatIstIso(d: Date): string {
  const shifted = new Date(d.getTime() + IST_OFFSET_MINUTES * 60_000);
  const s = shifted.toISOString(); // ...Z at IST wall clock
  return `${s.slice(0, -1)}+05:30`;
}

// IST-scoped 'YYYY-MM-DD' string for a Date.
export function toIstDateString(d: Date): string {
  return formatIstIso(d).slice(0, 10);
}
