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
