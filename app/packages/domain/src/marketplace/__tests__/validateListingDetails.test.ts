import { describe, expect, it } from 'vitest';
import { validateListingDetails } from '../validateListingDetails';

describe('validateListingDetails', () => {
  it('requires schema fields', () => {
    const schema = {
      type: 'object',
      required: ['food_type'],
      properties: { food_type: { enum: ['cooked', 'fresh'] } },
    };
    expect(validateListingDetails(schema, {})).toBe('required:food_type');
    expect(validateListingDetails(schema, { food_type: 'fresh' })).toBeNull();
  });

  it('rejects bad enum', () => {
    const schema = { properties: { item_condition: { enum: ['New', 'Good'] } } };
    expect(validateListingDetails(schema, { item_condition: 'Bad' })).toBe('enum:item_condition');
  });
});

describe('validateListingDetails — type, const, format, arrays, extras', () => {
  const schema = {
    additionalProperties: false,
    properties: {
      weight_kg: { type: 'number' },
      seats: { type: 'integer' },
      needs_transport: { type: 'boolean' },
      note: { type: ['string', 'null'] },
      meta: { type: 'object' },
      tags: { type: 'array', items: { type: 'string' } },
      kind: { const: 'ride' },
      expires_at: { type: 'string', format: 'date-time' },
      plain: {},
    },
  };

  it('accepts well-typed values and skips null/undefined', () => {
    expect(
      validateListingDetails(schema, {
        weight_kg: 2.5,
        seats: 3,
        needs_transport: true,
        note: null,
        meta: { a: 1 },
        tags: ['x', 'y'],
        kind: 'ride',
        expires_at: '2026-10-17T10:00:00Z',
        plain: 'text',
        seats_unused: undefined,
      } as Record<string, unknown>),
    ).toBe('extra:seats_unused');
    expect(validateListingDetails(schema, { weight_kg: 1, meta: { a: 1 } })).toBeNull();
  });

  it('flags type mismatches', () => {
    expect(validateListingDetails(schema, { seats: 1.5 })).toBe('type:seats');
    expect(validateListingDetails(schema, { needs_transport: 'yes' })).toBe('type:needs_transport');
    expect(validateListingDetails(schema, { meta: [1] })).toBe('type:meta');
    expect(validateListingDetails(schema, { tags: 'x' })).toBe('type:tags');
  });

  it('flags const, format and array item violations', () => {
    expect(validateListingDetails(schema, { kind: 'food' })).toBe('const:kind');
    expect(validateListingDetails(schema, { expires_at: 'not-a-date' })).toBe('format:expires_at');
    expect(validateListingDetails(schema, { tags: ['x', 2] })).toBe('array:tags');
  });

  it('rejects unknown keys only when additionalProperties is false', () => {
    expect(validateListingDetails(schema, { other: 1 })).toBe('extra:other');
    expect(validateListingDetails({ properties: {} }, { other: 1 })).toBeNull();
  });

  it('treats blank required strings as missing', () => {
    expect(validateListingDetails({ required: ['title'] }, { title: '  ' })).toBe('required:title');
  });
});
