import { describe, expect, it } from 'vitest';
import { MARKETPLACE_CREATE_WORLD_SLUGS, ROUTED_WORLDS } from '@kc/domain';
import {
  CREATE_CATEGORIES,
  GENERAL_CREATE_CATEGORY,
  SHARED_CREATE_FIELDS,
  createFieldsFor,
  createRouteFor,
  findCreateCategory,
  hasCreateField,
  visibleCreateCategories,
} from '../createCategories';
// eslint-disable-next-line no-restricted-imports -- test asserts every category label key exists in the Hebrew bundle
import he from '../../../i18n/locales/he';

function resolveKey(bundle: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], bundle);
}

describe('unified create — category config', () => {
  it('every create domain (general + all marketplace worlds) is in the config', () => {
    const ids = CREATE_CATEGORIES.map((c) => c.id);
    expect(ids).toContain(GENERAL_CREATE_CATEGORY);
    for (const slug of MARKETPLACE_CREATE_WORLD_SLUGS) expect(ids).toContain(slug);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(CREATE_CATEGORIES.map((c) => [c.id, c] as const))(
    '%s renders shared fields + its own fields with a Hebrew label',
    (_id, c) => {
      for (const d of ['give', 'request'] as const) {
        const fields = createFieldsFor(c, d);
        for (const f of SHARED_CREATE_FIELDS) expect(fields).toContain(f);
        expect(fields.length).toBeGreaterThan(SHARED_CREATE_FIELDS.length);
      }
      expect(typeof resolveKey(he, c.labelKey)).toBe('string');
    },
  );

  it('listing categories carry their world and adapt fields per world', () => {
    for (const c of CREATE_CATEGORIES.filter((x) => x.engine === 'listing')) {
      expect(c.worldSlug).toBe(c.id);
      expect(hasCreateField(c, 'give', 'listingDetails')).toBe(true);
      expect(hasCreateField(c, 'give', 'rideRoute')).toBe(c.id === 'rides');
      expect(hasCreateField(c, 'give', 'externalBody')).toBe(
        (ROUTED_WORLDS as readonly string[]).includes(c.id),
      );
    }
  });

  it('items and food offer a world subcategory on both directions; other worlds do not (KC#1296)', () => {
    for (const c of CREATE_CATEGORIES.filter((x) => x.engine === 'listing')) {
      const expected = c.id === 'items' || c.id === 'food';
      expect(hasCreateField(c, 'give', 'worldSubcategory')).toBe(expected);
      expect(hasCreateField(c, 'request', 'worldSubcategory')).toBe(expected);
    }
    expect(hasCreateField(findCreateCategory(GENERAL_CREATE_CATEGORY), 'give', 'worldSubcategory')).toBe(false);
  });

  it('general post fields adapt to give/request', () => {
    const g = findCreateCategory(GENERAL_CREATE_CATEGORY);
    expect(g.engine).toBe('post');
    expect(hasCreateField(g, 'give', 'condition')).toBe(true);
    expect(hasCreateField(g, 'give', 'urgency')).toBe(false);
    expect(hasCreateField(g, 'request', 'urgency')).toBe(true);
    expect(hasCreateField(g, 'request', 'estimatedValue')).toBe(false);
  });

  it('unknown category falls back to general', () => {
    expect(findCreateCategory('nope').id).toBe(GENERAL_CREATE_CATEGORY);
    expect(findCreateCategory(undefined).id).toBe(GENERAL_CREATE_CATEGORY);
  });

  it('picker hides worlds whose launch flag is off, never general', () => {
    const visible = visibleCreateCategories((slug) => slug === 'food');
    expect(visible.map((c) => c.id)).toEqual([GENERAL_CREATE_CATEGORY, 'food']);
  });

  it('every entry point uses one route, preselecting the category', () => {
    expect(createRouteFor()).toBe('/(tabs)/create');
    expect(createRouteFor(null)).toBe('/(tabs)/create');
    expect(createRouteFor(GENERAL_CREATE_CATEGORY)).toBe('/(tabs)/create');
    expect(createRouteFor('rides')).toBe('/(tabs)/create?category=rides');
  });
});
