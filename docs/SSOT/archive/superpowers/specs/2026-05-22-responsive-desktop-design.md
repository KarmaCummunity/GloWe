# Responsive Desktop Design — Karma Community

**Status:** ⏳ Planned
**Date:** 2026-05-22
**Owner:** TBD (autonomous loop)
**FR prefix:** `FR-RESP-*` (new spec domain)
**Target SSOT spec file:** `docs/SSOT/spec/14_responsive_desktop.md` (to be created by PR 1)

---

## 1. Goal & non-goals

### Goal

Make `pnpm --filter @kc/mobile web` look like a real desktop app, not a stretched phone. Same code, same routes, same business logic — additive shell components and per-screen layout adaptations driven by viewport width.

### Non-goals

- No mobile regression. Mobile is the primary platform; desktop adapts, mobile does not bend.
- No new product features. Pure layout / visual work.
- No PWA install flow, no service-worker upgrades, no SSR.
- No native-tablet split-view layouts (iPad, Android tablets). These are RN-native concerns and are out of scope; tracked as TD-150 for later evaluation.
- No new screens, no information-architecture changes. The 5 tabs stay 5 tabs, rendered as a rail rather than a bottom pill.
- No typography or color-token changes. Existing scale reads fine at the proposed content widths; changing it would cascade into mobile and break the invariant.

### Success criteria

- On a 1440×900 monitor, no screen has more than ~30% empty side-margin of unused background.
- Bottom tab pill is gone on desktop; right-side navigation rail replaces it at ≥ 768px.
- Chat at `/chat` shows conversations list + active thread side-by-side on desktop.
- All form screens (settings, edit-profile, sign-in, onboarding steps) cap at ~600px content width — no half-empty `<input>` running the width of the monitor.
- RTL stays correct everywhere: every new layout primitive uses logical start/end, never left/right.
- Mobile snapshot at 375px viewport remains byte-identical after every PR in this initiative.

---

## 2. Mobile invariant (hard rule)

Any viewport `< 768px` — whether native iOS / Android or a browser on a phone — renders byte-identical to today. All new desktop layout code lives behind a `useBreakpoint() !== 'mobile'` guard. The default render path stays the current mobile path; desktop is the branch.

Concretely:

- Existing screen files stay untouched at the mobile path. New shell wrappers and aside panels are *added*, not substituted.
- The current `TabBar` keeps rendering for mobile. The side rail is a sibling component that mounts only at ≥ 768px.
- No existing `StyleSheet.create({...})` call gets rewritten. Mobile styles stay frozen.
- No `Platform.OS` branching is required for the invariant — it is purely viewport-width-driven, so native phones are protected without any platform check.
- CI gate: snapshot test of the home feed at 375px viewport runs on every PR in this initiative.

---

## 3. Foundational decisions

| # | Decision | Why |
|---|---|---|
| D-RESP-1 | Strategy: **adapted side rail + wider content + aside panel** (not centered-mobile-shell, not full-desktop-rewrite) | The only one of three approaches that looks beautiful on desktop without forking the app into two products. Like X / Bluesky / Threads web. |
| D-RESP-2 | Shell: **wide labeled rail + content + secondary aside panel** (not icon-only rail, not top-bar pattern) | Labels help discoverability in Hebrew; aside is where this donations app can shine ("ארגונים מומלצים", "סיוע דחוף") without crowding the feed. |
| D-RESP-3 | Chat: **inbox pattern** (list + thread side-by-side at ≥768) | Centered mobile chat on a wide monitor looks broken. Inbox is the table-stakes desktop messaging UX (WhatsApp Web, Telegram Desktop, Messenger). |
| D-RESP-4 | Forms & settings: **narrow centered** (600px max) | Wide forms with half-empty inputs look worse, not better. |
| D-RESP-5 | Auth & onboarding: **split-screen with brand panel** on desktop | Standard pattern; big first impression. Form on the rail-side, brand artwork on the logical-end side. |
| D-RESP-6 | Breakpoints: `<768 / 768-1023 / 1024-1439 / ≥1440` (mobile / tablet / desktop / wide) | 768=iPad-portrait, where bottom tabs first feel stretched. 1024=where aside stops cramping. 1440=where adding content width hurts readability. |

These six decisions are merged into `docs/SSOT/DECISIONS.md` as a single entry `D-RESP-001` during PR 1.

---

## 4. Breakpoints & layout container

### `useBreakpoint()` hook

New hook in `@kc/ui`. Reads `useWindowDimensions().width` and returns one of `'mobile' | 'tablet' | 'desktop' | 'wide'`. Pure, no JSX. Re-renders when the window resizes.

### Range table

| Token | Range | Shell | Content max-width (wide variant) | Content max-width (narrow variant) |
|---|---|---|---|---|
| `mobile` | `< 768` | Bottom tab bar (current, untouched) | 100% | 100% |
| `tablet` | `768–1023` | Right icon rail (60px) | 640 | 600 |
| `desktop` | `1024–1439` | Right labeled rail (220px) + main + aside (280px) | 680 | 600 |
| `wide` | `≥ 1440` | Same as desktop, just more side-padding | 720 | 600 |

### Layout container

`<AppShell>` wraps every routed screen.

- On mobile, `<AppShell>` is a passthrough (renders its children directly).
- On ≥768, it renders:

  ```
  ┌─────────────────────────────────────────────────────────┐
  │  (aside, optional)  │   <main>          │  (rail, RTL)  │
  │   ≥1024 only        │   screen content  │   60 or 220px │
  └─────────────────────────────────────────────────────────┘
  ```

- The rail sits on the right because right is logical-start in RTL.
- Aside is logical-end (visually on the left in RTL).
- Aside is only rendered at ≥1024 *and* when the current screen provides content via `useAside()`.

### Per-screen variant opt-in

A screen opts into the narrow form-style variant via `expo-router`'s `unstable_settings`:

```tsx
export const unstable_settings = { shellVariant: 'narrow' };
```

`AppShell` reads this from `useSegments()` and caps `<main>` at 600px. Defaults to `'wide'` if omitted.

---

## 5. Shell components (new code)

All five files live in `apps/mobile/src/components/shell/`. Each is ≤ 300 lines per the file cap.

| Component | Purpose | Mounts when |
|---|---|---|
| `useBreakpoint.ts` | Hook returning `'mobile' \| 'tablet' \| 'desktop' \| 'wide'`. | always (returns `'mobile'` at <768) |
| `AppShell.tsx` | Top-level layout. Mobile = passthrough. ≥768 = renders `<NavigationRail>` + `<main>` + optional `<AsidePanel>`. Reads `shellVariant` from active route's `unstable_settings`. | ≥ 768 |
| `NavigationRail.tsx` | The right-side rail. Icon-only on tablet, labeled at ≥1024. Active-tab state mirrors `expo-router`'s pathname. Pulls 5 tab icons from `tabs.config.ts` (extracted from current `TabBar.tsx` — shared source of truth). | ≥ 768 |
| `AsidePanel.tsx` | Generic 280px panel slot on the logical-end side. Receives a render-prop from the current screen via `AsideContext`. If empty, not rendered. | ≥ 1024 |
| `SplitAuthLayout.tsx` | Used only by `(auth)/_layout.tsx` and `(onboarding)/_layout.tsx`. Mobile = passthrough. ≥768 = 50/50 split with the form on the rail-side and a brand panel on the other side. Initial brand panel content = centered app logo on a soft warm gradient (uses existing `colors.surface` / `colors.background`). If a designer ships richer artwork later, it slots in as a single `<BrandPanel>` child. | ≥ 768 |

### Wiring point

Currently `app/apps/mobile/app/_layout.tsx` defines `ShellWithTabBar` (around line 159–186) that renders `<TabBar />` on every page.

This becomes `ShellWithResponsiveChrome`:

- Mobile: renders `<TabBar />` exactly as today (zero diff).
- ≥768: renders `<AppShell>` which itself renders `<NavigationRail>` and (optionally) `<AsidePanel>`. `<TabBar />` is unmounted.

`app/apps/mobile/app/(tabs)/_layout.tsx` does **not** change — `expo-router` still owns route grouping; we just paint different chrome around it.

### Aside content protocol

Each screen that wants an aside calls a hook:

```tsx
useAside(() => <DonationsHighlights />, [deps]);
```

The hook publishes the render-fn to `AsideContext`. On mobile the hook is a no-op. This keeps each screen file in charge of what shows up next to it — no central aside registry.

---

## 6. Per-screen layouts

Categorization of every existing route.

| Route | Variant | Aside (≥1024) | Per-screen change |
|---|---|---|---|
| `(tabs)/index` (Feed) | wide | Trending donations + suggested follows | Cap feed item width at `<main>` (~680). No grid — stays a vertical list. |
| `(tabs)/search` | wide | Recent searches + saved filters | Results stay a single list; existing search bar moves into the screen header (no top-bar pattern). |
| `(tabs)/create` (Composer) | narrow | none | Form. Single 600px column. Identical fields, just constrained. |
| `(tabs)/donations` (index) | wide | "סיוע דחוף" / urgent campaigns | Hero categories grid widens 2-col → 3-col at ≥ desktop. |
| `(tabs)/donations/money` / `time` / `category/[slug]` | wide | Same as parent | Single-column list of orgs / requests inside `<main>`. |
| `(tabs)/profile` (own profile) | wide | Stats summary + saved counts | Header (avatar/name) and tabs stay; post grid widens 2-col → 3-col at desktop. |
| `(tabs)/profile/hidden` / `removed` / `saved` | wide | none | Same post grid. |
| `user/[handle]` (other profile) | wide | "אנשים דומים" / mutual follows | Same as own profile. |
| `post/[id]` (post detail) | wide | Author card + related posts | Image/content centered in `<main>`; comments stay below. No two-column post-vs-comments — kills RTL reading flow. |
| `edit-post/[id]` | narrow | none | Form. |
| `chat/index` | n/a (custom) | none | **Inbox layout** — `chat/_layout.tsx` bypasses `<AppShell>`'s `<main>` cap. Conversations list ~280px on the right, thread placeholder ("בחר/י שיחה") fills the rest. |
| `chat/[id]` | n/a (custom) | none | **Inbox layout** — same screen as `chat/index` but with a thread loaded. At `< 768` it is a separate stack screen as today. |
| `edit-profile` | narrow | none | Form. |
| `settings`, `settings/*` | narrow | none | Forms / list rows. |
| `(auth)/sign-in`, `(auth)/sign-up` | **split** | n/a | `<SplitAuthLayout>`. Brand artwork on the logical-end side (~50% width), form on the rail-side (~50%, max 480 inner). |
| `(onboarding)/*` (basic-info, photo, tour, about-intro) | **split** | n/a | `<SplitAuthLayout>` with progress indicator above the form. |
| `auth/callback`, `auth/verify` | narrow | none | Verification — small centered card. |
| `account-blocked` | narrow | none | Single message card. |
| `legal`, `about`, `about-site` | narrow | none | Long-form text. Already reads ok narrow. |
| `stats` | wide | optional "filters" panel | Tables / charts widen naturally. |
| `(guest)/feed` | wide | Sign-up CTA card | Same as `(tabs)/index`. |

### Chat — the one structural exception

Because chat needs inbox layout, its routes cannot just slot into `<main>`. Implementation: a single `ChatInboxLayout` component at `app/apps/mobile/app/chat/_layout.tsx` that, on ≥768, renders the conversations list + the active thread side-by-side (driven by `useSegments()` to know whether `/chat/[id]` is active). On `< 768`, `_layout.tsx` is a passthrough — the existing stack behavior survives untouched.

---

## 7. Tokens, RTL, dark mode

### Token additions (`packages/ui/src/theme/`)

New file `breakpoints.ts`. Single source of truth for the four ranges, exported as both raw numbers and the `useBreakpoint()` hook. No existing tokens change.

Additive keys on the existing `spacing` scale (new `shell.*` namespace):

- `shell.railCollapsed: 60`
- `shell.railExpanded: 220`
- `shell.aside: 280`
- `shell.contentMaxWide: 720`
- `shell.contentMaxDesktop: 680`
- `shell.contentMaxTablet: 640`
- `shell.contentMaxNarrow: 600`

Typography and colors: **no changes.**

### Dark mode

Already wired (commit 9ee53b8). All new shell components consume `useTheme()` — rail and aside use `colors.surface`, screen background uses `colors.background`. No new color tokens needed.

### RTL checklist (applies to every new component)

1. Use `flexDirection: 'row'` and let RN's RTL flip handle ordering. Never `row-reverse`.
2. Never use `marginLeft` / `marginRight` / `left` / `right`. Use `marginStart` / `marginEnd` / `start` / `end`.
3. Directional icons must use the existing direction-aware icon helpers. The rail uses non-directional icons, so this only matters for `<SplitAuthLayout>`'s "next" button on onboarding.
4. The web `<html dir="rtl">` is already set in `+html.tsx`. No change needed.
5. `<SplitAuthLayout>` web CSS uses logical properties (`inset-inline-start`); verify in dev that the brand panel is on the logical-end side, not visually-left.

---

## 8. Phasing — 5 PRs, each independently shippable

| PR | Title | What ships | Mobile-safe |
|---|---|---|---|
| 1 | `feat(ui): add breakpoints & shell primitives (FR-RESP-001)` | `useBreakpoint`, `AppShell`, `NavigationRail`, `AsidePanel`, `useAside` hook, `SplitAuthLayout`, narrow-variant plumbing, snapshot CI for mobile 375px feed, new SSOT spec file `14_responsive_desktop.md`, `D-RESP-001` in `DECISIONS.md`. No screens wired yet. Behind a `__SHELL_V2__` const defaulting `false` outside dev. | yes — dead code on mobile |
| 2 | `feat(web): wire app shell to (tabs) (FR-RESP-002)` | Replace `ShellWithTabBar` with `ShellWithResponsiveChrome`. Mobile path unchanged. Desktop now shows rail. Aside content is still empty on every screen — that comes in PR 3. Flip `__SHELL_V2__` to `true`. | yes — viewport-guarded |
| 3 | `feat(web): aside panels for feed, donations, profile, search (FR-RESP-003)` | Per-screen `useAside(...)` calls. Real content; not pixel-polished. | yes |
| 4 | `feat(web): chat inbox layout (FR-RESP-004)` | `chat/_layout.tsx` rewrite for ≥768 with list+thread. Standalone PR because chat has its own routing complexity. | yes — `< 768` keeps stack flow |
| 5 | `feat(web): split-screen auth & onboarding (FR-RESP-005)` | `SplitAuthLayout` applied to `(auth)/_layout.tsx` and `(onboarding)/_layout.tsx`. | yes |

Each PR has the `Mapped to spec` line and updates `BACKLOG.md`. On PR 1 the spec status flips `⏳ → 🟡`. On PR 5 it flips `🟡 → ✅`.

---

## 9. SSOT placement

- **New spec file:** `docs/SSOT/spec/14_responsive_desktop.md` (created in PR 1).
- **FR prefix:** `FR-RESP-*` — five ACs, one per PR's deliverable.
- **`BACKLOG.md`:** five new entries `RESP-001 … RESP-005` at priority **P1** (high-impact UX, no business risk).
- **`DECISIONS.md`:** one new entry `D-RESP-001` capturing the six foundational decisions from §3.
- **`CLAUDE.md`:** the spec list in §1 grows from 13 files to 14. PR 1 updates it.

---

## 10. Risks & trade-offs

| Risk | Mitigation |
|---|---|
| `react-native-web` flexbox quirks at the rail / aside boundaries | PR 1 ships a dev-only preview at `/dev/shell-preview` toggling all four breakpoints. Caught early. |
| RTL flips break in `<SplitAuthLayout>` | Snapshot test + manual check at PR 5. |
| Mobile regression sneaks through | 375px viewport snapshot of `(tabs)/index` runs on every PR. `__SHELL_V2__` const lets us flip off in 30 seconds if needed. |
| Bottom tab bar briefly visible during shell switch on viewport resize | `useBreakpoint` is synchronous from `useWindowDimensions`; switch is one render. Acceptable. |
| Native iOS / Android accidentally renders rail | Belt-and-braces: rail is gated on width *and* `Platform.OS === 'web'` in `AppShell`. |
| Designer wants type / color changes after seeing desktop | Out of scope. Added to `TECH_DEBT.md` as `TD-150` if it comes up post-merge. |

---

## 11. Testing protocol

- **Unit (Vitest, in `app/apps/mobile`):**
  - `useBreakpoint` returns correct token at each width threshold (boundary values: 767, 768, 1023, 1024, 1439, 1440).
  - `AppShell` renders correct variant per breakpoint × narrow/wide × aside-present/absent matrix.
  - `useAside` is a no-op on mobile and publishes correctly on ≥1024.
- **Snapshot:** mobile 375px render of `(tabs)/index` — blocks any silent regression.
- **Manual per PR:** open `pnpm --filter @kc/mobile web` at 375 / 800 / 1280 / 1600. iOS sim still launches without warnings.

---

## 12. Out-of-scope, tracked for later

- Native tablet split-view (iPad, Android tablets) — TD-150.
- Type / color refresh for desktop densities — TD-151 if designer requests post-merge.
- PWA install prompt / service-worker upgrades — orthogonal initiative.
- SSR / static export of routes — orthogonal initiative.

---

## 13. Definition of Done (all five PRs merged)

- Snapshot of `(tabs)/index` at 375px is byte-identical to pre-PR-1 baseline.
- Manual walkthrough on a 1440×900 monitor: every screen in §6 matches its row's described layout.
- `BACKLOG.md` shows `RESP-001 … RESP-005` as `✅ Done`.
- `docs/SSOT/spec/14_responsive_desktop.md` status header reads `✅`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` all green on `dev`.
