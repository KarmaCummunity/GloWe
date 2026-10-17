import { describe, expect, it } from 'vitest';
import { MARKETPLACE_CREATE_WORLD_SLUGS, MARKETPLACE_WORLD_SLUGS } from '../MarketplaceTypes';

describe('marketplace world slug catalogs', () => {
  it('create worlds are a subset of browsable worlds', () => {
    expect(MARKETPLACE_WORLD_SLUGS.length).toBeGreaterThan(0);
    for (const slug of MARKETPLACE_CREATE_WORLD_SLUGS) {
      expect(MARKETPLACE_WORLD_SLUGS as readonly string[]).toContain(slug);
    }
  });
});
