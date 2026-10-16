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
