// SearchBucket — a page of results plus has-more, without exact counts (0418).
//
// Queries fetch `limit + 1` rows: the extra row only signals that more exist, so no
// `count=exact` (a full RLS scan) is ever needed. `total` is the number of returned items
// ("at least" when hasMore).

export interface SearchBucket<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly hasMore: boolean;
}

/** Trims a `limit + 1` fetch to `limit` and records whether the extra row existed. */
export function toPagedBucket<T>(rows: readonly T[] | null | undefined, limit: number): SearchBucket<T> {
  const all = rows ?? [];
  const hasMore = all.length > limit;
  const items = hasMore ? all.slice(0, limit) : [...all];
  return { items, total: items.length, hasMore };
}

/** Rows fetched for a page of `limit` items (one extra to detect has-more). */
export function pageFetchSize(limit: number): number {
  return Math.max(1, limit) + 1;
}

/** Reorders hydrated rows to match an ordered id list, dropping ids that didn't hydrate. */
export function orderByIds<T>(ids: readonly string[], rows: readonly T[], idOf: (r: T) => string): T[] {
  const byId = new Map(rows.map((r) => [idOf(r), r] as const));
  const out: T[] = [];
  for (const id of ids) {
    const r = byId.get(id);
    if (r) out.push(r);
  }
  return out;
}

export const EMPTY_SEARCH_BUCKET: SearchBucket<never> = { items: [], total: 0, hasMore: false };
