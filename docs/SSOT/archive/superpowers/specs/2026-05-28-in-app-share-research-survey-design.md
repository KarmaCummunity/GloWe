# FR-RESEARCH-004 — Share Affordance for Public Research Survey

**Status.** ⏳ Planned
**Date.** 2026-05-28
**Mapped to spec.** Extends `docs/SSOT/spec/16_public_research.md` (FR-RESEARCH-001..003).

---

## Goal

Make the public market-research survey at `/research/alt-platforms-research` **virally spreadable**. The survey itself is the soft funnel into the app — no forced signup. Anyone who lands on the survey should be able to forward it to friends, whether they are an app user or not.

This is an **experimental channel for testing**: cheap to ship, cheap to roll back, with a built-in decision rule at +14 days based on the breakdown of `?src=` values landing in `public.public_research_responses`.

## Why three surfaces (vs. only-in-app v1)

The original plan placed the share affordance only inside `/settings/surveys`. That solves "registered users can share" but completely misses the viral channel where non-registered users — the actual cohort the survey is designed for — pass the link to other non-registered friends. The survey only spreads through the network of people who never installed the app if the share affordance lives on the public web survey itself.

Three placements, three `?src=` values, three-way attribution at +14 days:

| # | Where | Audience | `?src=` | Visibility |
|---|---|---|---|---|
| 1 | `app/research/thanks.web.tsx` | Anyone who just completed the survey | `share-thanks` | **Primary** — large button alongside the existing "Visit Karma" CTA |
| 2 | `app/research/[slug].web.tsx` | Anyone on the survey form page (including non-completers) | `share-during-survey` | **Secondary** — small button in the header area; non-distracting |
| 3 | `app/settings/surveys.tsx` | Registered users only | `in-app-share-settings` | Top of the surveys hub list |

The three-way breakdown is the most decision-actionable signal we can capture cheaply: it tells us not just "did the channel work" but **which surface drives the funnel**. If surface 2 dominates, the lesson is "people share when they first arrive, not after they finish"; if surface 1 dominates, the opposite. Either learning informs every future placement decision.

## Non-goals

- Wiring TD-161 (real first-party analytics ingest). Separate, larger piece of work.
- Referral with payoff / unlock mechanics. Too heavy for an experiment.
- Per-recipient tracking. The public research surface is anonymous-by-design per FR-RESEARCH-002.
- A/B testing share-message copy. Too few users to be statistically powered.
- Native (iOS/Android) surfaces for placements 1 and 2 — those are web-only by definition of the public research route.

---

## Acceptance Criteria

**AC1.** On `/research/thanks` (web-only `.web.tsx`), a share button labeled "שתפו את הסקר עם חבר/ה" renders as the primary CTA, alongside (and visually equal to or larger than) the existing "Visit Karma site" CTA. The button is visible immediately on page load (does not wait for the 5-second visit-CTA reveal timer).

**AC2.** On `/research/[slug]` (web-only `.web.tsx`), a small share affordance — icon + label "שתפו" — renders in the header area of the survey form. Visible from page load. Positioned so it does not crowd the question content; the question rows remain the visual focus.

**AC3.** A row "שתפו את מחקר השוק עם חברים" renders at the top of `/settings/surveys` (in-app, all platforms), above the active-surveys list and above the free-feedback entry. (This is the only placement visible inside the app shell.)

**AC4.** Share flow behavior:
- On native iOS/Android (placement 3 only): OS share sheet via `Share.share`.
- On web with `navigator.share` (placements 1, 2, 3): Web Share API dialog.
- On web without `navigator.share`: URL copied to clipboard via `navigator.clipboard.writeText`; success toast confirms.
- The flow never throws — it returns one of `{ kind: 'shared' | 'copied' | 'dismissed' | 'failed' }`.

**AC5.** Shared URL is `${EXPO_PUBLIC_WEB_BASE_URL}/research/alt-platforms-research?src=<placement-src>` where `<placement-src>` is one of:
- `share-thanks` (12 chars)
- `share-during-survey` (19 chars)
- `in-app-share-settings` (21 chars)

All three pass the `^[a-z0-9_-]{1,32}$` CHECK constraint on `public.public_research_responses.source`.

**AC6.** The URL appears in the share message body exactly once on every platform (mirrors the duplicated-link fix shipped for FR-POST-023).

**AC7.** Recipients can open the link and submit answers without any registration, login, or app install. Already guaranteed by FR-RESEARCH-001 AC1-AC2; this AC asserts the invariant survives the new entry paths.

**AC8.** Status feedback (where the host environment supports it):
- `kind: 'shared'` → success "הקישור שותף" (2.2s).
- `kind: 'copied'` → success "הקישור הועתק" (2.2s).
- `kind: 'failed'` → error "לא הצלחנו לשתף, נסה/י שוב" (2.2s).
- `kind: 'dismissed'` → silent (no message).

For the web placements 1 and 2, if the existing public-research web pages do not currently mount the toast host, a minimal inline status line below the button (auto-clearing after 2.2s) is acceptable in lieu of a toast. The implementer chooses based on what is already wired on `thanks.web.tsx` and `[slug].web.tsx`.

**AC9.** Analytics: `track('research_share_initiated', { src, outcome })` is called on every share attempt. This is a no-op in production today (TD-161) and the experiment does not depend on it; the call is included so we get the signal automatically once TD-161 closes.

---

## Architecture

One shared utility, one in-app component, plus inline JSX on the two public web pages.

```
src/lib/shareResearchSurvey.ts                  ← shared utility (RN Share / Web Share / clipboard)
    │
    ├─→ app/research/thanks.web.tsx              [placement 1 — PRIMARY public]
    │       inline button; src = share-thanks
    │
    ├─→ app/research/[slug].web.tsx              [placement 2 — SECONDARY public]
    │       inline header button; src = share-during-survey
    │
    └─→ src/components/survey/ShareResearchRow.tsx  [placement 3 — in-app]
            └─→ app/settings/surveys.tsx        (mounted at top of list)
                  src = in-app-share-settings
```

The utility takes `src` as a parameter — attribution is set at the call site, not hard-coded. This keeps the utility reusable for any future placement (e.g., a post-action success-screen CTA).

### Layer placement

`src/lib/shareResearchSurvey.ts` consumes React Native APIs (`Share`) and Web APIs (`navigator.share`, `navigator.clipboard`) directly. Same layer as the existing `src/lib/sharePost.ts` (FR-POST-023) — UX glue, not domain/application. No changes to `@kc/domain`, `@kc/application`, or `@kc/infrastructure-supabase`.

The two public-web placements (1, 2) live in `app/research/*.web.tsx` and import the utility directly rather than going through a wrapper component. This keeps the page files minimal and matches the existing pattern on those pages (they import helpers directly, not abstract components).

The in-app placement (3) goes through a `ShareResearchRow` component for stylistic parity with the rest of `/settings/surveys` (matches the row styling of the active-surveys list and free-feedback row).

### Public API of the utility

```typescript
export const RESEARCH_SHARE_SLUG = 'alt-platforms-research';
export const RESEARCH_SHARE_SRC_THANKS = 'share-thanks';
export const RESEARCH_SHARE_SRC_DURING_SURVEY = 'share-during-survey';
export const RESEARCH_SHARE_SRC_SETTINGS = 'in-app-share-settings';

export type ResearchShareInput = Readonly<{
  webBaseUrl: string;
  src: string;       // caller passes one of the RESEARCH_SHARE_SRC_* constants
  title: string;
  message: string;   // short Hebrew copy that goes before the URL in the body
}>;

export type ShareResearchOutcome =
  | { kind: 'shared' }
  | { kind: 'dismissed' }
  | { kind: 'copied' }
  | { kind: 'failed'; reason: string };

export function buildResearchShareUrl(webBaseUrl: string, src: string): string;
export async function shareResearchSurvey(input: ResearchShareInput): Promise<ShareResearchOutcome>;
```

### Web vs native dispatch (inside the utility)

```
Platform.OS === 'web'  →  try navigator.share() → success | AbortError→dismissed | other err → clipboard fallback
                       →  no navigator.share → navigator.clipboard.writeText() → copied | failed
Platform.OS !== 'web'  →  Share.share() → sharedAction | dismissedAction | throw → failed
```

---

## Copy (Hebrew)

All UI strings live in `src/i18n/locales/he/modules/research.ts` (web survey + thanks placements) and `src/i18n/locales/he/modules/survey.ts` (in-app settings row). No inline Hebrew in `.tsx` files per CLAUDE.md §8.

### New `research.ts` keys (sub-tree `share`)

```typescript
share: {
  // Placement 1 — thank-you page primary CTA
  thanksTitle: 'שתפו את הסקר עם חבר/ה',
  thanksHelp: 'עזרו לקול שלכם להגיע גם לאחרים שעוד לא באפליקציה',

  // Placement 2 — small button in survey form header
  duringSurveyLabel: 'שתפו',
  duringSurveyAria: 'שתפו את הסקר עם חבר/ה',

  // Web-platform OS share-sheet title
  shareTitle: 'מחקר שוק קארמה',

  // Body of the share message — what the recipient sees, identical for both web placements
  shareMessage:
    'אנחנו בונים אפליקציה ישראלית לנתינה בחינם, בלי הבלגן של הקבוצות. ' +
    'שאלון אנונימי קצר, בלי הרשמה — התשובות שלך משנות איך זה ייראה בפועל.',

  // Status feedback (toast or inline status line per AC8)
  statusShared: 'הקישור שותף',
  statusCopied: 'הקישור הועתק',
  statusFailed: 'לא הצלחנו לשתף, נסה/י שוב',
},
```

### New `survey.ts` keys (sub-tree `shareResearch`)

```typescript
shareResearch: {
  // Placement 3 — in-app Settings → Surveys row
  rowTitle: 'שתפו את מחקר השוק עם חברים',
  rowSubtitle: 'עוזרים לנו להבין מה אנשים שלא באפליקציה צריכים — אנונימי, בלי הרשמה',

  // OS share-sheet title for the in-app placement (native + web)
  shareTitle: 'מחקר שוק קארמה',

  // Share message body — identical to research.share.shareMessage
  shareMessage:
    'אנחנו בונים אפליקציה ישראלית לנתינה בחינם, בלי הבלגן של הקבוצות. ' +
    'שאלון אנונימי קצר, בלי הרשמה — התשובות שלך משנות איך זה ייראה בפועל.',

  // Toasts
  toastShared: 'הקישור שותף',
  toastCopied: 'הקישור הועתק',
  toastFailed: 'לא הצלחנו לשתף, נסה/י שוב',
},
```

(`shareTitle` and `shareMessage` are duplicated across the two locale modules deliberately — the public-research module owns the strings for the public surfaces; the survey module owns the strings for the in-app surface. Avoiding cross-module imports keeps each locale module independently shippable.)

### Notes on the copy

- The share message body sells the **product** first ("we're building an Israeli giving app without the group chaos"), asks for the survey second. Recipients are non-app users; the hook is product-curiosity, not market-research goodwill.
- Trailing "תודה" was removed from the body — it weakens the close. The thank-you happens on the survey's `/research/thanks` page.
- Placement 1 (thanks page) uses a longer, warmer copy (`thanksHelp` subline) because the user has just engaged for 3+ minutes — they will read it.
- Placement 2 (during survey) is intentionally minimal — a single Hebrew word + icon — to avoid pulling focus from completing the survey.

---

## Measurement & decision rule

Since `track()` is a production no-op (TD-161), the only signal we have is the database. That is enough.

**At +14 days post-merge**, run:

```sql
select source, count(*) as fills
from public.public_research_responses
where source in ('share-thanks', 'share-during-survey', 'in-app-share-settings')
group by source
order by fills desc;
```

**Decision matrix** (Σ = total fills across all three placement src values):

| Σ over 14 days | Decision |
|---|---|
| ≥ 10 | Channel viable. Keep all three. Identify the dominant surface; if one accounts for ≥70% of fills, deprecate the bottom one in a follow-up. |
| 3–9 | Inconclusive but promising. Extend observation window 14 more days; do not iterate placements yet. |
| 0–2 | Channel deprecated. Remove all three placements in a follow-up PR. Log learning to `docs/SSOT/DECISIONS.md` as a new `D-*` entry: "viral survey-sharing among non-registered users is not a viable acquisition channel at current scale; revisit when total non-registered survey traffic exceeds X/week". |

The placement breakdown is the decision-actionable signal beyond pass/fail: it tells us which surface converts and informs every future placement experiment.

---

## File map

| Action | Path |
|---|---|
| Create | `app/apps/mobile/src/lib/shareResearchSurvey.ts` |
| Create | `app/apps/mobile/src/lib/__tests__/shareResearchSurvey.test.ts` |
| Create | `app/apps/mobile/src/components/survey/ShareResearchRow.tsx` |
| Modify | `app/apps/mobile/app/research/thanks.web.tsx` (+ primary share button + handler) |
| Modify | `app/apps/mobile/app/research/[slug].web.tsx` (+ small header share button + handler) |
| Modify | `app/apps/mobile/app/settings/surveys.tsx` (mount `ShareResearchRow` at top of list) |
| Modify | `app/apps/mobile/src/i18n/locales/he/modules/research.ts` (new `share` sub-tree) |
| Modify | `app/apps/mobile/src/i18n/locales/he/modules/survey.ts` (new `shareResearch` sub-tree) |
| Modify | `app/apps/mobile/src/lib/analytics.ts` (extend `SurveyAnalyticsEvent` union with `'research_share_initiated'`) |
| Modify | `docs/SSOT/spec/16_public_research.md` (FR-RESEARCH-004 block) |
| Modify | `docs/SSOT/BACKLOG.md` (new row) |

Estimated total: ~330 LOC across new files plus ~50 LOC of modifications. Each file ≤300 lines per CLAUDE.md §5.

---

## Constraints respected

- **File-size cap ≤300 lines** (§5): utility ~95, row ~70, test ~85. The two `.web.tsx` modifications add ~20 LOC each — `thanks.web.tsx` (127 lines) and `[slug].web.tsx` (221 lines) remain well under the cap.
- **Indentation cap ≤3 levels** (§5): the utility's web dispatch uses early-return fallthrough to keep depth at 3.
- **No inline Hebrew strings** (§8): all UI copy in locale modules; no Hebrew in `.tsx` or `.ts` source.
- **Clean architecture** (§5): utility lives at the same layer as `sharePost.ts` (UX glue, RN + Web APIs allowed). No `@kc/application` or `@kc/domain` changes.
- **Attribution source regex**: all three `src` values match `^[a-z0-9_-]{1,32}$`.
- **URL appears once in body**: enforced by `composeMessage(message, url)`; covered by unit test.
- **Tests beside code** (§5): `src/lib/__tests__/shareResearchSurvey.test.ts` uses vitest. Coverage: happy path, dismissed, failed, URL-once invariant, src-parameter respect, web vs native dispatch.

---

## Risk / rollout notes

- **Low risk.** No DB migration, no Edge Function changes, no auth surface changes, no changes to the public research RPC or rate-limiter. Pure FE addition layered on top of FR-RESEARCH-001..003.
- **Rollback:** delete the new file + the row component + the two web-file modifications in a single revert. No persistent state to clean up.
- **Feature flag:** none. The experimental nature is captured by the +14-day decision rule, not a runtime toggle.
- **Web base URL:** the utility takes `webBaseUrl` as input from the caller. On the public web placements, the URL is the page's own origin (use `window.location.origin`); on the in-app placement, it is `process.env.EXPO_PUBLIC_WEB_BASE_URL` with fallback to the dev URL (matches existing patterns).
- **Recipient privacy:** unchanged — the public form remains anonymous-by-design (FR-RESEARCH-002 honeypot + origin allowlist + IP-hash rate limit). The shared URL adds no new attack surface beyond a public URL.
- **Survey completion rate:** placement 2 (during-survey small button) is intentionally minimal — icon + one-word label — to avoid pulling attention from completing. If post-merge data shows a drop in completion rate, deprecate placement 2 before placement 1.

---

## Out-of-band follow-ups (post-merge)

1. **+14 days:** run the measurement SQL; act per the decision matrix.
2. **If TD-161 closes:** the `track('research_share_initiated', ...)` calls start producing usable funnel data (taps, dismisses, failures) — no further code change needed.
3. **If the channel is viable (Σ ≥ 10):** consider a fourth placement on the post-creation success screen as the next experiment, attributed as `in-app-share-post-success`.

---

## Open questions

None. All design decisions are locked.
