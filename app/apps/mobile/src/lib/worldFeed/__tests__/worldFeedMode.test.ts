// FR-FEED-020 AC2 — the מחפש / מציע toggle: a seeker sees offers and publishes requests, an
// offerer sees requests and publishes offers.
import { describe, expect, it } from 'vitest';
import type { MarketplaceBrowseRow } from '@kc/domain';
import {
  DEFAULT_WORLD_FEED_MODE,
  feedDirectionFor,
  publishDirectionFor,
  rowsForMode,
} from '../worldFeedMode';

const row = (listingId: string, direction: 'give' | 'request'): MarketplaceBrowseRow => ({
  listingId,
  worldSlug: 'food',
  kindSlug: direction === 'give' ? 'give_food' : 'request_food',
  direction,
  title: listingId,
  summary: null,
  urgencyLevel: 2,
  availabilityStatus: 'ongoing',
  cityId: null,
  distanceKm: null,
});

describe('world feed mode', () => {
  it('opens as a seeker', () => {
    expect(DEFAULT_WORLD_FEED_MODE).toBe('seeker');
  });

  it('a seeker sees offers and publishes a request', () => {
    expect(feedDirectionFor('seeker')).toBe('give');
    expect(publishDirectionFor('seeker')).toBe('request');
  });

  it('an offerer sees requests and publishes an offer', () => {
    expect(feedDirectionFor('offerer')).toBe('request');
    expect(publishDirectionFor('offerer')).toBe('give');
  });

  it('narrows mixed search results to the mode direction, keeping order', () => {
    const rows = [row('a', 'give'), row('b', 'request'), row('c', 'give')];
    expect(rowsForMode(rows, 'seeker').map((r) => r.listingId)).toEqual(['a', 'c']);
    expect(rowsForMode(rows, 'offerer').map((r) => r.listingId)).toEqual(['b']);
    expect(rowsForMode([], 'seeker')).toEqual([]);
  });
});
