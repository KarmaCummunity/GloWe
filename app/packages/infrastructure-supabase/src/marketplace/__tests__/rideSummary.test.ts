import { describe, expect, it } from 'vitest';
import { rideSummaryFromDetails } from '../marketplacePaging';

describe('rideSummaryFromDetails', () => {
  it('maps offer details', () => {
    expect(rideSummaryFromDetails({ origin_label: 'תל אביב', dest_label: 'חיפה', departs_at: '2026-11-01T08:00:00Z', seats_available: 3 }))
      .toEqual({ originLabel: 'תל אביב', destLabel: 'חיפה', departsAt: '2026-11-01T08:00:00Z', seats: 3 });
  });
  it('falls back to passengers and nulls', () => {
    expect(rideSummaryFromDetails({ passengers: 2 })).toEqual({ originLabel: null, destLabel: null, departsAt: null, seats: 2 });
    expect(rideSummaryFromDetails(null)).toBeNull();
  });
});

import { attachRideSummaries } from '../marketplacePaging';
import type { MarketplaceBrowseRow } from '@kc/domain';

const row = (id: string, worldSlug: string): MarketplaceBrowseRow => ({
  listingId: id, worldSlug, kindSlug: 'k', direction: 'give', title: 't', summary: null,
  urgencyLevel: 0, availabilityStatus: 'open', cityId: null, distanceKm: null,
});
function client(result: unknown) {
  return { from: () => ({ select: () => ({ in: () => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)) }) }) } as never;
}

describe('attachRideSummaries', () => {
  it('skips when there are no rides', async () => {
    const rows = [row('a', 'items')];
    expect(await attachRideSummaries(client({ data: [], error: null }), rows)).toBe(rows);
  });
  it('attaches ride info by id', async () => {
    const out = await attachRideSummaries(
      client({ data: [{ listing_id: 'r', details: { origin_label: 'A', dest_label: 'B', seats_available: 2 } }], error: null }),
      [row('r', 'rides'), row('x', 'food')],
    );
    expect(out[0]?.ride).toEqual({ originLabel: 'A', destLabel: 'B', departsAt: null, seats: 2 });
    expect(out[1]?.ride).toBeUndefined();
  });
  it('returns rows unchanged on error or throw', async () => {
    const rows = [row('r', 'rides')];
    expect(await attachRideSummaries(client({ data: null, error: { message: 'x' } }), rows)).toBe(rows);
    expect(await attachRideSummaries(client(new Error('boom')), rows)).toBe(rows);
    expect(await attachRideSummaries(client({ data: null, error: null }), rows)).toBe(rows);
  });
});
