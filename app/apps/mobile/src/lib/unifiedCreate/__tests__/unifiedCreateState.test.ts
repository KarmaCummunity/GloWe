// FR-POST-001 AC1 / AC6 — direction ↔ post type, and the remembered category + direction
// that the form reopens on (parsed defensively from device storage).
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CREATE_PREFERENCES,
  directionToPostType,
  parseCreatePreferences,
  postTypeToDirection,
  serializeCreatePreferences,
} from '../unifiedCreateState';

describe('unified create — direction mapping', () => {
  it('maps direction <-> post type', () => {
    expect(directionToPostType('give')).toBe('Give');
    expect(directionToPostType('request')).toBe('Request');
    expect(postTypeToDirection('Give')).toBe('give');
    expect(postTypeToDirection('Request')).toBe('request');
  });
});

describe('unified create — remembered preferences', () => {
  it('defaults to items + offer when nothing is stored', () => {
    expect(DEFAULT_CREATE_PREFERENCES).toEqual({ categoryId: 'items', direction: 'give' });
    expect(parseCreatePreferences(null)).toEqual(DEFAULT_CREATE_PREFERENCES);
    expect(parseCreatePreferences(undefined)).toEqual(DEFAULT_CREATE_PREFERENCES);
    expect(parseCreatePreferences('')).toEqual(DEFAULT_CREATE_PREFERENCES);
  });

  it('round-trips the last used category and direction', () => {
    const prefs = { categoryId: 'rides', direction: 'request' } as const;
    expect(parseCreatePreferences(serializeCreatePreferences(prefs))).toEqual(prefs);
  });

  it('survives corrupt or non-object JSON', () => {
    expect(parseCreatePreferences('{not json')).toEqual(DEFAULT_CREATE_PREFERENCES);
    expect(parseCreatePreferences('null')).toEqual(DEFAULT_CREATE_PREFERENCES);
    expect(parseCreatePreferences('"rides"')).toEqual(DEFAULT_CREATE_PREFERENCES);
  });

  it('falls back field by field: a removed category keeps the stored direction', () => {
    expect(parseCreatePreferences('{"categoryId":"general","direction":"request"}')).toEqual({
      categoryId: 'items',
      direction: 'request',
    });
    expect(parseCreatePreferences('{"categoryId":"food","direction":"sideways"}')).toEqual({
      categoryId: 'food',
      direction: 'give',
    });
  });
});
