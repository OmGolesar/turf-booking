import { decodeCursor, encodeCursor } from './cursor';

describe('cursor', () => {
  it('round-trips arbitrary payloads', () => {
    const payload = { id: '01HZY...ULID', createdAt: '2026-01-15T09:00:00.000+05:30' };
    expect(decodeCursor(encodeCursor(payload))).toEqual(payload);
  });

  it('produces base64url output (no + / =)', () => {
    const enc = encodeCursor({ id: 'abc?' });
    expect(enc).not.toMatch(/[+/=]/);
  });

  it('throws on malformed cursor', () => {
    expect(() => decodeCursor('not-valid-base64-json!!!')).toThrow('Invalid cursor');
  });
});
