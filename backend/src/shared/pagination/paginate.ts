import { encodeCursor, decodeCursor } from './cursor';
import type { PaginationMeta } from '../response/envelope';

export interface CursorPageArgs {
  cursor?: string | null;
  limit?: number;
}

export interface CursorPageResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Fetches limit+1 rows via caller-supplied fetcher; the extra row tells us
// whether there's another page without a second count query. `nextCursor` is
// built from the last-returned row via `buildCursor(lastRow)`.
export async function paginate<T, C extends Record<string, unknown>>(
  args: CursorPageArgs,
  fetch: (params: { limit: number; cursor: C | null }) => Promise<T[]>,
  buildCursor: (row: T) => C,
): Promise<CursorPageResult<T>> {
  const limit = clampLimit(args.limit);
  const decoded = args.cursor ? decodeCursor<C>(args.cursor) : null;
  const rows = await fetch({ limit: limit + 1, cursor: decoded });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = page[page.length - 1];
  const nextCursor = hasMore && lastRow ? encodeCursor(buildCursor(lastRow)) : null;
  return {
    data: page,
    pagination: { cursor: args.cursor ?? null, next_cursor: nextCursor, has_more: hasMore, total: null },
  };
}

function clampLimit(raw: number | undefined): number {
  const n = Number(raw ?? 20);
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(100, Math.floor(n));
}
