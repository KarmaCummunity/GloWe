import { describe, expect, it } from 'vitest';
import { CREATE_CATEGORIES, createFieldsFor, findCreateCategory } from '../createCategories';
import {
  directionToPostType,
  initialUnifiedCreateState,
  postTypeToDirection,
  switchCreateCategory,
  type UnifiedCreateShared,
} from '../unifiedCreateState';

describe('unified create — switching category', () => {
  it('keeps shared values and updates the field set', () => {
    let s: UnifiedCreateShared = { ...initialUnifiedCreateState('items'), title: 'ספה', description: 'במצב טוב', direction: 'request' };
    const before = createFieldsFor(findCreateCategory(s.categoryId), s.direction);
    s = switchCreateCategory(s, 'rides');
    expect(s).toMatchObject({ categoryId: 'rides', title: 'ספה', description: 'במצב טוב', direction: 'request' });
    const after = createFieldsFor(findCreateCategory(s.categoryId), s.direction);
    expect(after).toContain('rideRoute');
    expect(before).not.toContain('rideRoute');
  });

  it('round-trips through every category without losing shared values', () => {
    let s = { ...initialUnifiedCreateState(), title: 't', description: 'd' };
    for (const c of CREATE_CATEGORIES) {
      s = switchCreateCategory(s, c.id);
      expect(s.categoryId).toBe(c.id);
      expect([s.title, s.description]).toEqual(['t', 'd']);
    }
  });

  it('preselects from a deep-link category, defaulting to general', () => {
    expect(initialUnifiedCreateState('food').categoryId).toBe('food');
    expect(initialUnifiedCreateState('bogus').categoryId).toBe('general');
  });

  it('maps direction <-> post type', () => {
    expect(directionToPostType('give')).toBe('Give');
    expect(directionToPostType('request')).toBe('Request');
    expect(postTypeToDirection('Give')).toBe('give');
    expect(postTypeToDirection('Request')).toBe('request');
  });
});
