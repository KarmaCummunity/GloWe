import { describe, expect, it } from 'vitest';
import { decodeSavedPostsCursor, encodeSavedPostsCursor } from '../savedPostsCursor';

describe('savedPostsCursor', () => {
  it('round-trips a valid cursor', () => {
    const encoded = encodeSavedPostsCursor({ savedAt: '2026-01-01T00:00:00.000Z' });
    expect(decodeSavedPostsCursor(encoded)).toEqual({ savedAt: '2026-01-01T00:00:00.000Z' });
  });

  it('returns null for missing / invalid input', () => {
    expect(decodeSavedPostsCursor(undefined)).toBeNull();
    expect(decodeSavedPostsCursor('')).toBeNull();
    expect(decodeSavedPostsCursor('not-json')).toBeNull();
    expect(decodeSavedPostsCursor(encodeURIComponent(JSON.stringify({})))).toBeNull();
    expect(
      decodeSavedPostsCursor(encodeURIComponent(JSON.stringify({ savedAt: 1 }))),
    ).toBeNull();
    expect(
      decodeSavedPostsCursor(encodeURIComponent(JSON.stringify({ savedAt: 'nope' }))),
    ).toBeNull();
  });
});
