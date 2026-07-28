# GloWe Performance — Guardrails & Font Self-Hosting

> **Mapped to spec:** `docs/SSOT/spec/17_glowe_frontend.md` → FR-GLOWE-029 (new).
> **Decision:** `DECISIONS.md` D-190.
> **Target branch:** `staging`.

---

## 1. What this is, and what it replaced

A two-week overhaul was planned on 2026-07-28 against what turned out to be a
**747-commit-stale base**. Re-measuring against current `staging` showed most of
that plan was already shipped by `GLOWE.LAUNCH-2` (D-188): esbuild minify +
content-hashing, `_headers`, `defer` on every script, vendored `supabase-js`,
compressed imagery, plus a server-side `glowe_home_feed` RPC.

The plan was therefore discarded rather than executed. What survived
re-measurement is what this document covers: **one real un-fixed regression on
the render path, and the absence of any gate to stop it recurring.**

That is the whole lesson worth recording — the audit numbers were real, but they
described a tree nobody was deploying. Measuring the deployed branch first would
have saved the work.

## 2. Measured state of `staging` (2026-07-28, before this change)

| Metric | Value | Assessment |
|---|---|---|
| Critical path, worst page | 32.9 KB gzip | Already good — well inside a 60 KB target |
| Render-blocking requests | 2 | At target |
| Page weight, `index.html` | 393.6 KB | Already under a 500 KB target |
| Scripts with `defer` | 24 of 25 | Correct; the exception is a deliberate anti-FOUC paint script |
| **Third-party origins on the render path** | **2** | **The finding** |

### The finding

`css/styles.css` opened with:

```css
@import url('https://fonts.googleapis.com/css2?family=Assistant:...&family=Heebo:...&family=Noto+Sans+Arabic:...&family=Noto+Sans+Ethiopic:...&display=swap');
```

An `@import` is strictly worse than a `<link>`. A `<link>` is discovered during
the initial HTML parse and fetched in parallel; an `@import` cannot start until
the importing stylesheet has been **fetched and parsed**, so it chains a fresh
DNS + TLS + fetch to `fonts.googleapis.com`, and then a fourth hop to
`fonts.gstatic.com` for the files — all of it in front of the first line of
text, and all of it on a domain we do not control.

Four font families rode on that chain, including every non-Latin script the
product supports. The Nunito `<link>` was already handled correctly with the
`media="print" onload="this.media='all'"` trick, so it was not blocking — but it
still cost a handshake to the same third-party origin.

This is exactly the kind of regression that survives review: it is one line, it
looks like a normal font declaration, and no tooling in the repo was looking at
CSS.

## 3. Changes

### 3.1 Self-host every web font (`scripts/vendor-fonts.mjs`)

Five families vendored as woff2 with upstream `unicode-range` preserved, written
into `css/styles.css` between regenerable markers:

| Family | Subsets | Serves |
|---|---|---|
| Assistant | hebrew, latin, latin-ext | `he` body copy |
| Heebo | hebrew, latin | `he` fallback |
| Noto Sans Arabic | arabic | `ar` |
| Noto Sans Ethiopic | ethiopic | `am` |
| Nunito | latin, latin-ext, cyrillic, cyrillic-ext | `en`, `ru`, headings |

Subsets are derived from `GLOWE_LANGUAGES` (FR-TRANSLATE-003), not guessed.
Two are load-bearing and easy to drop by accident:

- **Nunito cyrillic** — `styles.css` relies on Nunito for Russian. Dropping it
  would silently render `ru` in a fallback face.
- **Noto Sans Ethiopic** — absent from most system font stacks, so without it
  Amharic renders as tofu boxes.

`vietnamese` and `greek` are excluded: no interface language needs them.

**Written into `styles.css`, not a separate `fonts.css`.** A separate stylesheet
would add a third render-blocking `<link>` to every page. The `@font-face` rules
are ~1.4 KB gzipped and belong with the stylesheet that uses them. Markers keep
the block regenerable without touching hand-written CSS.

**Repo cost:** 1.67 MB of woff2 committed. **Per-reader cost is what matters**,
and `unicode-range` keeps it honest — a browser fetches a face only when it
renders a codepoint in its range, so an English reader never downloads Ethiopic:

| Reader | Downloads |
|---|---|
| `he` | ~21 KB |
| `ru` | ~146 KB |
| `en` | ~219 KB |
| `ar` | ~486 KB |
| `am` | ~581 KB |

These are the same bytes Google was already serving those readers — self-hosting
adds none. It removes two handshakes and a serial chain, and puts the files
behind the site's own `immutable` cache headers.

### 3.2 A gate, so this cannot come back quietly

- **`scripts/measure.mjs`** — resolves what a browser must fetch before it can
  paint; reports raw/gzip/brotli per page, plus third-party render-path origins
  and **cross-origin `@import`s specifically**. Dependency-free, so this check
  can never itself be why CI is red.
- **`scripts/perf-budget.json`** — budgets set just above current measurements
  so a regression fails *today*. They ratchet down, never up.
- **`scripts/smoke.mjs`** — loads all 22 pages in headless Chromium and fails on
  any console error, page error, or failed request.
- **`.github/workflows/ci-glowe-perf.yml`** — runs both on every PR touching
  `app/apps/glowe-web/**`.

Gating the **source tree**, not the built output: the deploy step only minifies
and content-hashes further, so a source gate is the conservative one and avoids
making this workflow depend on a full expo export.

Lighthouse is deliberately **not** wired in — its scores swing several points
run-to-run on shared runners, so a blocking check buys flaky builds rather than
signal. `INFRA-QA-W4` owns the Lighthouse/k6 story separately.

## 4. Result

| Metric | Before | After |
|---|---|---|
| Third-party origins on render path | 2 | **0** |
| Chained (serial) blocking requests | 1 | **0** |
| Critical path, worst page | 32.9 KB | 34.3 KB (+1.4 KB) |
| Render-blocking requests | 2 | 2 |
| Page weight, `index.html` | 393.6 KB | 405.8 KB |

The +1.4 KB is the `@font-face` block moving inline. It buys the removal of two
DNS + TLS handshakes and a serial round trip that could not begin until
`styles.css` had been parsed — on a mobile connection, comfortably a net win,
and it removes a third-party dependency from first paint entirely.

Verified per language in a real browser: each of `en/he/ru/ar/am` loads its
correct faces from local files, with **zero requests to any Google origin**.

## 5. Deliberately not done

- **The remaining waves of the discarded plan.** Pagination, request
  de-duplication, `getSession()`, DB indexes and the PWA are real, but they are
  a fresh assessment against `staging`, not a stale plan replayed. See §6.
- **Reducing Arabic/Ethiopic weights from 3 to 2.** Would cut ~1/3 of those
  readers' font bytes but changes rendered weight for semibold text. A design
  call, not a performance one.
- **Lighthouse in CI.** See §3.2.

## 6. What a real next assessment should check

Recorded so the next pass starts from questions, not assumptions — each needs
measuring against `staging` before any work:

1. Do list queries still `select('*')` unbounded, and what indexes back the
   `glowe_*` hot paths now that `glowe_home_feed` is server-side?
2. Does `currentUser()` still resolve via `auth.getUser()` (a network
   round-trip) rather than `getSession()`?
3. Is `app.js` still ~495 KB in one file, and is it still parsed in full on
   every page?
4. Is a service worker worth adding now that assets are content-hashed and
   long-cached?
