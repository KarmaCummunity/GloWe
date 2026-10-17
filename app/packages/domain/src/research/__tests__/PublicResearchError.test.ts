import { describe, expect, it } from 'vitest';
import { PublicResearchError, isPublicResearchError } from '../PublicResearchError';

describe('PublicResearchError', () => {
  it('formats message with optional detail', () => {
    expect(new PublicResearchError('survey_not_found').message).toBe(
      'public_research_error:survey_not_found',
    );
    expect(new PublicResearchError('validation', 'bad_rating').message).toBe(
      'public_research_error:validation:bad_rating',
    );
  });

  it('isPublicResearchError narrows instances', () => {
    expect(isPublicResearchError(new PublicResearchError('rate_limited'))).toBe(true);
    expect(isPublicResearchError(new Error('x'))).toBe(false);
  });
});
