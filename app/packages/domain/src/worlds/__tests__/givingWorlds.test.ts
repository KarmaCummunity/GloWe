// D45 / D62 (docs/spec/04_product_structure.md): the code holds one list of the
// 8 giving worlds and one list of the 11 domains, exactly as the project book.
import { describe, expect, it } from 'vitest';
import { DOMAIN_SLUGS, GIVING_WORLD_SLUGS, isDomainSlug, isGivingWorldSlug } from '../givingWorlds';

describe('giving worlds and domains (spec 04)', () => {
  it('lists the 8 giving worlds of the project book', () => {
    expect([...GIVING_WORLD_SLUGS].sort()).toEqual(
      ['experiences', 'food', 'housing', 'items', 'knowledge', 'money', 'rides', 'time'].sort(),
    );
  });

  it('lists the 11 domains, with no overlap with worlds', () => {
    expect([...DOMAIN_SLUGS].sort()).toEqual(
      ['animals', 'culture', 'democracy', 'elderly', 'employment', 'environment', 'heritage', 'medical',
        'spirituality', 'sport', 'tech'].sort(),
    );
    expect(GIVING_WORLD_SLUGS.filter((w) => (DOMAIN_SLUGS as readonly string[]).includes(w))).toEqual([]);
  });

  it('classifies slugs, rejecting retired ones like app_design (D18)', () => {
    expect(isGivingWorldSlug('experiences')).toBe(true);
    expect(isDomainSlug('medical')).toBe(true);
    expect(isGivingWorldSlug('medical')).toBe(false);
    expect(isGivingWorldSlug('app_design')).toBe(false);
    expect(isDomainSlug('app_design')).toBe(false);
  });
});
