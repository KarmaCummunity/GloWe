import { describe, expect, it } from 'vitest';
import {
  RIDE_ROUTE_DETAIL_KEYS,
  mapMarketplaceServerError,
  validateKnowledgeSlot,
  validateMarketplaceWorldRules,
  validateRideDetails,
  withRideEndpoint,
} from '../marketplaceWorldRules';

const now = new Date('2026-10-17T10:00:00Z');
const route = { origin_lat: 32.08, origin_lng: 34.78, dest_lat: 31.77, dest_lng: 35.21 };

describe('validateRideDetails', () => {
  it('requires both route ends', () => {
    expect(validateRideDetails({ departs_at: '2026-10-18T08:00:00Z' }, now)).toBe('ride_route_required');
    expect(
      validateRideDetails({ origin_lat: 32, origin_lng: 34, departs_at: '2026-10-18T08:00:00Z' }, now),
    ).toBe('ride_route_required');
    expect(validateRideDetails({ ...route, origin_lat: '32', departs_at: '2026-10-18T08:00:00Z' }, now)).toBe(
      'ride_route_required',
    );
  });
  it('requires a future departure', () => {
    expect(validateRideDetails({ ...route }, now)).toBe('ride_departure_past');
    expect(validateRideDetails({ ...route, departs_at: '2026-10-17T09:00:00Z' }, now)).toBe('ride_departure_past');
  });
  it('passes a complete future ride', () => {
    expect(validateRideDetails({ ...route, departs_at: '2026-10-17T12:00:00Z' }, now)).toBeNull();
  });
  it('is applied by validateMarketplaceWorldRules for rides', () => {
    expect(validateMarketplaceWorldRules({ worldSlug: 'rides', details: {}, photoCount: 0, now })).toBe(
      'ride_route_required',
    );
    expect(
      validateMarketplaceWorldRules({
        worldSlug: 'rides', details: { ...route, departs_at: '2026-10-17T12:00:00Z' }, photoCount: 0, now,
      }),
    ).toBeNull();
  });
});

describe('validateKnowledgeSlot', () => {
  it('ignores listings without slot fields (e.g. mentorship requests)', () => {
    expect(validateKnowledgeSlot({ topic: 'Math' }, now)).toBeNull();
  });
  it('rejects past starts and end before start', () => {
    expect(
      validateKnowledgeSlot({ slot_starts_at: '2026-10-17T09:00:00Z', slot_ends_at: '2026-10-17T11:00:00Z' }, now),
    ).toBe('knowledge_slot_invalid');
    expect(
      validateKnowledgeSlot({ slot_starts_at: '2026-10-17T12:00:00Z', slot_ends_at: '2026-10-17T11:00:00Z' }, now),
    ).toBe('knowledge_slot_invalid');
    expect(validateKnowledgeSlot({ slot_starts_at: '2026-10-17T12:00:00Z' }, now)).toBe('knowledge_slot_invalid');
  });
  it('passes a valid future slot via validateMarketplaceWorldRules', () => {
    expect(
      validateMarketplaceWorldRules({
        worldSlug: 'knowledge',
        details: { slot_starts_at: '2026-10-17T12:00:00Z', slot_ends_at: '2026-10-17T13:00:00Z' },
        photoCount: 0,
        now,
      }),
    ).toBeNull();
  });
});

describe('withRideEndpoint', () => {
  it('writes and clears one route end without touching the other', () => {
    const withOrigin = withRideEndpoint({ seats_available: 2 }, 'origin', {
      cityId: '5000', label: 'Tel Aviv', lat: 32.08, lng: 34.78,
    });
    expect(withOrigin).toEqual({
      seats_available: 2, origin_label: 'Tel Aviv', origin_lat: 32.08, origin_lng: 34.78, origin_city_id: '5000',
    });
    const both = withRideEndpoint(withOrigin, 'dest', { cityId: '3000', label: 'Jerusalem', lat: 31.77, lng: 35.21 });
    expect(both.dest_lat).toBe(31.77);
    expect(both.origin_lat).toBe(32.08);
    const cleared = withRideEndpoint(both, 'origin', null);
    expect(cleared.origin_lat).toBeUndefined();
    expect(cleared.dest_label).toBe('Jerusalem');
  });
  it('route keys cover every field the picker writes', () => {
    const out = withRideEndpoint({}, 'dest', { cityId: 'x', label: 'y', lat: 1, lng: 2 });
    for (const k of Object.keys(out)) expect(RIDE_ROUTE_DETAIL_KEYS).toContain(k);
  });
});

describe('booking error codes', () => {
  it('maps server booking errors', () => {
    expect(mapMarketplaceServerError({ code: 'P0001', message: 'seats_exhausted' })).toBe('seats_exhausted');
    expect(mapMarketplaceServerError({ message: 'slots_exhausted' })).toBe('slots_exhausted');
    expect(mapMarketplaceServerError({ code: '23505', message: 'already_booked' })).toBe('already_booked');
    expect(mapMarketplaceServerError({ message: 'ride_departed' })).toBe('ride_departed');
    expect(mapMarketplaceServerError({ message: 'session_not_started' })).toBe('session_not_started');
  });
});
