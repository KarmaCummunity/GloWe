import { describe, expect, it } from 'vitest';
import {
  analyticsCitySegment,
  isHubTileLaunchEnabled,
  isMarketplaceWorldLaunchEnabled,
  resolveLaunchWorldEnabled,
} from '../launchWorlds';

describe('launchWorlds', () => {
  it('defaults to items + food on, other worlds off', () => {
    expect(resolveLaunchWorldEnabled('world_items_enabled', undefined)).toBe(true);
    expect(resolveLaunchWorldEnabled('world_food_enabled', undefined)).toBe(true);
    expect(resolveLaunchWorldEnabled('world_rides_enabled', undefined)).toBe(false);
  });

  it('remote flag overrides compiled default', () => {
    expect(resolveLaunchWorldEnabled('world_rides_enabled', { world_rides_enabled: true })).toBe(true);
    expect(resolveLaunchWorldEnabled('world_food_enabled', { world_food_enabled: false })).toBe(false);
  });

  it('maps hub tiles and marketplace slugs', () => {
    expect(isHubTileLaunchEnabled('transport', undefined)).toBe(false);
    expect(isMarketplaceWorldLaunchEnabled('rides', { world_rides_enabled: true })).toBe(true);
  });

  it('segments Lod vs other for analytics', () => {
    expect(analyticsCitySegment('7000')).toBe('lod');
    expect(analyticsCitySegment('5000')).toBe('other');
    expect(analyticsCitySegment(null)).toBe('other');
  });
});
