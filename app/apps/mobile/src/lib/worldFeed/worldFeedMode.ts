// Mapped to spec: FR-FEED-020 AC2 · docs/spec/04 "World hub template" block 1 (PM decision
// 2026-11-01). Pure rules of a world screen's seeker / offerer toggle: what the feed lists and what
// the publish button creates in each mode.
import type { MarketplaceBrowseRow } from '@kc/domain';
import type { CreateDirection } from '../unifiedCreate/createCategories';

/** A *seeker* looks for what others offer; an *offerer* looks for what others need. */
export type WorldFeedMode = 'seeker' | 'offerer';

export const DEFAULT_WORLD_FEED_MODE: WorldFeedMode = 'seeker';

/** Listings the feed shows: a seeker sees offers, an offerer sees requests. */
export function feedDirectionFor(mode: WorldFeedMode): CreateDirection {
  return mode === 'seeker' ? 'give' : 'request';
}

/** What the publish button creates: a seeker publishes a request, an offerer an offer. */
export function publishDirectionFor(mode: WorldFeedMode): CreateDirection {
  return mode === 'seeker' ? 'request' : 'give';
}

/**
 * Keeps the rows of the mode's direction. Search results span both directions (the search
 * RPC has no direction filter), so the screen narrows them here; browse rows already match.
 */
export function rowsForMode(rows: readonly MarketplaceBrowseRow[], mode: WorldFeedMode): MarketplaceBrowseRow[] {
  const direction = feedDirectionFor(mode);
  return rows.filter((row) => row.direction === direction);
}
