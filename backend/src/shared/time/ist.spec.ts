import { formatIstIso, parseIstDate, parseIstDateTime, toIstDateString } from './ist';

describe('IST helpers', () => {
  describe('parseIstDate', () => {
    it('parses YYYY-MM-DD as 00:00 IST', () => {
      // 2026-01-15 00:00 IST == 2026-01-14 18:30 UTC
      expect(parseIstDate('2026-01-15').toISOString()).toBe('2026-01-14T18:30:00.000Z');
    });
    it('rejects malformed input', () => {
      expect(() => parseIstDate('2026-1-1')).toThrow();
      expect(() => parseIstDate('15-01-2026')).toThrow();
      expect(() => parseIstDate('')).toThrow();
    });
  });

  describe('parseIstDateTime', () => {
    it('parses HH:mm at IST wall clock', () => {
      // 09:00 IST == 03:30 UTC
      expect(parseIstDateTime('2026-01-15', '09:00').toISOString()).toBe('2026-01-15T03:30:00.000Z');
    });
    it('accepts HH:mm:ss', () => {
      expect(parseIstDateTime('2026-01-15', '09:00:30').toISOString()).toBe('2026-01-15T03:30:30.000Z');
    });
    it('rejects malformed time', () => {
      expect(() => parseIstDateTime('2026-01-15', '9:00')).toThrow();
      expect(() => parseIstDateTime('2026-01-15', '25:00')).toThrow();
    });
  });

  describe('formatIstIso', () => {
    it('renders +05:30 offset', () => {
      const d = new Date('2026-01-15T03:30:00.000Z'); // 09:00 IST
      expect(formatIstIso(d)).toBe('2026-01-15T09:00:00.000+05:30');
    });
  });

  describe('toIstDateString', () => {
    it('returns the IST calendar date even across the UTC boundary', () => {
      // 2026-01-14 19:00 UTC == 2026-01-15 00:30 IST → IST date is the 15th.
      expect(toIstDateString(new Date('2026-01-14T19:00:00.000Z'))).toBe('2026-01-15');
    });
  });
});
