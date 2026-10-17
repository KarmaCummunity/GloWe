import { describe, expect, it } from 'vitest';
import { isPublicLegalSegment } from '../publicLegalPaths';

describe('isPublicLegalSegment', () => {
  it('allows /legal/* routes', () => {
    expect(isPublicLegalSegment(['legal', 'privacy'])).toBe(true);
    expect(isPublicLegalSegment(['legal', 'terms'])).toBe(true);
  });
  it('does not open other routes', () => {
    expect(isPublicLegalSegment(['(tabs)', 'legal'])).toBe(false);
    expect(isPublicLegalSegment(['settings'])).toBe(false);
    expect(isPublicLegalSegment([])).toBe(false);
  });
});
