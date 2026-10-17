import { describe, expect, it } from 'vitest';
import { marketplaceRuleFieldError, marketplaceServerErrorKey } from '../marketplaceCreateErrors';

describe('marketplaceServerErrorKey', () => {
  it('maps known server codes to marketplace.errors.<code>', () => {
    expect(marketplaceServerErrorKey({ code: '23514', message: 'money_active_campaign_cap' })).toBe(
      'marketplace.errors.money_active_campaign_cap',
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
  it('items without photos → no error (photos are optional)', () => {
    expect(marketplaceRuleFieldError({ worldSlug: 'items', details: {}, photoCount: 0 })).toBeNull();
    expect(marketplaceRuleFieldError({ worldSlug: 'items', details: {}, photoCount: 2 })).toBeNull();
  });
  it('food without expiry → inline details error', () => {
    expect(marketplaceRuleFieldError({ worldSlug: 'food', details: {}, photoCount: 0 })?.field).toBe('details');
  });
  it('routed worlds → inline organisation-picker error', () => {
    expect(marketplaceRuleFieldError({ worldSlug: 'medical', details: {}, photoCount: 0 })?.field).toBe('org');
  });
});
