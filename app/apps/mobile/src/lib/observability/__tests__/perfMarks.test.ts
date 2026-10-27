import { describe, expect, it, beforeEach } from 'vitest';
import { startMark, finishMark, getLastColdStartMs, _resetForTests } from '../perfMarks';

// Vitest doesn't set EXPO_PUBLIC_SENTRY_DSN, so perfMarks' HAS_DSN gate stays
// false here. All three tests exercise the noopSpan path. The endSpan() helper
// is reviewed at the call site rather than mock-stubbed — too easy to get the
// mock harness wrong (saw it once already), and the helper is simple enough
// that the type system + code review catches the obvious bugs.

describe('perfMarks', () => {
  beforeEach(() => _resetForTests());

  it('no-ops cleanly when no mark started', () => {
    expect(() => finishMark('feed.first_render')).not.toThrow();
  });

  it('idempotent start', () => {
    startMark('app.cold_start');
    expect(() => startMark('app.cold_start')).not.toThrow();
  });

  it('returns true first, false repeat', () => {
    startMark('image.first_paint');
    expect(finishMark('image.first_paint')).toBe(true);
    expect(finishMark('image.first_paint')).toBe(false);
  });

  it('records cold start duration ms', () => {
    startMark('app.cold_start');
    finishMark('app.cold_start');
    expect(getLastColdStartMs()).toEqual(expect.any(Number));
  });

  it('does not throw when no DSN — stays fully no-op', () => {
    // process.env.EXPO_PUBLIC_SENTRY_DSN is unset in vitest, so getGate()
    // returns null on the first call and never re-tries — the SDK module
    // is never loaded. We can't observe "never loaded" directly here, but
    // we can assert the public API never throws.
    expect(() => {
      startMark('app.cold_start');
      finishMark('app.cold_start');
      startMark('feed.first_render');
      finishMark('feed.first_render');
      startMark('image.first_paint');
      finishMark('image.first_paint');
    }).not.toThrow();
  });
});
