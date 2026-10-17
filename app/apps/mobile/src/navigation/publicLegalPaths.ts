/** Legal documents (/legal/terms, /legal/privacy) are public: readable while signed out (D-47, Apple 5.1.1). */
export function isPublicLegalSegment(segments: readonly string[]): boolean {
  return segments[0] === 'legal';
}
