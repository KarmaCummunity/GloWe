// Mapped to docs/superpowers/specs/2026-05-25-app-performance-overhaul-design.md § Wave 0.
//
// Helpers around Sentry's transaction API.
//   - When no DSN is configured (typical dev environment): never load the SDK.
//     `startMark` records a noopSpan locally; `finishMark` discards it. Zero
//     bundle/runtime cost beyond a Map insert.
//   - When a DSN is configured: defer to `getSentryIfInit()` which returns the
//     module only after `initSentry()` (async, deferred past first paint) has
//     resolved. Calls before that resolve still record noopSpans.
//   - `finish` returns boolean so callers can detect double-finish.
//   - Sentry v7 used span.finish(); v8 renamed to span.end(). We call whichever
//     exists so the helper survives major-version bumps without crashing the
//     host app (which is what TypeError: s.finish is not a function would do).
//
// We read DSN directly from process.env (not from ./sentry) so this module
// doesn't transitively pull expo-constants at vitest load — keeps the unit
// tests environment-light.

const HAS_DSN: boolean = Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN);

// Lazy import of ./sentry so module-load of perfMarks doesn't drag in
// expo-constants. Only resolved when HAS_DSN is true.
type SentryGate = { getSentryIfInit: () => typeof import('@sentry/react-native') | null };
let sentryGate: SentryGate | null = null;
function getGate(): SentryGate | null {
  if (!HAS_DSN) return null;
  if (sentryGate) return sentryGate;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sentryGate = require('./sentry') as SentryGate;
    return sentryGate;
  } catch {
    return null;
  }
}

type MarkName = 'app.cold_start' | 'feed.first_render' | 'image.first_paint';
type Span = { end?(): void; finish?(): void };

const coldStartT0 =
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : 0;

const active = new Map<MarkName, Span>();
let lastColdStartMs: number | null = null;
const noopSpan: Span = { end() { /* no-op when Sentry unavailable */ } };

function endSpan(span: Span): void {
  try {
    if (typeof span.end === 'function') {
      span.end();
      return;
    }
    if (typeof span.finish === 'function') {
      span.finish();
    }
  } catch {
    // Never crash the host app on a Sentry span-end failure.
  }
}

export function startMark(name: MarkName): void {
  if (active.has(name)) return;
  // No DSN ⇒ never touch the SDK; record a local noopSpan so the lifecycle
  // bookkeeping (idempotency, finish-returns-bool) still works.
  const gate = getGate();
  if (!gate) {
    active.set(name, noopSpan);
    return;
  }
  const Sentry = gate.getSentryIfInit();
  if (!Sentry) {
    // DSN is set but initSentry() hasn't resolved yet (we deferred it past
    // first paint). Use a noopSpan for now — we'll miss this mark in Sentry,
    // but the helper stays well-behaved and the first paint stays fast.
    active.set(name, noopSpan);
    return;
  }
  const span = Sentry.startInactiveSpan({ name, op: 'mark' }) as unknown as Span | undefined;
  active.set(name, span ?? noopSpan);
}

export function finishMark(name: MarkName): boolean {
  const span = active.get(name);
  if (!span) return false;
  endSpan(span);
  active.delete(name);
  if (name === 'app.cold_start' && coldStartT0 > 0) {
    lastColdStartMs = Math.round(performance.now() - coldStartT0);
  }
  return true;
}

/** Last measured cold-start ms (JS bundle → first themed shell paint). */
export function getLastColdStartMs(): number | null {
  return lastColdStartMs;
}

// Test-only escape hatch.
export function _resetForTests(): void {
  active.clear();
  lastColdStartMs = null;
}
