import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, type FeedCursor } from '../cursor';

describe('cursor (TD-50)', () => {
  it('round-trips a valid cursor', () => {
    const c: FeedCursor = { createdAt: '2026-05-16T12:34:56.789Z' };
    const encoded = encodeCursor(c);
    expect(decodeCursor(encoded)).toEqual(c);
  });

  it('decode returns null for undefined input', () => {
    expect(decodeCursor(undefined)).toBeNull();
  });

  it('decode returns null for empty string', () => {
    expect(decodeCursor('')).toBeNull();
  });

  it('decode returns null for malformed JSON', () => {
    // Single bare token after decodeURIComponent — `JSON.parse` throws.
    expect(decodeCursor('not-json')).toBeNull();
  });

  it('decode returns null when createdAt is missing', () => {
    const raw = encodeURIComponent(JSON.stringify({ other: 'x' }));
    expect(decodeCursor(raw)).toBeNull();
  });

  it('decode returns null when createdAt is not a string', () => {
    const raw = encodeURIComponent(JSON.stringify({ createdAt: 42 }));
    expect(decodeCursor(raw)).toBeNull();
  });

  it('decode returns null when createdAt is not a parseable date', () => {
    const raw = encodeURIComponent(JSON.stringify({ createdAt: 'not-a-date' }));
    expect(decodeCursor(raw)).toBeNull();
  });

  it('decode discards extra fields (only createdAt survives)', () => {
    const raw = encodeURIComponent(
      JSON.stringify({ createdAt: '2026-01-01T00:00:00Z', extra: 'leak' }),
    );
    expect(decodeCursor(raw)).toEqual({ createdAt: '2026-01-01T00:00:00Z' });
  });

  it('encoded output is URL-safe (no raw braces, no unescaped quotes)', () => {
    const out = encodeCursor({ createdAt: '2026-01-01T00:00:00Z' });
    expect(out).not.toContain('{');
    expect(out).not.toContain('"');
  });
});

describe('decodeCursor — postId + strict timestamp', () => {
  it('round-trips postId', () => {
    const c = { createdAt: '2026-05-16T12:00:00.123456+00:00', postId: '11111111-2222-4333-8444-555555555555' };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });
  it('rejects timestamps with filter metacharacters', () => {
    const raw = encodeURIComponent(JSON.stringify({ createdAt: '2026-05-16T12:00:00Z",or(x' }));
    expect(decodeCursor(raw)).toBeNull();
  });
});
