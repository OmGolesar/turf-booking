// Opaque base64 cursor. Encodes whatever fields the caller uses to page —
// typically { id, createdAt } for keyset pagination. Clients MUST NOT parse.

export function encodeCursor(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor<T extends Record<string, unknown>>(cursor: string): T {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as T;
  } catch {
    throw new Error('Invalid cursor');
  }
}
