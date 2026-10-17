import { describe, expect, it } from 'vitest';
import { marketplaceRuleFieldError, marketplaceServerErrorKey } from '../marketplaceCreateErrors';

describe('marketplaceServerErrorKey', () => {
  it('maps known server codes to marketplace.errors.<code>', () => {
    expect(marketplaceServerErrorKey({ code: '23514', message: 'items_image_required' })).toBe(
      'marketplace.errors.items_image_required',
    );
    expect(marketplaceServerErrorKey({ message: 'food_expiry_required' })).toBe(
      'marketplace.errors.food_expiry_required',
    );
  });
  it('falls back to generic for unknown errors', () => {
    expect(marketplaceServerErrorKey(new Error('fetch failed'))).toBe('marketplace.errors.generic');
    expect(marketplaceServerErrorKey(undefined)).toBe('marketplace.errors.generic');
  });
});

describe('marketplaceRuleFieldError', () => {
  it('items without photos → inline photos error', () => {
    expect(marketplaceRuleFieldError({ worldSlug: 'items', details: {}, photoCount: 0 })).toEqual({
      code: 'items_image_required',
      field: 'photos',
      key: 'marketplace.errors.items_image_required',
    });
    expect(marketplaceRuleFieldError({ worldSlug: 'items', details: {}, photoCount: 2 })).toBeNull();
  });
  it('food without expiry → inline details error', () => {
    expect(marketplaceRuleFieldError({ worldSlug: 'food', details: {}, photoCount: 0 })?.field).toBe('details');
  });
  it('routed worlds → world-level error', () => {
    expect(marketplaceRuleFieldError({ worldSlug: 'medical', details: {}, photoCount: 0 })?.field).toBe('world');
  });
});
