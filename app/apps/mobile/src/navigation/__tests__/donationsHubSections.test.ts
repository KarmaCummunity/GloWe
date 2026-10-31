// D62 (docs/spec/04_product_structure.md): the Donations tab has a screen for
// every giving world and every domain — world tiles are exactly the 8 worlds
// (no domains mixed in), and the 11 domains have their own tiles.
import { describe, expect, it } from 'vitest';
import { DOMAIN_SLUGS, GIVING_WORLD_SLUGS } from '@kc/domain';
import { DONATIONS_HUB_DOMAIN_TILES, hubWorldSlugs } from '../donationsHubTiles';

describe('Donations hub sections', () => {
  it('shows one tile per giving world, and no domain among them', () => {
    expect([...hubWorldSlugs()].sort()).toEqual([...GIVING_WORLD_SLUGS].sort());
  });

  it('shows one tile per domain, each opening its own domain screen', () => {
    expect(DONATIONS_HUB_DOMAIN_TILES.map((t) => t.key).sort()).toEqual([...DOMAIN_SLUGS].sort());
    for (const tile of DONATIONS_HUB_DOMAIN_TILES) {
      expect(tile.href).toBe(`/(tabs)/donations/domain/${tile.key}`);
    }
  });
});
