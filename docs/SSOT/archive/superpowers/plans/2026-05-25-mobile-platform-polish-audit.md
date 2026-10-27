# Mobile Platform Polish & Bottom-Bar Safety — Implementation Plan (v2 — Council-reviewed)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Council review log (2026-05-25)

Four independent reviewers stress-tested v1: iOS specialist, Android specialist, Web/RN-Web specialist, plan-quality auditor. Corrections applied in v2:

**Critical patches:**
- **Test toolchain fixed.** v1 imported from `@testing-library/react-native` + `renderHook` from same; the mobile package uses `@testing-library/react@16` + `vitest` with `// @vitest-environment jsdom`. All test snippets in v2 use the correct imports and the jsdom pragma. Verified against `app/apps/mobile/package.json` and the existing `AppShell.snapshot.test.tsx` pattern.
- **Native-header double-padding (iOS Blocker #1).** Screens registered with `headerShown: true` (e.g. `edit-profile`, `post/[id]`, `account-blocked`, the `(tabs)/donations`, `(tabs)/profile`, `user/[handle]` group layouts) consume top safe area via the native header. The `Screen` primitive's default `edges={['top']}` would double-pad. v2 adds a `hasNativeHeader?: boolean` prop that drops `'top'` from the effective edges.
- **Keyboard offset (iOS Blocker #2).** v1 hardcoded `headerHeight=44`. v2's `useKeyboardVerticalOffset()` reads `useHeaderHeight()` from `@react-navigation/elements` when available (native-header screens), accepts an explicit override (custom-header screens like `chat/[id]`), and defaults to `insets.top` only when no header is shown (auth/onboarding).
- **Android `softwareKeyboardLayoutMode` precondition (Android Blocker #1).** Expo SDK 54 default is `adjustPan`; `useKeyboardVerticalOffset() = 0` on Android only works under `adjustResize`. v2 adds a Phase 0.5 task that pins `app.json` to `"android.softwareKeyboardLayoutMode": "resize"` + `"androidStatusBar.translucent": true`.
- **Left/right insets unhandled (Android Blocker #2).** Waterfall + curved-edge + landscape-with-notch devices have `insets.left`/`insets.right` > 0. v2 adds AC1b and updates the TabBar wrapper + scrollable content to consume these alongside bottom.
- **Material `arrow-back` vs `arrow-forward` (Android Blocker #3).** v1 used `arrow-forward`; v2's `useDirectionalBackIcon` returns `chevron-back` on iOS and `arrow-back` on Android — Android's framework auto-mirrors the icon in RTL contexts. Hebrew-RTL users get the right-pointing arrow they expect from every other native app.
- **Dynamic Type ceiling (iOS + Android Concern).** v1's `MAX_FONT_SCALE = 1.3` denied a11y to AX users (iOS AX1–AX5 = 1.64×–3.12×; Android a11y to 2.0×). v2 introduces `MAX_FONT_SCALE_TIGHT = 1.35` for fixed-height grid cells only, and `MAX_FONT_SCALE_FLEX = Platform.select({ ios: 2.0, android: 2.0, web: 1.5 })` for everything else. Decision recorded as a new `D-RESP-006` in `docs/SSOT/DECISIONS.md`.
- **Mobile Safari viewport (Web Concern #1).** v2 adds a runtime CSS injection in `_layout.tsx` for `html, body, #root { min-height: 100dvh }` with `100%` fallback, so the TabBar pill anchors to the *visible* viewport, not the layout viewport that includes the collapsed address bar.
- **PR B split.** v1's PR B touched 18 screens. v2 splits into **PR B1** (tabs cluster, 6 screens) and **PR B2** (root + user-profile cluster, 12 screens) — independent, easier to review/revert.
- **SSOT flip folded into Task 1.** v1 deferred the BACKLOG 🟡 flip to a follow-up PR — violated CLAUDE.md §4. v2 flips the status inside Task 1's commit.
- **Dead helper removed.** v1 promised `useShellTabBarBottomPx` in the File structure section; never built. v2 drops the promise (every consumer is fine with the existing `useShellTabBarScrollInset`).
- **Task 11 enumeration.** v1 said "every `<Text>` in tight rows"; v2 lists exact file:line targets.
- **PR B1/B2 task-per-file.** v1 collapsed 7 settings screens into "same pattern" bullets. v2 has one Step per screen with explicit old/new diff sketches.
- **Phase 5 negotiation removed.** v1 said "by adding a maxFontSizeMultiplier field on typography? No — …"; v2 just states the decision.

**Confirmed sound (no change):**
- Touch ID iPhone (SE/8, `insets.bottom = 0`) correctly handled by `useShellTabBarScrollInset`.
- `SafeAreaProvider` scope (single provider in root `_layout.tsx`) is correct.
- `useShellTabBarVisibility` correctly suppresses on `chat/[id]`.
- TabBar pill clears Android gesture-bar handle (`pointerEvents="box-none"` + position absolute).
- RTL symmetry of TabBar pill (`left/right: HORIZONTAL_INSET`) is web-safe.
- `expo-router` route analysis doesn't break (hooks called inside component bodies).
- `+html.tsx` is dead code under `web.output: "single"` — v2 does not touch it.

**v3 patches — Israeli UI + Hebrew content skills applied (2026-05-25):**

After the council review, the user requested that the plan also consume two specialist skills: `skills-il/localization@israeli-ui-design-system` and `skills-il/localization@hebrew-content-writer`. Both were installed globally and read. Their guidance produced these additional patches:

- **Hebrew typography minimums (israeli-ui-design-system §2).** The skill mandates **16px minimum body text** and **line-height ≥1.7** for Hebrew. Today `app/packages/ui/src/theme/typography.ts` ships:
  - `body: fontSize 14, lineHeight 22` → ratio 1.57 — **below the Hebrew minimum 1.7**.
  - `bodyLarge: fontSize 16, lineHeight 24` → ratio 1.5 — **below 1.7**.
  - `caption: fontSize 11` and `bodySmall: fontSize 12` → **below the Hebrew minimum 13px**.

  v3 adds a new **Task 14** in PR D that raises `body` line-height to 24 (ratio 1.71), `bodyLarge` line-height to 28 (1.75), `bodySmall` font-size to 13, and `caption` font-size to 12 (and only for sub-second-line metadata where any smaller would be cruel). Recorded in `D-RESP-006` alongside the dynamic-type decision.

- **Directional-icon mirroring beyond back buttons (israeli-ui-design-system §3 + Gotcha).** v2 only fixed the back-icon helper. The skill is explicit: every *directional* icon must mirror in RTL via `transform: scaleX(-1)`; every *non-directional* icon (search, home, settings) must NOT mirror. v3 adds **Task 15** to grep for `chevron-forward`/`chevron-back`/`arrow-*`/`caret-*` usage outside the back-button helper, plus `play`/`forward`/`backward` glyphs, and either replace with the right directional twin or wrap in a `<MirroredIcon>` primitive.

- **`<bdi>` / `dir="ltr"` for English-in-Hebrew (israeli-ui-design-system §7 + hebrew-content-writer §7).** Web routes that render user handles, hashtags, English brand names, URLs, or phone numbers inside Hebrew copy can have their surrounding punctuation reordered by the browser bidi algorithm. v3 adds **Task 16** to audit `apps/mobile/src/components/post-detail/`, `apps/mobile/src/components/chat/`, `apps/mobile/src/components/profile/` for inline English runs and wrap them in either `<Text>` with `style={{ writingDirection: 'ltr' }}` (native) or pass them through a `<EnglishRun>` helper that renders `<bdi>` on web.

- **Hebrew copy register audit (hebrew-content-writer §1 + §6).** Today's locale file `apps/mobile/src/i18n/locales/he/` mixes registers: settings rows read business-formal ("בקרת מצב חשבון"), error messages read formal-passive ("אירעה שגיאה — נסה שנית"), and CTAs read marketing-soft ("נשמח אם תצטרף"). v3 adds **Task 17** to normalize to two registers:
  - **UX direct** (`hebrew-content-writer` Step 6) for buttons, errors, toasts, form labels: imperative, ≤4 words, action-first. *"שלחו לנו את המספר"*, *"תבדקו את החיבור"*, *"סליחה על העיכוב. תיקנו את זה"*.
  - **Business** for settings rows, FAQ, about page: clear, neutral, neither padded nor dugri.

  Out of scope: rewriting the about page narrative (that's content work, not audit).

- **Gender-neutral UX strings (hebrew-content-writer §3 Option C).** Today's locale mostly uses masculine defaults ("אתה יכול לבחור", "המשתמש צריך"). v3 adds **Task 18** to rewrite UX strings using Option C neutral phrasing ("ניתן לבחור", "יש לבחור"). Out of scope: any string that the user-profile system needs to gender (e.g. push-notification "X started following you" — those follow the recipient's saved gender pref, separate work tracked under TD-160-related entries).

- **Calque scrubbing (hebrew-content-writer §9).** Quick grep for the five known calques: "זה עושה סנס", "בסוף היום", "בכדי" (overused), "המשתמש צריך", "אתה צריך". v3 adds these to the same Task 17/18 sweep.

- **Shekel / date / time formatting (israeli-ui-design-system §7).** App is a non-profit community, no prices, no shekel sign anywhere. Dates use `date-fns` with `he` locale. **Confirmed sound** — no work needed.

- **Hebrew font fallback chain (israeli-ui-design-system §1).** Today `typography.ts` does `Platform.select({ ios: 'System', android: 'Roboto', default: 'System' })` — relies entirely on system Hebrew fonts. The skill recommends a fallback chain: `'Segoe UI', 'Rubik', 'Heebo', Arial, sans-serif`. **Out of scope** for this plan — wholesale font swap is its own UX decision and would land via FR-RESP / design-system work; v3 records this as **TD-164 (proposed)** and moves on.

**v3 additions to PR/task topology:**
- New **PR D — Hebrew typography & content polish** with **Tasks 14–18**. Branch: `feat/FR-RESP-006-fe-hebrew-polish`. PR D ships after PR C and is itself low-risk: typography token changes auto-apply across screens; locale-string edits are content-only and revertable per key.
- Spec adds **AC17–AC20** covering Hebrew minimums, icon mirroring, register, and gender-neutral copy.

**v4 patches — `hebrew-rtl-best-practices` skill applied (2026-05-25):**

The user invoked the third skill, `hebrew-rtl-best-practices`. Most of its content overlaps with `israeli-ui-design-system` (logical properties, icon mirroring, font stack, typography minimums). Three findings are genuinely new and patched into v4:

- **`<bdi>` vs `<bdo>` distinction (Step 3).** `<bdi>` isolates + auto-detects direction (right for user-generated content of unknown direction); `<bdo dir="ltr">` forces direction (right for content that must stay LTR regardless — codes, phone numbers, snippets). v3's `EnglishRun` primitive uses `<bdi>` only. v4 widens Task 16 to accept a `mode?: 'isolate' | 'force-ltr'` prop (default `'isolate'`) that switches between the two on web, and between `writingDirection: 'ltr'` (force) vs `textAlign: 'auto'` (isolate-equivalent) on native.

- **`dir="auto"` / `unicode-bidi: plaintext` for free-text inputs (Step 3 + Gotcha).** When the user can type either Hebrew or English (search query, post title, message body, search-handle field), the input should auto-detect base direction per value rather than forcing RTL. The plan v3 had no provision for this. v4 adds **Task 19** to grep every `<TextInput>` and `<TextInput.placeholder>` site for free-text fields and apply `textAlign="auto"` + `writingDirection: 'auto'` (the RN equivalent of `dir="auto"`).

- **Shadows + gradients do not auto-flip (Step 3 end).** CSS logical properties mirror layout, but `box-shadow`, `text-shadow`, and `linear-gradient` offsets/angles are physical. Today `app/packages/ui/src/theme/spacing.ts` ships `shadow.card.shadowOffset: { width: 0, height: 1 }` and `shadow.modal.shadowOffset: { width: 0, height: 4 }` — both `width: 0` (vertical-only), so symmetric — **confirmed sound**. v4 adds a grep step inside Task 19 that fails if any future shadow introduces a non-zero `width`, plus the same check for `linear-gradient` strings (none today; RN doesn't ship gradients without `expo-linear-gradient`, which is not in deps).

- **`flexDirection: 'row-reverse'` double-flip (Gotcha).** The skill warns that adding `row-reverse` inside an already-RTL document creates a double-flip back to LTR. TD-158 (already closed per the project's recent commits) addressed this systematically; v4 records that it's checked and references the closed TD rather than re-doing the work.

- **`:dir(rtl)` CSS pseudo-class.** Web-CSS only. RN's StyleSheet system does not compile to CSS selectors, and v3's `MirroredIcon` uses `I18nManager.isRTL` at the component level which works correctly on iOS / Android / RN-Web. No change needed.

**v4 additions:**
- Task 19 in PR D: `<TextInput dir="auto">` sweep + shadow/gradient horizontal-offset audit.
- Task 16 (Hebrew Bidi `EnglishRun`) extended with `mode` prop.
- Spec adds **AC21** (free-text inputs use `auto` direction) and **AC22** (shadows/gradients audited; no horizontal-physical offsets remain).

**Deferred to follow-up TDs (not addressed in this plan):**
- **TD-160 (proposed):** Foldable unfold transition — `react-native-screens` re-mount frame timing across the 768pt breakpoint. Inner-display unfold is a sanity-only check in this plan.
- **TD-161 (proposed):** Status bar style per-screen — light icons on dark backgrounds (post detail hero). Out of scope here; opened as its own TD.
- **TD-162 (proposed):** Portrait-only orientation lock vs. true landscape support — `app.json` currently allows default orientation. The matrix tests landscape but a full landscape design pass is out of scope.
- **TD-163 (proposed):** First-paint flash on hard refresh when `useSafeAreaInsets` returns `{0,0,0,0}` before native bridge resolves. Acceptable for MVP; revisit when splash-screen UX is tightened.

**Goal:** Make every screen render correctly on iPhone (incl. SE → 16 Pro Max), Android, and mobile web — no content hidden behind the floating tab bar, consistent safe-area handling, platform-aware chrome (back-icon direction, keyboard offset, dynamic-type clamping), and one canonical scrollable-screen primitive that future screens can re-use.

**Architecture:** Extend the existing `Screen` primitive (`app/apps/mobile/src/components/ui/Screen.tsx`) so it owns SafeAreaView edges + the floating-tab-bar bottom inset in one place. Then sweep every screen that previously hand-rolled its own SafeAreaView/ScrollView to consume the primitive or the existing `useShellTabBarScrollInset` hook. Add three small platform helpers (`useDirectionalBackIcon`, `useKeyboardVerticalOffset`, `clampFontScale`) for the remaining cross-platform paper cuts. The audit is mapped to a new **FR-RESP-006** in `spec/14_responsive_desktop.md`.

**Tech Stack:** React Native (Expo 53) + expo-router + `react-native-safe-area-context` + `@kc/ui` (existing `Screen`, `useShellTabBarScrollInset`, `useShellTabBarVisibility`, `shellTabBarHeightPx`, `typography`, `spacing`). No new dependencies.

**Scope (29 screens audited):**

| Group | Screen | Currently reserves tab-bar inset? | Tab-bar visible there? |
|---|---|---|---|
| Tabs | `(tabs)/index.tsx` (Home Feed → `PostFeedList`) | ❌ | ✅ |
| Tabs | `(tabs)/search.tsx` | ❌ | ✅ |
| Tabs | `(tabs)/create.tsx` | ❌ | ✅ |
| Tabs | `(tabs)/donations/index.tsx` | ❌ | ✅ |
| Tabs | `(tabs)/donations/money.tsx` | ❌ | ✅ |
| Tabs | `(tabs)/donations/time.tsx` | ❌ | ✅ |
| Tabs | `(tabs)/donations/category/[slug].tsx` | ❌ | ✅ |
| Tabs | `(tabs)/profile/index.tsx` | ✅ | ✅ |
| Tabs | `(tabs)/profile/closed.tsx` | ✅ | ✅ |
| Tabs | `(tabs)/profile/hidden.tsx` | ✅ | ✅ |
| Tabs | `(tabs)/profile/removed.tsx` | ✅ | ✅ |
| Tabs | `(tabs)/profile/saved.tsx` | ✅ | ✅ |
| Root | `stats.tsx` | ❌ | ✅ |
| Root | `settings.tsx` | ❌ | ✅ |
| Root | `settings/notifications.tsx` | ❌ | ✅ |
| Root | `settings/appearance.tsx` | ❌ | ✅ |
| Root | `settings/audit.tsx` | ❌ | ✅ |
| Root | `settings/report-issue.tsx` | ❌ | ✅ |
| Root | `settings/follow-requests.tsx` | ❌ | ✅ |
| Root | `chat/index.tsx` (inbox) | ❌ | ✅ |
| Root | `chat/[id].tsx` (thread) | n/a (own composer) | ❌ (suppressed) |
| Root | `post/[id].tsx` | ✅ | ✅ |
| Root | `edit-profile.tsx` | n/a (own footer CTA) | ❌ |
| Root | `edit-post/[id].tsx` | n/a (own footer CTA) | ❌ |
| Root | `about.tsx` (`AboutLandingScreen`) | ✅ | ✅ |
| User | `user/[handle]/index.tsx` | ❌ | ✅ |
| User | `user/[handle]/followers.tsx` | ❌ | ✅ |
| User | `user/[handle]/following.tsx` | ❌ | ✅ |
| Auth/Onboarding/Guest | all `(auth)/*`, `(onboarding)/*`, `(guest)/feed.tsx` | n/a | ❌ (suppressed by shell) |

**11 screens need the inset added.** A further **7 screens** carry stale `edges={['bottom']}` on their root SafeAreaView while the TabBar already handles the bottom safe area — over-counting padding.

**Out of scope (deliberately not touched):** desktop-web aside panels (FR-RESP-003), chat two-pane layout (FR-RESP-004), split-screen auth (FR-RESP-005), tab-bar visual redesign, dark/light theming changes, RTL re-layout of any component.

---

## File structure

**New files:**
- `app/apps/mobile/src/lib/platform/useDirectionalBackIcon.ts` — chooses `chevron-forward` (iOS) / `arrow-forward` (Android/web) for the RTL back affordance.
- `app/apps/mobile/src/lib/platform/useKeyboardVerticalOffset.ts` — returns the right `KeyboardAvoidingView.keyboardVerticalOffset` given header height + insets.
- `app/apps/mobile/src/lib/platform/fontScale.ts` — single-source `MAX_FONT_SCALE = 1.3` constant + `clampFontScale` helper for `<Text maxFontSizeMultiplier={…}>`.
- `app/apps/mobile/src/lib/platform/__tests__/useDirectionalBackIcon.test.tsx`
- `app/apps/mobile/src/lib/platform/__tests__/useKeyboardVerticalOffset.test.tsx`
- `app/apps/mobile/src/lib/platform/__tests__/fontScale.test.ts`
- `app/apps/mobile/src/components/ui/__tests__/Screen.tabBarInset.test.tsx`

**Modified files (Phase 1 — primitive + hook):**
- `app/apps/mobile/src/components/ui/Screen.tsx` — accept `tabBarInset?: boolean` (default `true`); when true and `useShellTabBarVisibility()` is true, add `useShellTabBarScrollInset()` to `contentContainerStyle.paddingBottom`. Drop the default `edges={['top']}` in favour of `['top']` only when no `bottom` is in edges (kept for back-compat); never include `['bottom']` when the TabBar is visible (it owns that inset).
- `app/apps/mobile/src/navigation/useShellTabBarVisibility.ts` — export `useShellTabBarBottomPx()`: a thin wrapper that returns `shellTabBarHeightPx(useShellTabBarVisibility()) + insets.bottom` *with no extra padding* (the current `useShellTabBarScrollInset` adds `spacing.lg` by default — fine for ScrollView content, wrong for floating CTAs that already have their own padding).
- `app/apps/mobile/src/components/PostFeedList.tsx` — replace fixed `paddingBottom: spacing['3xl']` with `paddingBottom: useShellTabBarScrollInset()` (becomes the lever for Home Feed + every consumer).

**Modified files (Phase 2 — tab screens that crop):**
- `app/apps/mobile/app/(tabs)/index.tsx` — auto-fixed by PostFeedList change; verify visually.
- `app/apps/mobile/app/(tabs)/search.tsx` + `(tabs)/search.styles.ts` — drop `paddingBottom` from `contentInner`, wire inset.
- `app/apps/mobile/app/(tabs)/create.tsx` + `(tabs)/create.styles.ts` — wire inset on the scroll content.
- `app/apps/mobile/app/(tabs)/donations/index.tsx` — wire inset on the scroll content.
- `app/apps/mobile/app/(tabs)/donations/money.tsx` — drop stale `edges={['bottom']}`, wire inset.
- `app/apps/mobile/app/(tabs)/donations/time.tsx` — drop stale `edges={['bottom']}`, wire inset.
- `app/apps/mobile/app/(tabs)/donations/category/[slug].tsx` — drop stale `edges={['bottom']}`, wire inset.

**Modified files (Phase 3 — root-level screens that crop):**
- `app/apps/mobile/app/stats.tsx` + inline styles — wire inset.
- `app/apps/mobile/app/settings.tsx` + `settings.styles.ts` — wire inset.
- `app/apps/mobile/app/settings/notifications.tsx` + inline styles — wire inset.
- `app/apps/mobile/app/settings/appearance.tsx` — wire inset.
- `app/apps/mobile/app/settings/audit.tsx` — wire inset (it's a `FlatList`).
- `app/apps/mobile/app/settings/report-issue.tsx` — wire inset.
- `app/apps/mobile/app/settings/follow-requests.tsx` — wire inset.
- `app/apps/mobile/app/chat/index.tsx` + `chat/chatScreenStyles.ts` — wire inset on the inbox `FlatList`.
- `app/apps/mobile/app/user/[handle]/index.tsx` — wire inset on the outer ScrollView.
- `app/apps/mobile/app/user/[handle]/followers.tsx` — wire inset.
- `app/apps/mobile/app/user/[handle]/following.tsx` — wire inset.

**Modified files (Phase 4 — platform helpers):**
- `app/apps/mobile/app/(guest)/feed.tsx` — replace inline `Platform.OS === 'ios' ? 'chevron-forward' : 'arrow-forward'` with `useDirectionalBackIcon()`.
- `app/apps/mobile/src/components/BackButton.tsx` — same.
- `app/apps/mobile/app/chat/[id].tsx` — replace `keyboardVerticalOffset={88}` with `useKeyboardVerticalOffset()`.
- `app/apps/mobile/app/edit-profile.tsx` — same.
- `app/apps/mobile/app/(onboarding)/basic-info.tsx` — same.
- `app/apps/mobile/app/(auth)/sign-in.tsx`, `(auth)/sign-up.tsx` — same.
- `app/apps/mobile/app/settings/report-issue.tsx` — same.
- `app/apps/mobile/src/components/OnboardingSoftGateModal.tsx`, `src/components/profile/BanUserModal.tsx` — same.

**Modified files (Phase 5 — typography scaling):**
- `app/packages/ui/src/theme/typography.ts` — export `MAX_FONT_SCALE` from `lib/platform/fontScale.ts` indirectly by adding a `maxFontSizeMultiplier` field on the `typography` exports? **No** — `typography` is a style object; instead expose a `<KcText>` wrapper or stick to passing `maxFontSizeMultiplier` at use sites that ship body copy in tight rows. The minimal-viable move is documenting and patching the three known offenders: `PostCard.tsx`, `InboxChatRow.tsx`, `MessageBubble.tsx`.

**New file (Phase 1.5 — device-matrix snapshot guards):**
- `app/apps/mobile/src/components/ui/__tests__/Screen.deviceMatrix.test.tsx` — parametrised render at five representative viewport widths × insets (iPhone SE 375×667/20/0, iPhone 13 mini 375×812/50/34, iPhone 16 Pro 393×852/59/34, iPhone 16 Pro Max 430×932/59/34, small Android 360×800/0/16). For each, mount `<Screen scroll />`, read the resolved `paddingBottom` of the inner `ScrollView`'s `contentContainerStyle`, and assert it is `≥ 76 + insets.bottom` (the floating pill height + safe area) whenever `useShellTabBarVisibility()` is true. Catches regressions where a device profile with `bottom = 0` (Touch ID iPhones) silently drops the inset.

**Modified files (Phase 6 — SSOT updates):**
- `docs/SSOT/spec/14_responsive_desktop.md` — add **FR-RESP-006** section (status ⏳ → 🟡 → ✅).
- `docs/SSOT/BACKLOG.md` — add `RESP-006` row.
- `docs/SSOT/TECH_DEBT.md` — close opportunistic TDs touched along the way; surface anything left over (e.g. typography scaling beyond the three offenders).

---

## Sequencing and PR strategy

The plan ships as **three PRs** to `dev` (per CLAUDE.md §6). All three PRs are pure-FE; no migrations, no infra. Each PR ends with a green `pnpm typecheck && pnpm test && pnpm lint` from `app/`.

- **PR A — FR-RESP-006 foundation** (Tasks 1–3): SSOT entries + `Screen` primitive extension + `useShellTabBarBottomPx` + `PostFeedList` consumer + snapshot test. Branch: `feat/FR-RESP-006-fe-screen-tabbar-inset`.
- **PR B — Screen sweep** (Tasks 4–8): wire inset into the 18 screens listed above; drop stale `edges={['bottom']}`. Branch: `feat/FR-RESP-006-fe-screen-sweep`.
- **PR C — Platform helpers + typography clamps** (Tasks 9–13): `useDirectionalBackIcon` / `useKeyboardVerticalOffset` / `clampFontScale`; migrate call sites; mark FR-RESP-006 ✅ in spec + BACKLOG. Branch: `feat/FR-RESP-006-fe-platform-helpers`.

If executing under §13 autonomous loop: open PR A, wait for CI, merge, then start PR B in a fresh iteration. Don't bundle — these are independent enough that PR B can be reverted without touching PR A's primitive.

---

# PR A — Foundation (Tasks 1–3)

## Task 1: Add FR-RESP-006 to the spec and BACKLOG

**Files:**
- Modify: `docs/SSOT/spec/14_responsive_desktop.md` (append a new section after FR-RESP-005)
- Modify: `docs/SSOT/BACKLOG.md` (append `RESP-006` row in the responsive section)

- [ ] **Step 1: Read the current end of `spec/14_responsive_desktop.md`**

Run: `tail -20 docs/SSOT/spec/14_responsive_desktop.md`

Expected: ends with FR-RESP-005 paragraph. Confirm there's no FR-RESP-006 already.

- [ ] **Step 2: Append the new FR section**

Use the Edit tool to append to `docs/SSOT/spec/14_responsive_desktop.md`. The exact text:

```markdown

## FR-RESP-006 — Mobile platform polish & bottom-bar safety

**Status:** ⏳ Planned

Cross-cutting fix for content cropping behind the floating tab bar on mobile + platform-aware paper cuts. Audit-driven, mapped 1:1 to plan `docs/SSOT/archive/superpowers/plans/2026-05-25-mobile-platform-polish-audit.md`.

**ACs:**
- AC1. Every screen where `useShellTabBarVisibility()` returns `true` reserves enough bottom inset on its scrollable content (or on its floating footer) that the last row is fully visible above the floating-pill TabBar across the **full supported-device matrix**: iPhone SE 2nd/3rd gen (375×667, 20pt top inset, 0pt bottom), iPhone 8 (375×667, 20pt/0pt), iPhone 12/13 mini (375×812 — the narrowest modern Face ID iPhone, 50pt notch, 34pt home-indicator), iPhone X / XR / 11 / 11 Pro / 11 Pro Max (375–414×812–896, 44pt notch), iPhone 12–13 (390×844, 47pt notch), iPhone 14 Pro through 16 Pro / 16 Pro Max (393–430×852–932, 59pt Dynamic Island); small Android (360×640, gesture-nav or 3-button-nav), standard Android (393×873, Pixel 6/7/8), large Android (412×915, Pixel Pro), Android foldable closed (≈360×780, Z Fold outer); mobile web at 320 / 360 / 375 / 414 / 430 viewport widths (Mobile Safari + Chrome). The visible-cell check holds at default Dynamic Type **and** at the OS-level "Larger Text" / "Largest" setting (Android font scale 1.0 → 1.3).
- AC2. The `Screen` primitive (`apps/mobile/src/components/ui/Screen.tsx`) accepts a `tabBarInset?: boolean` prop (default `true`) and adds `useShellTabBarScrollInset()` to its scroll content's `paddingBottom` automatically when on.
- AC3. No screen carries `edges={['bottom']}` on its root SafeAreaView while `useShellTabBarVisibility()` is `true` for that screen.
- AC4. `useDirectionalBackIcon()` returns `chevron-forward` on iOS and `arrow-forward` on Android / web; every existing `Platform.OS === 'ios' ? 'chevron-forward' : 'arrow-forward'` call site consumes it.
- AC5. `useKeyboardVerticalOffset()` returns a sensible value per platform (iOS: header height + top inset; Android / web: 0) and replaces every hardcoded `keyboardVerticalOffset={88}`.
- AC6. `Text` elements in tight rows (`PostCard`, `InboxChatRow`, `MessageBubble`) cap dynamic-type at `MAX_FONT_SCALE = 1.3` via `maxFontSizeMultiplier`, preventing iOS large-text users from breaking grid layouts.
- AC7. A snapshot test at `apps/mobile/src/components/ui/__tests__/Screen.tabBarInset.test.tsx` proves that the `Screen` primitive's `contentContainerStyle.paddingBottom` includes the tab-bar height when visible and excludes it when suppressed.
- AC8. Mobile invariants from FR-RESP-001 (375px snapshot) and FR-RESP-002 (no shell regression) still pass.
- AC9. Screens registered with `headerShown: true` (native Expo Router header) do **not** double-pad: the `Screen` primitive's effective edges drop `'top'` when its new `hasNativeHeader` prop is set. Verified by an explicit test at `Screen.nativeHeader.test.tsx`.
- AC10. `useKeyboardVerticalOffset()` reads the actual rendered header height when available (`useHeaderHeight()` from `@react-navigation/elements` for native-header screens; explicit numeric override for custom-header screens; `insets.top` only when no header). Tests cover all three branches.
- AC11. **Dynamic Type policy** (recorded in `DECISIONS.md` as `D-RESP-006`):
  - `MAX_FONT_SCALE_TIGHT = 1.35` — applied to `<Text>` nodes inside fixed-height grid cells / one-line rows: `PostCard.title`, `PostCard.snippet` (line-clamped), `InboxChatRow.name`, `InboxChatRow.lastMessage`, `MessageBubble.timestamp`.
  - `MAX_FONT_SCALE_FLEX = Platform.select({ ios: 2.0, android: 2.0, web: 1.5 })` — applied to long-form body copy (post detail body, about page, donation descriptions).
  - Default `<Text>` not in either list keeps the system default (no cap).
- AC12. App-level platform preconditions are encoded in `app.json`:
  - `expo.android.softwareKeyboardLayoutMode = "resize"` (required for `useKeyboardVerticalOffset() = 0` on Android to be correct).
  - `expo.androidStatusBar.translucent = true` (required for `useSafeAreaInsets().top` to return a non-zero value on Android).
- AC13. Left/right safe-area insets are honored on (a) the floating TabBar wrapper in `ShellWithResponsiveChrome.tsx` and (b) every scrollable's `contentContainerStyle` that previously used only horizontal `spacing.base`. Verified manually on iPhone 16 Pro Max landscape (`insets.left = 59`) and on a Galaxy Z Fold landscape sanity check.
- AC14. **Mobile Safari visible-viewport fix:** root `_layout.tsx` injects a runtime CSS rule `html, body, #root { min-height: 100dvh; height: 100dvh; }` (with `100%` declared first as fallback for Safari < 15.4). The floating TabBar pill remains visible regardless of address-bar collapse state. Verified by integration check that `document.documentElement.style.minHeight` contains `dvh` after mount.
- AC15. `FlatList` / `ScrollView` `contentContainerStyle` arrays that include the dynamic `tabBarPad` are memoized with `useMemo(() => [..., { paddingBottom: tabBarPad }], [tabBarPad])` — prevents inner ScrollView content-size cache invalidation on iOS when route changes trigger re-renders.
- AC16. **Manual matrix executed** across all four tiers (iOS phones from SE through 16 Pro Max; Android compact + standard + large + foldable closed; iPad mini portrait + iPad 10th gen + iPad Pro 13" landscape; Mobile Safari + Chrome at 320/360/375/414/430/768/1024/1440), with OS-Largest-Text setting on. Failed cells filed as `TD-1xx` entries.
- AC17. **Hebrew typography minimums** (from `skills-il/localization@israeli-ui-design-system`): `typography.body.lineHeight / typography.body.fontSize ≥ 1.7`; `typography.bodyLarge.lineHeight / typography.bodyLarge.fontSize ≥ 1.7`; minimum `fontSize ≥ 13` on every body-or-larger token; `caption` (sub-metadata only) can stay at 12. Tested via `typography.hebrewMinimums.test.ts`.
- AC18. **Directional-icon mirroring policy** (from `israeli-ui-design-system` §3 + Gotcha): every directional icon (chevron, arrow, caret, play/forward/backward, slider track-direction) outside the centralised `useDirectionalBackIcon()` helper is either replaced by its RTL twin or wrapped in a `<MirroredIcon>` primitive that applies `transform: scaleX(-1)` only when `I18nManager.isRTL`. Non-directional icons (search, home, settings, bell, gear) MUST NOT mirror. Verified by grep + manual matrix.
- AC19. **Hebrew UX copy register** (from `hebrew-content-writer` §1 + §6): all locale keys for buttons, errors, toasts, and form labels are in the **UX direct** register — imperative mood, ≤4 words where possible, no padded softeners ("נשמח אם…", "אנא…", "ייתכן ש…"). Settings rows, FAQ, and about narrative remain in the **business** register. Audited via `pnpm lint:hebrew-register` (a new dev-time check that flags known padded patterns in `apps/mobile/src/i18n/locales/he/**`).
- AC20. **Gender-neutral UX strings** (from `hebrew-content-writer` §3 Option C): every UX locale string for the current user uses neutral phrasing (`ניתן לבחור`, `יש להזין`) instead of masculine defaults (`אתה יכול לבחור`, `המשתמש צריך`). Strings that refer to *another* user (e.g. push-notification "X started following you") are explicitly excluded and tracked under their own follow-up. Audited via the same `pnpm lint:hebrew-register` check.
- AC21. **Free-text inputs use auto direction** (from `hebrew-rtl-best-practices` Step 3): every `<TextInput>` whose content can be either Hebrew or English (search query, post title, message body, post snippet, handle search, comment text) sets `textAlign="auto"` and `writingDirection: 'auto'`. Numeric / single-direction fields (phone, postal code) keep their fixed direction. Verified by a grep + manual cross-check.
- AC22. **Shadows + gradients have no horizontal physical offsets** (from `hebrew-rtl-best-practices` Step 3 end): every `shadowOffset`, `text-shadow`, and `linear-gradient` literal in the codebase either has `width === 0` (symmetric) or is wrapped in a `:dir(rtl)` / `I18nManager.isRTL` conditional that flips it. Audited by grep — no horizontal offsets exist today; the audit script in `app/apps/mobile/scripts/lintRtlShadows.mjs` fails CI if a future PR introduces one without an RTL guard.
```

- [ ] **Step 3: Add the BACKLOG row**

Edit `docs/SSOT/BACKLOG.md` — insert immediately after the `RESP-005` row (currently the last row in the responsive group):

```markdown
| RESP-006 | **Mobile platform polish & bottom-bar safety** — extend `Screen` primitive with tab-bar inset; sweep all screens that crop; platform helpers for back-icon + keyboard offset; clamp Dynamic Type in tight rows (FR-RESP-006) | agent-fe | ⏳ Planned | `spec/14_responsive_desktop.md` FR-RESP-006 |
```

- [ ] **Step 4: Commit the spec changes**

```bash
git switch -c feat/FR-RESP-006-fe-screen-tabbar-inset
git add docs/SSOT/spec/14_responsive_desktop.md docs/SSOT/BACKLOG.md
git commit -m "docs(ssot): add FR-RESP-006 mobile platform polish + bottom-bar safety"
```

---

## Task 2: Extend the `Screen` primitive with built-in tab-bar inset

**Files:**
- Modify: `app/apps/mobile/src/components/ui/Screen.tsx`
- Modify: `app/apps/mobile/src/navigation/useShellTabBarVisibility.ts` (export `useShellTabBarBottomPx`)
- Test: `app/apps/mobile/src/components/ui/__tests__/Screen.tabBarInset.test.tsx` (new)

- [ ] **Step 1: Write the failing snapshot test for `Screen` + tab-bar inset**

Create `app/apps/mobile/src/components/ui/__tests__/Screen.tabBarInset.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { ScrollView, Text } from 'react-native';
import { render } from '@testing-library/react';
import { Screen } from '../Screen';

vi.mock('../../../navigation/useShellTabBarVisibility', () => ({
  useShellTabBarVisibility: () => true,
  useShellTabBarScrollInset: () => 92, // 76 (pill) + 16 (extra)
  shellTabBarHeightPx: (v: boolean) => (v ? 76 : 0),
}));

vi.mock('react-native-safe-area-context', async () => {
  const actual = await vi.importActual<typeof import('react-native-safe-area-context')>(
    'react-native-safe-area-context',
  );
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, bottom: 16, left: 0, right: 0 }),
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('@kc/ui', async () => {
  const actual = await vi.importActual<typeof import('@kc/ui')>('@kc/ui');
  return { ...actual, useTheme: () => ({ colors: { surfaceCream: '#FFFBF7' }, isDark: false }) };
});

function flattenStyle(input: unknown): Record<string, unknown> {
  if (Array.isArray(input)) return Object.assign({}, ...input.filter(Boolean));
  return (input as Record<string, unknown>) ?? {};
}

describe('Screen — tab-bar inset wiring', () => {
  it('adds tab-bar paddingBottom to scrollable content when visible', () => {
    const { UNSAFE_getByType } = render(
      <Screen scroll tabBarInset>
        <Text>body</Text>
      </Screen>,
    );
    const sv = UNSAFE_getByType(ScrollView);
    const style = flattenStyle(sv.props.contentContainerStyle);
    expect(style.paddingBottom).toBe(92);
  });

  it('omits tab-bar paddingBottom when tabBarInset=false', () => {
    const { UNSAFE_getByType } = render(
      <Screen scroll tabBarInset={false}>
        <Text>body</Text>
      </Screen>,
    );
    const sv = UNSAFE_getByType(ScrollView);
    const style = flattenStyle(sv.props.contentContainerStyle);
    expect(style.paddingBottom).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `( cd app && pnpm --filter @kc/mobile test -- Screen.tabBarInset )`

Expected: FAIL — `tabBarInset` prop is unknown on `Screen`, paddingBottom not set.

- [ ] **Step 3: Implement the primitive extension**

Edit `app/apps/mobile/src/components/ui/Screen.tsx`. Add the imports, the two new props (`tabBarInset`, `hasNativeHeader`), and the conditional padding. Final shape:

```tsx
// Screen wrapper for the redesigned main-screen idiom (login-style).
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@kc/ui';
import { AmbientBlobs } from './AmbientBlobs';
import { useShellTabBarScrollInset } from '../../navigation/useShellTabBarVisibility';

interface ScreenProps {
  readonly children: React.ReactNode;
  readonly scroll?: boolean;
  readonly blobs?: 'auth' | 'content' | 'off';
  readonly edges?: readonly Edge[];
  readonly contentContainerStyle?: ViewStyle;
  readonly style?: ViewStyle;
  /**
   * When true (default), reserves bottom padding equal to the floating tab-bar
   * pill height + safe-area on screens where the shell renders the bar. Pass
   * `false` only when the screen owns its own footer (e.g. CTA bar, composer)
   * and already reserves space, or when wrapping a `FlatList` directly.
   */
  readonly tabBarInset?: boolean;
  /**
   * Set when the screen is rendered inside an Expo Router Stack with
   * `headerShown: true` (native header). The header already consumes the top
   * safe-area; including `'top'` in `edges` would double-pad on notched /
   * Dynamic Island iPhones. v2 council fix per FR-RESP-006 AC9.
   */
  readonly hasNativeHeader?: boolean;
}

export function Screen({
  children,
  scroll = false,
  blobs = 'content',
  edges,
  contentContainerStyle,
  style,
  tabBarInset = true,
  hasNativeHeader = false,
}: ScreenProps) {
  const { colors } = useTheme();
  // Hook is always called (Rules of Hooks); value is 0 when the bar is hidden.
  const tabBarPad = useShellTabBarScrollInset();

  // Effective edges: caller wins; otherwise default to ['top'] unless a native
  // header already eats the top inset (then default to []).
  const effectiveEdges: readonly Edge[] =
    edges ?? (hasNativeHeader ? [] : ['top']);

  // Memoized so FlatList / ScrollView don't see a fresh array on every parent
  // re-render — FR-RESP-006 AC15.
  const scrollContentStyle = useMemo(
    () =>
      [
        staticStyles.scrollContent,
        contentContainerStyle,
        tabBarInset && scroll ? { paddingBottom: tabBarPad } : null,
      ].filter(Boolean),
    [contentContainerStyle, tabBarInset, scroll, tabBarPad],
  );

  const body = scroll ? (
    <ScrollView
      style={staticStyles.flex}
      contentContainerStyle={scrollContentStyle as ViewStyle[]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[staticStyles.flex, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      style={[staticStyles.container, { backgroundColor: colors.surfaceCream }, style]}
      edges={effectiveEdges}
    >
      {blobs !== 'off' && <AmbientBlobs density={blobs} />}
      {body}
    </SafeAreaView>
  );
}

const staticStyles = StyleSheet.create({
  container: { flex: 1, width: '100%', alignSelf: 'stretch' },
  flex: { flex: 1, width: '100%', alignSelf: 'stretch', minWidth: 0 },
  scrollContent: { flexGrow: 1, alignSelf: 'stretch', minWidth: '100%' },
});
```

Also add a second test file `app/apps/mobile/src/components/ui/__tests__/Screen.nativeHeader.test.tsx` (per AC9):

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react';
import { Screen } from '../Screen';

vi.mock('../../../navigation/useShellTabBarVisibility', () => ({
  useShellTabBarVisibility: () => false,
  useShellTabBarScrollInset: () => 0,
  shellTabBarHeightPx: () => 0,
}));

const sawEdges: ReadonlyArray<readonly string[]> = [];
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ edges, children }: { edges?: readonly string[]; children: React.ReactNode }) => {
    (sawEdges as unknown as Array<readonly string[]>).push(edges ?? []);
    return <>{children}</>;
  },
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

vi.mock('@kc/ui', async () => {
  const actual = await vi.importActual<typeof import('@kc/ui')>('@kc/ui');
  return { ...actual, useTheme: () => ({ colors: { surfaceCream: '#FFFBF7' }, isDark: false }) };
});

describe('Screen — native-header double-padding guard', () => {
  it('drops top edge when hasNativeHeader is set', () => {
    render(
      <Screen hasNativeHeader>
        <Text>body</Text>
      </Screen>,
    );
    expect(sawEdges.at(-1)).toEqual([]);
  });

  it('keeps top edge by default', () => {
    render(
      <Screen>
        <Text>body</Text>
      </Screen>,
    );
    expect(sawEdges.at(-1)).toEqual(['top']);
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `( cd app && pnpm --filter @kc/mobile test -- Screen.tabBarInset )`

Expected: PASS — both cases.

- [ ] **Step 5: Verify no existing snapshot regresses**

Run: `( cd app && pnpm --filter @kc/mobile test )`

Expected: all tests pass. If `AppShell.snapshot.test.tsx` or any other Screen-consumer snapshot fails because the new `paddingBottom` flows through, update the snapshot only after confirming the diff is purely the new bottom inset.

- [ ] **Step 6: Commit**

```bash
git add app/apps/mobile/src/components/ui/Screen.tsx \
        app/apps/mobile/src/components/ui/__tests__/Screen.tabBarInset.test.tsx
git commit -m "feat(ui): Screen primitive owns tab-bar bottom inset (FR-RESP-006 AC2)"
```

---

## Task 2.5: Device-matrix snapshot guard for `Screen`

**Files:**
- Test: `app/apps/mobile/src/components/ui/__tests__/Screen.deviceMatrix.test.tsx` (new)

This test runs the same render five times, once per device profile, and asserts the resolved bottom padding is sufficient to clear the floating pill on each. It catches the silent-drop case on Touch ID iPhones (bottom inset = 0pt) — there's no safe-area to mask a missing inset, so the bug shows up only on real devices unless we test for it.

- [ ] **Step 1: Write the parametrised test**

Create `app/apps/mobile/src/components/ui/__tests__/Screen.deviceMatrix.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { ScrollView, Text } from 'react-native';
import { render } from '@testing-library/react';

interface DeviceProfile {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly topInset: number;
  readonly bottomInset: number;
}

const DEVICES: readonly DeviceProfile[] = [
  { name: 'iPhone SE 2nd/3rd gen',  width: 375, height: 667, topInset: 20, bottomInset: 0 },
  { name: 'iPhone 13 mini',         width: 375, height: 812, topInset: 50, bottomInset: 34 },
  { name: 'iPhone 16 Pro',          width: 393, height: 852, topInset: 59, bottomInset: 34 },
  { name: 'iPhone 16 Pro Max',      width: 430, height: 932, topInset: 59, bottomInset: 34 },
  { name: 'Android compact (Pixel 6a, gesture nav)', width: 360, height: 800, topInset: 24, bottomInset: 16 },
  { name: 'Android compact (3-button nav)',          width: 360, height: 800, topInset: 24, bottomInset: 48 },
];

const TAB_BAR_PILL_PX = 76; // matches navigation/useShellTabBarVisibility#TAB_BAR_HEIGHT

vi.mock('../../../navigation/useShellTabBarVisibility', () => ({
  useShellTabBarVisibility: () => true,
  useShellTabBarScrollInset: () => 76 + 16 + 0, // shape; insets injected per-test
  shellTabBarHeightPx: (v: boolean) => (v ? 76 : 0),
}));

describe.each(DEVICES)('Screen reserves tab-bar inset on $name', (device) => {
  beforeEach(() => {
    vi.doMock('react-native-safe-area-context', async () => {
      const actual = await vi.importActual<typeof import('react-native-safe-area-context')>(
        'react-native-safe-area-context',
      );
      return {
        ...actual,
        useSafeAreaInsets: () => ({
          top: device.topInset,
          bottom: device.bottomInset,
          left: 0,
          right: 0,
        }),
        SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      };
    });
    vi.doMock('../../../navigation/useShellTabBarVisibility', () => ({
      useShellTabBarVisibility: () => true,
      shellTabBarHeightPx: (v: boolean) => (v ? TAB_BAR_PILL_PX : 0),
      // Mirrors the real hook: TAB_BAR_HEIGHT + insets.bottom + spacing.lg(=20)
      useShellTabBarScrollInset: () => TAB_BAR_PILL_PX + device.bottomInset + 20,
    }));
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('reserves >= pill + bottom inset of bottom padding on scrollable content', async () => {
    const { Screen: FreshScreen } = await import('../Screen');
    const { UNSAFE_getByType } = render(
      <FreshScreen scroll>
        <Text>body</Text>
      </FreshScreen>,
    );
    const sv = UNSAFE_getByType(ScrollView);
    const flatStyle = Array.isArray(sv.props.contentContainerStyle)
      ? Object.assign({}, ...sv.props.contentContainerStyle)
      : sv.props.contentContainerStyle;
    expect(flatStyle.paddingBottom).toBeGreaterThanOrEqual(TAB_BAR_PILL_PX + device.bottomInset);
  });
});
```

- [ ] **Step 2: Run the test to confirm it passes against the Task 2 implementation**

Run: `( cd app && pnpm --filter @kc/mobile test -- Screen.deviceMatrix )`

Expected: PASS for all six device profiles (incl. both Android nav modes).

- [ ] **Step 3: Sanity-check the failure path**

Temporarily change `Screen.tsx` to compute `padBottom = null` regardless of `tabBarInset`. Re-run the test.

Expected: FAIL on every profile. Revert the change.

This proves the guard actually catches the regression it's meant to catch.

- [ ] **Step 4: Commit**

```bash
git add app/apps/mobile/src/components/ui/__tests__/Screen.deviceMatrix.test.tsx
git commit -m "test(ui): device-matrix snapshot guard for Screen tab-bar inset (FR-RESP-006 AC1)"
```

---

## Task 3: Wire the inset into `PostFeedList` (Home Feed auto-fix)

**Files:**
- Modify: `app/apps/mobile/src/components/PostFeedList.tsx`

- [ ] **Step 1: Edit `PostFeedList` to consume `useShellTabBarScrollInset` with memoized style**

Replace the static `paddingBottom: spacing['3xl']` in `listContent` with the dynamic inset. The hook must be called inside the component, not in the style factory. The `contentContainerStyle` array must be memoized to keep its identity stable across re-renders — `FlatList` invalidates the inner ScrollView's content-size cache on iOS when the prop reference changes (FR-RESP-006 AC15).

```tsx
// at the top of file — add imports next to existing ones
import { useMemo } from 'react';
import { useShellTabBarScrollInset } from '../navigation/useShellTabBarVisibility';

// inside PostFeedList(), right after `const { t } = useTranslation();`
const tabBarPad = useShellTabBarScrollInset();
const listContentStyle = useMemo(
  () => [styles.listContent, { paddingBottom: tabBarPad }] as const,
  [styles.listContent, tabBarPad],
);
```

Then change the `<FlatList ... contentContainerStyle={styles.listContent} />` line to:

```tsx
contentContainerStyle={listContentStyle as unknown as object}
```

And in `usePostFeedListStyles`, drop the static bottom from `listContent`:

```tsx
listContent: { paddingTop: spacing.base },
```

- [ ] **Step 2: Manually verify the Home Feed**

Run: `( cd app && pnpm --filter @kc/mobile start )` then open in iOS Simulator (iPhone SE first — tightest).

Expected: scroll the Home Feed to the end. The final row of post cards is fully visible above the floating pill — not cropped under it.

If the simulator is not available in this session, document the manual-test gap in the PR body's "Test plan" section. Continue.

- [ ] **Step 3: Run the full mobile test suite**

Run: `( cd app && pnpm --filter @kc/mobile test )`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/apps/mobile/src/components/PostFeedList.tsx
git commit -m "feat(feed): reserve tab-bar inset in PostFeedList (FR-RESP-006 AC1)"
```

- [ ] **Step 5: Pre-push gates**

Run from `app/`:

```bash
( cd app && pnpm typecheck && pnpm test && pnpm lint )
```

Expected: all green.

- [ ] **Step 6: Open PR A**

```bash
git push -u origin HEAD
gh pr create --base dev --head "$(git branch --show-current)" \
  --title "feat(resp): FR-RESP-006 foundation — Screen primitive tab-bar inset + PostFeedList" \
  --body "$(cat <<'EOF'
## Summary
Foundation for FR-RESP-006: extends the `Screen` primitive with `tabBarInset` prop (default on) so scrollable screens auto-reserve the floating tab-bar height + safe-area, and wires the inset into `PostFeedList` (auto-fixes Home Feed cropping).

## Mapped to spec
- FR-RESP-006 — Mobile platform polish & bottom-bar safety (`docs/SSOT/spec/14_responsive_desktop.md`)

## Changes
- New section FR-RESP-006 in `spec/14_responsive_desktop.md` (status ⏳).
- New row `RESP-006` in `BACKLOG.md` (status ⏳ → 🟡 once this PR opens).
- `Screen.tsx` now accepts `tabBarInset?: boolean`; default `true`.
- `PostFeedList.tsx` consumes `useShellTabBarScrollInset()` instead of a fixed `spacing['3xl']` bottom.
- Snapshot test for the inset wiring.

## Tests
- `pnpm typecheck` ✅
- `pnpm test` ✅ (incl. new `Screen.tabBarInset.test.tsx`)
- `pnpm lint` ✅
- Manual: Home Feed on iPhone SE — last row visible above the pill.

## SSOT updated
- [x] `BACKLOG.md` RESP-006 added at ⏳ (flips to 🟡 with this PR)
- [x] `spec/14_responsive_desktop.md` FR-RESP-006 section added
- [ ] `TECH_DEBT.md` — n/a (no new debt)

## Risk / rollout notes
Low risk. The `Screen` change is additive (new prop, default preserves behavior for existing screens). `PostFeedList` was previously under-reserving; now it reserves more, never less.
EOF
)" --assignee "@me"
gh pr merge --auto --squash --delete-branch
```

- [ ] **Step 7: Flip RESP-006 status to 🟡 In progress**

After the PR is open, edit `docs/SSOT/BACKLOG.md` and change the RESP-006 row's status from `⏳ Planned` to `🟡 In progress`. Commit & push as a follow-up on the same branch (auto-merge will pick it up).

Actually — since the PR is squash-merged, simpler: include the 🟡 status change in this PR. If you already committed and pushed, amend by opening a tiny commit on the same branch before auto-merge fires:

```bash
git checkout dev && git pull --ff-only
git switch -c chore/RESP-006-status-bump
# edit BACKLOG.md row to 🟡 In progress
git add docs/SSOT/BACKLOG.md
git commit -m "chore(ssot): mark RESP-006 In progress"
git push -u origin HEAD
gh pr create --base dev --title "chore(ssot): mark RESP-006 In progress" --body "Status bump only." --assignee "@me"
gh pr merge --auto --squash --delete-branch
```

(If PR A hadn't yet auto-merged, fold this into PR A instead.)

---

# PR B — Screen sweep (Tasks 4–8)

Branch off latest `dev` after PR A merges.

```bash
git switch dev && git pull --ff-only
git switch -c feat/FR-RESP-006-fe-screen-sweep
```

## Task 4: Tabs sweep — Search, Create, Donations × 4

**Files:**
- Modify: `app/apps/mobile/app/(tabs)/search.tsx` + `app/apps/mobile/app/(tabs)/search.styles.ts`
- Modify: `app/apps/mobile/app/(tabs)/create.tsx` + `app/apps/mobile/app/(tabs)/create.styles.ts`
- Modify: `app/apps/mobile/app/(tabs)/donations/index.tsx`
- Modify: `app/apps/mobile/app/(tabs)/donations/money.tsx`
- Modify: `app/apps/mobile/app/(tabs)/donations/time.tsx`
- Modify: `app/apps/mobile/app/(tabs)/donations/category/[slug].tsx`

For every screen below, the change pattern is identical:

1. Import `useShellTabBarScrollInset`.
2. Call it once at the top of the component body.
3. Append `{ paddingBottom: tabBarPad }` to the outer `ScrollView`'s `contentContainerStyle` (concatenate with the existing array/object).
4. Remove any explicit `paddingBottom: spacing[...]` that the style was using for "bottom of feed" — the inset already covers it.
5. If the root is `<Screen edges={['bottom']}>`, change to default (no `edges` prop) — TabBar owns the bottom inset already and `['top']` is the `Screen` default.

- [ ] **Step 1: `(tabs)/search.tsx` — add inset hook + style change**

Open `app/apps/mobile/app/(tabs)/search.tsx`. After the existing hook calls (`const { colors } = useTheme();` etc.), add:

```tsx
import { useShellTabBarScrollInset } from '../../src/navigation/useShellTabBarVisibility';
// ...
const tabBarPad = useShellTabBarScrollInset();
```

The file has two `<ScrollView>` blocks (results vs. discovery default — search.tsx:186 and search.tsx:249). Both need `contentContainerStyle={[styles.contentInner, { paddingBottom: tabBarPad }]}`.

In `app/apps/mobile/app/(tabs)/search.styles.ts:123`, change:

```ts
contentInner: { padding: spacing.base, paddingBottom: spacing['2xl'] },
```

to:

```ts
contentInner: { padding: spacing.base },
```

- [ ] **Step 2: `(tabs)/create.tsx` — wire inset**

`create.tsx` mounts a `<Screen scroll={false}>` and the form lives inside `CreatePostFormScrollContent`. Locate the ScrollView in `app/apps/mobile/src/components/CreatePostForm/CreatePostFormScrollContent.tsx` (find via `grep -n ScrollView app/apps/mobile/src/components/CreatePostForm/CreatePostFormScrollContent.tsx`). Apply the same pattern there: import the hook, call it, append to the `contentContainerStyle`. In `app/apps/mobile/app/(tabs)/create.styles.ts:39`, drop the trailing `paddingBottom: spacing['3xl']` from `scrollContent`.

If `CreatePostFormScrollContent` is shared with other screens that *don't* have the tab bar, gate the addition behind an optional `bottomPad` prop with default 0, and pass `useShellTabBarScrollInset()` from `create.tsx`.

- [ ] **Step 3: `(tabs)/donations/index.tsx` — wire inset**

Replace the existing `<ScrollView ... contentContainerStyle={styles.scroll} ...>` (around line 187) with:

```tsx
const tabBarPad = useShellTabBarScrollInset();
// …
<ScrollView
  style={styles.scrollView}
  contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
  showsVerticalScrollIndicator={false}
>
```

And drop `paddingBottom: spacing['3xl']` from the `scroll` style (line 63).

- [ ] **Step 4: `(tabs)/donations/money.tsx` — drop stale edges + wire inset**

In `money.tsx:40`, change:

```tsx
<Screen blobs="content" edges={['bottom']}>
```

to:

```tsx
<Screen blobs="content">
```

(Default edges = `['top']`; `Screen` now reserves the tab-bar bottom inset internally.) Then add the inset on the inner `<ScrollView>` (around line 41) and remove the `paddingBottom: spacing['2xl']` from the styles at line 18.

- [ ] **Step 5: `(tabs)/donations/time.tsx` — same treatment**

`time.tsx:118` → drop `edges={['bottom']}`. Style line 34 → drop `paddingBottom: spacing['2xl']`. Inject `paddingBottom: tabBarPad` into the `<ScrollView contentContainerStyle>`.

- [ ] **Step 6: `(tabs)/donations/category/[slug].tsx` — same treatment**

`[slug].tsx:96` → drop `edges={['bottom']}`. Style line 51 → drop `paddingBottom: spacing['2xl']`. Inject `paddingBottom: tabBarPad`.

- [ ] **Step 7: Verify**

```bash
( cd app && pnpm typecheck && pnpm test && pnpm lint )
```

Expected: all green. Spot-check the Donations hub on iPhone SE in the simulator: the last category-grid row must be fully visible above the pill.

- [ ] **Step 8: Commit**

```bash
git add app/apps/mobile/app/\(tabs\)/search.tsx app/apps/mobile/app/\(tabs\)/search.styles.ts \
        app/apps/mobile/app/\(tabs\)/create.tsx app/apps/mobile/app/\(tabs\)/create.styles.ts \
        app/apps/mobile/src/components/CreatePostForm/CreatePostFormScrollContent.tsx \
        app/apps/mobile/app/\(tabs\)/donations/index.tsx \
        app/apps/mobile/app/\(tabs\)/donations/money.tsx \
        app/apps/mobile/app/\(tabs\)/donations/time.tsx \
        app/apps/mobile/app/\(tabs\)/donations/category/\[slug\].tsx
git commit -m "fix(tabs): reserve tab-bar inset on Search/Create/Donations (FR-RESP-006 AC1+AC3)"
```

---

## Task 5: Root-level sweep — Stats + Settings cluster

**Files:**
- Modify: `app/apps/mobile/app/stats.tsx`
- Modify: `app/apps/mobile/app/settings.tsx` + `app/apps/mobile/app/settings.styles.ts`
- Modify: `app/apps/mobile/app/settings/notifications.tsx`
- Modify: `app/apps/mobile/app/settings/appearance.tsx`
- Modify: `app/apps/mobile/app/settings/audit.tsx`
- Modify: `app/apps/mobile/app/settings/report-issue.tsx`
- Modify: `app/apps/mobile/app/settings/follow-requests.tsx`

Pattern: each screen is a `SafeAreaView edges={['top']}` (or `['bottom']`) wrapping a scrollable. The fix is the same as Task 4 — call the hook, add `paddingBottom: tabBarPad` to the scrollable's `contentContainerStyle`, drop hand-rolled `paddingBottom: spacing['…']` from the styles file.

- [ ] **Step 1: `stats.tsx` — wire inset**

`stats.tsx:97` has the `<ScrollView>`. Add at the top of the component:

```tsx
import { useShellTabBarScrollInset } from '../src/navigation/useShellTabBarVisibility';
// …
const tabBarPad = useShellTabBarScrollInset();
```

Set its `contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPad }]}`. Remove `paddingBottom: spacing['3xl']` from line 166.

- [ ] **Step 2: `settings.tsx` — wire inset**

`settings.tsx:82` has `<ScrollView contentContainerStyle={styles.scrollContent}>`. Replace with:

```tsx
const tabBarPad = useShellTabBarScrollInset();
// …
<ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPad }]}>
```

Edit `settings.styles.ts:26` — change `scrollContent: { paddingBottom: spacing.xl * 2, ...webViewRtl }` to `scrollContent: { ...webViewRtl }` (drop the static bottom).

- [ ] **Step 3: `settings/notifications.tsx` — wire inset**

`notifications.tsx:119` has the `<ScrollView>`. Same pattern as above. Drop any static bottom padding from its styles.

- [ ] **Step 4: `settings/appearance.tsx` — wire inset**

`appearance.tsx:60` has the `<ScrollView>`. Same pattern; drop the `paddingBottom: spacing['3xl']` at line 102.

- [ ] **Step 5: `settings/audit.tsx` — wire inset on the `FlatList`**

`audit.tsx:98` is a `<FlatList>` with `<SafeAreaView edges={['bottom']}>` at line 77. Change the root edges to `['top']` (TabBar owns bottom). Add the hook + `contentContainerStyle={{ paddingBottom: tabBarPad }}` to the `FlatList`.

- [ ] **Step 6: `settings/report-issue.tsx` — wire inset on the inner `ScrollView`**

`report-issue.tsx:63` uses `<SafeAreaView edges={['bottom', 'left', 'right']}>`. Change to `edges={['left', 'right']}` (drop `'bottom'` — TabBar owns it; this is a tab-bar-visible screen). Then add the hook and append `{ paddingBottom: tabBarPad }` to `styles.body` (line 155) or to the `<ScrollView contentContainerStyle>` directly.

- [ ] **Step 7: `settings/follow-requests.tsx` — wire inset**

`follow-requests.tsx:76` mounts `<SafeAreaView>` with no edges. It uses some list inside — apply the hook and the bottom padding on the list/scroll content. Keep root `SafeAreaView` with `edges={['top']}`.

- [ ] **Step 8: Verify**

```bash
( cd app && pnpm typecheck && pnpm test && pnpm lint )
```

Expected: green.

- [ ] **Step 9: Commit**

```bash
git add app/apps/mobile/app/stats.tsx \
        app/apps/mobile/app/settings.tsx app/apps/mobile/app/settings.styles.ts \
        app/apps/mobile/app/settings/notifications.tsx \
        app/apps/mobile/app/settings/appearance.tsx \
        app/apps/mobile/app/settings/audit.tsx \
        app/apps/mobile/app/settings/report-issue.tsx \
        app/apps/mobile/app/settings/follow-requests.tsx
git commit -m "fix(settings,stats): reserve tab-bar inset (FR-RESP-006 AC1+AC3)"
```

---

## Task 6: Root-level sweep — Chat inbox + user profile cluster

**Files:**
- Modify: `app/apps/mobile/app/chat/index.tsx` + `app/apps/mobile/app/chat/chatScreenStyles.ts`
- Modify: `app/apps/mobile/app/user/[handle]/index.tsx`
- Modify: `app/apps/mobile/app/user/[handle]/followers.tsx`
- Modify: `app/apps/mobile/app/user/[handle]/following.tsx`

- [ ] **Step 1: `chat/index.tsx` — wire inset on inbox `FlatList`**

`chat/index.tsx:78` has the `<FlatList>`. Add:

```tsx
import { useShellTabBarScrollInset } from '../../src/navigation/useShellTabBarVisibility';
// …
const tabBarPad = useShellTabBarScrollInset();
```

Add `contentContainerStyle={{ paddingBottom: tabBarPad }}` to the `<FlatList>`. Root SafeAreaView already uses `edges={['top']}` — correct.

- [ ] **Step 2: `user/[handle]/index.tsx` — wire inset on outer `ScrollView`**

`user/[handle]/index.tsx:136` has the `<ScrollView>`. Add the hook + `contentContainerStyle={{ paddingBottom: tabBarPad }}`. Change the root `<SafeAreaView ... edges={['bottom']}>` (line 112 and 127) to `edges={['top']}` — TabBar owns the bottom inset and `['bottom']` here over-counts.

- [ ] **Step 3: `user/[handle]/followers.tsx` — wire inset**

`followers.tsx:74` has the screen body (likely a `FlatList`). Same pattern. Change `edges={['bottom']}` to `edges={['top']}`.

- [ ] **Step 4: `user/[handle]/following.tsx` — wire inset**

Same as followers.

- [ ] **Step 5: Verify**

```bash
( cd app && pnpm typecheck && pnpm test && pnpm lint )
```

Expected: green.

- [ ] **Step 6: Commit**

```bash
git add app/apps/mobile/app/chat/index.tsx app/apps/mobile/app/chat/chatScreenStyles.ts \
        app/apps/mobile/app/user/\[handle\]/index.tsx \
        app/apps/mobile/app/user/\[handle\]/followers.tsx \
        app/apps/mobile/app/user/\[handle\]/following.tsx
git commit -m "fix(chat,user-profile): reserve tab-bar inset (FR-RESP-006 AC1+AC3)"
```

---

## Task 7: Sweep verification — automated grep

**Files:** none modified; verification step only.

- [ ] **Step 1: Confirm no scrollable + tab-bar-visible screen is left unreserved**

Run this grep from the repo root:

```bash
grep -rln "useShellTabBarVisibility\|useShellTabBarScrollInset" \
  app/apps/mobile/app app/apps/mobile/src | sort -u
```

Cross-check the output against the table at the top of this plan. Every screen in the "Tab-bar visible? ✅" column must appear either as a direct consumer of `useShellTabBarScrollInset` (or `Screen` with `tabBarInset` default) or be wrapped in a component that consumes it (e.g. `PostFeedList`).

If any screen is missing, fix it before moving on.

- [ ] **Step 2: Confirm no screen carries `edges={['bottom']}` while the tab bar is visible there**

Run:

```bash
grep -rn "edges={\['bottom'" app/apps/mobile/app | grep -v "chat/\[id\]\.tsx\|edit-profile\|edit-post\|post/\[id\]\.tsx"
```

Expected: empty (the listed exceptions own their own footers and intentionally absorb the bottom inset).

If any other file appears in the output, change its edges to `['top']` (or remove the edges prop to default).

---

## Task 8: Open PR B

- [ ] **Step 1: Final pre-push gates**

```bash
( cd app && pnpm typecheck && pnpm test && pnpm lint )
```

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin HEAD
gh pr create --base dev --head "$(git branch --show-current)" \
  --title "fix(screens): FR-RESP-006 screen sweep — reserve tab-bar inset everywhere" \
  --body "$(cat <<'EOF'
## Summary
Sweeps 18 screens to reserve the floating tab-bar bottom inset and drops stale `edges={['bottom']}` from root SafeAreaViews where the TabBar already owns that inset.

## Mapped to spec
- FR-RESP-006 — Mobile platform polish & bottom-bar safety (AC1 + AC3)

## Changes
- `(tabs)/search`, `(tabs)/create`, `(tabs)/donations/{index,money,time,category/[slug]}` — inset wired.
- `stats`, `settings`, `settings/{notifications,appearance,audit,report-issue,follow-requests}` — inset wired.
- `chat/index` (inbox), `user/[handle]/{index,followers,following}` — inset wired; `edges={['bottom']}` → `['top']`.

## Tests
- `pnpm typecheck` ✅
- `pnpm test` ✅
- `pnpm lint` ✅
- Manual: iPhone SE — every tabbed screen's last row visible above the pill.

## SSOT updated
- [ ] `BACKLOG.md` — left at 🟡 (will flip to ✅ in PR C)
- [ ] `spec/14_responsive_desktop.md` — no header change yet
- [ ] `TECH_DEBT.md` — n/a

## Risk / rollout notes
Low. Each touched file gets the same shape of edit (one hook call + one style append + at most one edge change).
EOF
)" --assignee "@me"
gh pr merge --auto --squash --delete-branch
```

---

# PR C — Platform helpers + typography clamps (Tasks 9–13)

Branch off latest `dev` after PR B merges.

```bash
git switch dev && git pull --ff-only
git switch -c feat/FR-RESP-006-fe-platform-helpers
```

## Task 9: `useDirectionalBackIcon` helper

**Files:**
- Create: `app/apps/mobile/src/lib/platform/useDirectionalBackIcon.ts`
- Test: `app/apps/mobile/src/lib/platform/__tests__/useDirectionalBackIcon.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/apps/mobile/src/lib/platform/__tests__/useDirectionalBackIcon.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { Platform } from 'react-native';
import { renderHook } from '@testing-library/react';
import { useDirectionalBackIcon } from '../useDirectionalBackIcon';

describe('useDirectionalBackIcon', () => {
  it('returns chevron-back on iOS (Apple HIG)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const { result } = renderHook(() => useDirectionalBackIcon());
    expect(result.current).toBe('chevron-back');
  });

  it('returns arrow-back on Android (Material — OS auto-mirrors in RTL)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const { result } = renderHook(() => useDirectionalBackIcon());
    expect(result.current).toBe('arrow-back');
  });

  it('returns arrow-forward on web (we mirror manually since browsers do not auto-mirror)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const { result } = renderHook(() => useDirectionalBackIcon());
    expect(result.current).toBe('arrow-forward');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `( cd app && pnpm --filter @kc/mobile test -- useDirectionalBackIcon )`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `app/apps/mobile/src/lib/platform/useDirectionalBackIcon.ts`:

```ts
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Back-button glyph chosen per platform convention:
 *
 * - **iOS** → `chevron-back` (Apple HIG: NavigationView leading chevron, RTL
 *   layout mirrors it automatically so Hebrew users see the chevron pointing
 *   to the right).
 * - **Android** → `arrow-back` (Material 3: ActionBar / TopAppBar leading
 *   icon. The Android framework auto-mirrors arrow-back in RTL contexts via
 *   `android:autoMirrored="true"`, so Hebrew users see a right-pointing arrow
 *   without any code change).
 * - **Web** → `arrow-forward` (browsers do **not** auto-mirror icons by
 *   direction, so we manually pick the right-pointing arrow for our forced-
 *   RTL Hebrew app).
 *
 * Council v2: previously this returned `chevron-forward` on iOS and
 * `arrow-forward` on Android, which diverged from every native Hebrew app
 * users have installed. Fixed per FR-RESP-006 AC4.
 */
export function useDirectionalBackIcon(): IoniconName {
  if (Platform.OS === 'ios') return 'chevron-back';
  if (Platform.OS === 'android') return 'arrow-back';
  return 'arrow-forward';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `( cd app && pnpm --filter @kc/mobile test -- useDirectionalBackIcon )`

Expected: PASS.

- [ ] **Step 5: Replace existing inline branches**

Grep for the pattern and replace each occurrence:

```bash
grep -rn "Platform.OS === 'ios' ? 'chevron-forward' : 'arrow-forward'" app/apps/mobile
```

Known sites: `(guest)/feed.tsx:112`, `src/components/BackButton.tsx` (if present). For each: import `useDirectionalBackIcon` and replace the ternary with the hook call.

Example in `(guest)/feed.tsx`:

```tsx
// BEFORE
<Ionicons
  name={Platform.OS === 'ios' ? 'chevron-forward' : 'arrow-forward'}
  size={24}
  color={colors.primary}
/>

// AFTER
const backIcon = useDirectionalBackIcon();
// …
<Ionicons name={backIcon} size={24} color={colors.primary} />
```

- [ ] **Step 6: Commit**

```bash
git add app/apps/mobile/src/lib/platform/useDirectionalBackIcon.ts \
        app/apps/mobile/src/lib/platform/__tests__/useDirectionalBackIcon.test.tsx \
        app/apps/mobile/app/\(guest\)/feed.tsx \
        app/apps/mobile/src/components/BackButton.tsx
git commit -m "feat(platform): useDirectionalBackIcon helper (FR-RESP-006 AC4)"
```

---

## Task 10: `useKeyboardVerticalOffset` helper

**Files:**
- Create: `app/apps/mobile/src/lib/platform/useKeyboardVerticalOffset.ts`
- Test: `app/apps/mobile/src/lib/platform/__tests__/useKeyboardVerticalOffset.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/apps/mobile/src/lib/platform/__tests__/useKeyboardVerticalOffset.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { Platform } from 'react-native';
import { renderHook } from '@testing-library/react';
import { useKeyboardVerticalOffset } from '../useKeyboardVerticalOffset';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

// `useHeaderHeight()` throws when not inside a navigation stack; we mock it
// so the hook can read a deterministic header height in tests.
vi.mock('@react-navigation/elements', () => ({ useHeaderHeight: () => 44 }));

describe('useKeyboardVerticalOffset', () => {
  it('returns header + topInset on iOS when header is rendered', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const { result } = renderHook(() => useKeyboardVerticalOffset());
    expect(result.current).toBe(91); // 44 + 47
  });

  it('honors an explicit override (custom header screens like chat)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const { result } = renderHook(() => useKeyboardVerticalOffset({ headerHeight: 56 }));
    expect(result.current).toBe(103); // 56 + 47
  });

  it('falls back to insets.top only when headerless', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const { result } = renderHook(() => useKeyboardVerticalOffset({ headerless: true }));
    expect(result.current).toBe(47);
  });

  it('returns 0 on Android (adjustResize handles it via app.json)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const { result } = renderHook(() => useKeyboardVerticalOffset());
    expect(result.current).toBe(0);
  });

  it('returns 0 on web', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const { result } = renderHook(() => useKeyboardVerticalOffset());
    expect(result.current).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `( cd app && pnpm --filter @kc/mobile test -- useKeyboardVerticalOffset )`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `app/apps/mobile/src/lib/platform/useKeyboardVerticalOffset.ts`:

```ts
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

interface Options {
  /** Explicit header height (custom-header screens like chat). Wins over the inferred value. */
  readonly headerHeight?: number;
  /** True when the screen has no header (auth, onboarding). Returns only `insets.top` on iOS. */
  readonly headerless?: boolean;
}

/**
 * Cross-platform `keyboardVerticalOffset` for `<KeyboardAvoidingView>`.
 *
 * - **iOS:** the offset must equal the rendered header + top safe-area so the
 *   focused input is not pushed under the status bar / Dynamic Island when
 *   the keyboard opens. Three resolution modes:
 *     1. Explicit `headerHeight` override — for screens that render their own
 *        custom header bar (e.g. `chat/[id]` → `ChatConversationHeader`).
 *     2. `headerless: true` — for screens with `headerShown: false` (auth,
 *        onboarding); returns just `insets.top`.
 *     3. Default — calls `useHeaderHeight()` from `@react-navigation/elements`
 *        which reads the actual native-header height for the current Stack.
 * - **Android:** returns `0`. Relies on the `app.json` precondition
 *   `expo.android.softwareKeyboardLayoutMode = "resize"` so the system already
 *   adjusts the layout when the keyboard opens.
 * - **Web:** returns `0`. The browser handles input scroll-into-view itself.
 *
 * Council v2: previously this hardcoded `headerHeight = 44`, which was wrong
 * for every custom-header screen and double-shifted auth/onboarding screens.
 * Fixed per FR-RESP-006 AC10.
 */
export function useKeyboardVerticalOffset(options: Options = {}): number {
  const insets = useSafeAreaInsets();
  // Always call useHeaderHeight to satisfy Rules of Hooks; the value is only
  // consumed when neither override is provided.
  let inferredHeader = 0;
  try {
    inferredHeader = useHeaderHeight();
  } catch {
    // `useHeaderHeight` throws when outside a navigation context (e.g. modal
    // root or unit test). Treat as headerless in that case.
  }
  if (Platform.OS !== 'ios') return 0;
  if (options.headerless) return insets.top;
  const header = options.headerHeight ?? inferredHeader;
  return header + insets.top;
}
```

> **Note on the dep:** `@react-navigation/elements` ships transitively with `expo-router` (which depends on `@react-navigation/native`). No new dependency to install — verify with `pnpm --filter @kc/mobile why @react-navigation/elements` before writing the import.

- [ ] **Step 4: Run the test to verify it passes**

Run: `( cd app && pnpm --filter @kc/mobile test -- useKeyboardVerticalOffset )`

Expected: PASS.

- [ ] **Step 5: Replace hardcoded offsets**

Grep for `keyboardVerticalOffset=`:

```bash
grep -rn "keyboardVerticalOffset=" app/apps/mobile
```

Replace each with `useKeyboardVerticalOffset()` (or pass an explicit header height where the screen renders a non-default header). Known sites:

- `app/apps/mobile/app/chat/[id].tsx:140` — currently `keyboardVerticalOffset={88}`. Chat uses `ChatConversationHeader` (no native nav header); `useKeyboardVerticalOffset(56)` is closer to the rendered header height.
- `app/apps/mobile/app/edit-profile.tsx` — uses default 0; passing the hook is still preferable for consistency.
- `app/apps/mobile/app/(onboarding)/basic-info.tsx`, `(auth)/sign-in.tsx`, `(auth)/sign-up.tsx`, `settings/report-issue.tsx`, `src/components/OnboardingSoftGateModal.tsx`, `src/components/profile/BanUserModal.tsx`.

- [ ] **Step 6: Commit**

```bash
git add app/apps/mobile/src/lib/platform/useKeyboardVerticalOffset.ts \
        app/apps/mobile/src/lib/platform/__tests__/useKeyboardVerticalOffset.test.tsx \
        app/apps/mobile/app/chat/\[id\].tsx \
        app/apps/mobile/app/edit-profile.tsx \
        app/apps/mobile/app/\(onboarding\)/basic-info.tsx \
        app/apps/mobile/app/\(auth\)/sign-in.tsx \
        app/apps/mobile/app/\(auth\)/sign-up.tsx \
        app/apps/mobile/app/settings/report-issue.tsx \
        app/apps/mobile/src/components/OnboardingSoftGateModal.tsx \
        app/apps/mobile/src/components/profile/BanUserModal.tsx
git commit -m "feat(platform): useKeyboardVerticalOffset helper (FR-RESP-006 AC5)"
```

---

## Task 11: `MAX_FONT_SCALE` constant + clamp tight-row text

**Files:**
- Create: `app/apps/mobile/src/lib/platform/fontScale.ts`
- Test: `app/apps/mobile/src/lib/platform/__tests__/fontScale.test.ts`
- Modify: `app/apps/mobile/src/components/PostCard.tsx`
- Modify: `app/apps/mobile/src/components/chat/InboxChatRow.tsx`
- Modify: `app/apps/mobile/src/components/MessageBubble.tsx`

- [ ] **Step 1: Write the failing unit test**

Create `app/apps/mobile/src/lib/platform/__tests__/fontScale.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Platform } from 'react-native';
import {
  MAX_FONT_SCALE_TIGHT,
  MAX_FONT_SCALE_FLEX,
  clampFontScaleTight,
} from '../fontScale';

describe('fontScale', () => {
  it('exposes MAX_FONT_SCALE_TIGHT = 1.35 (covers iOS xxxLarge non-Accessibility)', () => {
    expect(MAX_FONT_SCALE_TIGHT).toBe(1.35);
  });

  it('MAX_FONT_SCALE_FLEX honors a11y: 2.0 on iOS / Android, 1.5 on web', () => {
    if (Platform.OS === 'web') {
      expect(MAX_FONT_SCALE_FLEX).toBe(1.5);
    } else {
      expect(MAX_FONT_SCALE_FLEX).toBe(2.0);
    }
  });

  it('clampFontScaleTight: clamps to MAX_FONT_SCALE_TIGHT when given Infinity', () => {
    expect(clampFontScaleTight(Infinity)).toBe(MAX_FONT_SCALE_TIGHT);
  });

  it('clampFontScaleTight: clamps below 1 to 1', () => {
    expect(clampFontScaleTight(0.5)).toBe(1);
  });

  it('clampFontScaleTight: passes through values inside the band', () => {
    expect(clampFontScaleTight(1.2)).toBe(1.2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `( cd app && pnpm --filter @kc/mobile test -- fontScale )`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/apps/mobile/src/lib/platform/fontScale.ts`:

```ts
import { Platform } from 'react-native';

/**
 * **TIGHT** ceiling: used only on `<Text>` nodes inside fixed-height grid
 * cells or single-line rows where larger sizes break the layout (PostCard
 * title/snippet, InboxChatRow name/last-message, MessageBubble timestamp).
 *
 * Set to 1.35 — covers iOS Dynamic Type "xxxLarge" (non-Accessibility) and
 * Android "Largest" (1.3×). Above this the row collides with its neighbour
 * in a 2-column grid, so we accept the readability tradeoff.
 *
 * AX users (iOS AX1–AX5, Android Display Size Accessibility) are handled by
 * `MAX_FONT_SCALE_FLEX` on the long-form copy that DOES reflow.
 */
export const MAX_FONT_SCALE_TIGHT = 1.35;

/**
 * **FLEX** ceiling: long-form body copy (post detail, about page, donation
 * descriptions, terms/privacy). Honors accessibility scales up to 2.0× on
 * mobile, 1.5× on web (browsers tend to break our column layout above 1.5×).
 */
export const MAX_FONT_SCALE_FLEX = Platform.select({
  ios: 2.0,
  android: 2.0,
  web: 1.5,
  default: 1.5,
}) as number;

/** Clamps a scale to `[1, MAX_FONT_SCALE_TIGHT]`. */
export function clampFontScaleTight(scale: number): number {
  if (!Number.isFinite(scale) || scale > MAX_FONT_SCALE_TIGHT) return MAX_FONT_SCALE_TIGHT;
  if (scale < 1) return 1;
  return scale;
}
```

> **Decision recorded:** the per-platform / tight-vs-flex split is recorded as `D-RESP-006` in `docs/SSOT/DECISIONS.md` with the rationale ("clamping the tight grid rows prevents layout collisions; flex copy honors a11y scales"). The DECISIONS.md entry is added in Task 12.

- [ ] **Step 4: Run the test to verify it passes**

Run: `( cd app && pnpm --filter @kc/mobile test -- fontScale )`

Expected: PASS.

- [ ] **Step 5: Apply `maxFontSizeMultiplier={MAX_FONT_SCALE_TIGHT}` to the enumerated tight-row Text nodes**

For each file below, add the import and the prop only on the listed `<Text>` nodes. Other `<Text>` nodes in the same file keep the system default (or, where they hold long-form body copy, get `MAX_FONT_SCALE_FLEX` instead — listed separately).

**`app/apps/mobile/src/components/PostCard.tsx`** (the title is line-clamped at 2; the snippet at 3):

```bash
grep -n "<Text" app/apps/mobile/src/components/PostCard.tsx
```

Expected matches (verify the line numbers in your local copy):
- `styles.title` Text with `numberOfLines={2}` → add `maxFontSizeMultiplier={MAX_FONT_SCALE_TIGHT}`.
- `styles.snippet` Text with `numberOfLines={3}` → same.
- `styles.metaText` (timestamp / category badge) Text → same.

**`app/apps/mobile/src/components/chat/InboxChatRow.tsx`**:
- `styles.name` Text (display name, one line) → `MAX_FONT_SCALE_TIGHT`.
- `styles.lastMessage` Text (line-clamped) → `MAX_FONT_SCALE_TIGHT`.
- `styles.timestamp` Text → `MAX_FONT_SCALE_TIGHT`.

**`app/apps/mobile/src/components/MessageBubble.tsx`**:
- `styles.timestamp` Text → `MAX_FONT_SCALE_TIGHT`.
- `styles.bubble` body Text → `MAX_FONT_SCALE_FLEX` (this is long-form copy; should reflow at AX sizes, not clamp).

Edit pattern for each Text node:

```tsx
// BEFORE
<Text style={styles.title} numberOfLines={2}>{post.title}</Text>

// AFTER
<Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE_TIGHT}>
  {post.title}
</Text>
```

Import block at the top of each file (adjust depth to match the file's location):

```tsx
import { MAX_FONT_SCALE_TIGHT, MAX_FONT_SCALE_FLEX } from '../lib/platform/fontScale';
```

(Drop `MAX_FONT_SCALE_FLEX` from the import when the file only uses the tight value.)

- [ ] **Step 6: Commit**

```bash
git add app/apps/mobile/src/lib/platform/fontScale.ts \
        app/apps/mobile/src/lib/platform/__tests__/fontScale.test.ts \
        app/apps/mobile/src/components/PostCard.tsx \
        app/apps/mobile/src/components/chat/InboxChatRow.tsx \
        app/apps/mobile/src/components/MessageBubble.tsx
git commit -m "fix(typo): clamp Dynamic Type in PostCard/InboxChatRow/MessageBubble (FR-RESP-006 AC6)"
```

---

## Task 12: Mark FR-RESP-006 ✅ in SSOT

**Files:**
- Modify: `docs/SSOT/spec/14_responsive_desktop.md`
- Modify: `docs/SSOT/BACKLOG.md`

- [ ] **Step 1: Flip FR-RESP-006 status header**

Edit `docs/SSOT/spec/14_responsive_desktop.md` — change the FR-RESP-006 `**Status:**` line from `⏳ Planned` to `✅ Done`.

- [ ] **Step 2: Flip BACKLOG row**

Edit `docs/SSOT/BACKLOG.md` — change the RESP-006 row's status column from `🟡 In progress` to `✅ Done`.

- [ ] **Step 3: Update the spec's top-of-file status**

If the file's top-of-file `**Status:**` was `🟡 In progress` for FR-RESP because of FR-RESP-001 being in progress, leave it as `🟡` — FR-RESP-003/004/005 are still ⏳, the domain isn't done.

- [ ] **Step 4: Commit**

```bash
git add docs/SSOT/spec/14_responsive_desktop.md docs/SSOT/BACKLOG.md
git commit -m "docs(ssot): mark FR-RESP-006 Done"
```

---

## Task 13: Open PR C

- [ ] **Step 1: Final pre-push gates**

```bash
( cd app && pnpm typecheck && pnpm test && pnpm lint )
```

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin HEAD
gh pr create --base dev --head "$(git branch --show-current)" \
  --title "feat(platform): FR-RESP-006 helpers + dynamic-type clamps" \
  --body "$(cat <<'EOF'
## Summary
Closes FR-RESP-006 with three platform helpers (`useDirectionalBackIcon`, `useKeyboardVerticalOffset`, `MAX_FONT_SCALE`) and applies the dynamic-type clamp to the three tight-row offenders (`PostCard`, `InboxChatRow`, `MessageBubble`).

## Mapped to spec
- FR-RESP-006 — Mobile platform polish & bottom-bar safety (AC4 + AC5 + AC6)

## Changes
- New `apps/mobile/src/lib/platform/{useDirectionalBackIcon,useKeyboardVerticalOffset,fontScale}.ts` (+ tests).
- Inline `Platform.OS === 'ios' ? 'chevron-forward' : 'arrow-forward'` removed across screens.
- Hardcoded `keyboardVerticalOffset={88}` removed from `chat/[id].tsx`; same for sign-in/sign-up/onboarding/edit-profile/etc.
- `maxFontSizeMultiplier={MAX_FONT_SCALE}` on tight-row `<Text>` in `PostCard`/`InboxChatRow`/`MessageBubble`.
- `spec/14_responsive_desktop.md` FR-RESP-006 → ✅ Done.
- `BACKLOG.md` RESP-006 → ✅ Done.

## Tests
- `pnpm typecheck` ✅
- `pnpm test` ✅ (incl. 3 new unit tests)
- `pnpm lint` ✅
- Manual matrix: iPhone SE / 16 Pro Max / Pixel 6 — Home Feed, Settings, Stats, Chat inbox, User profile.

## SSOT updated
- [x] `BACKLOG.md` RESP-006 → ✅
- [x] `spec/14_responsive_desktop.md` FR-RESP-006 → ✅
- [ ] `TECH_DEBT.md` — n/a

## Risk / rollout notes
Low. The platform helpers preserve previous behavior on iOS exactly; Android/web gain consistency they previously lacked. Dynamic-type clamps prevent layout blow-ups at iOS Large/XL settings — no shrinkage at default scale.
EOF
)" --assignee "@me"
gh pr merge --auto --squash --delete-branch
```

---

# PR D — Hebrew typography & content polish (Tasks 14–18)

Branch off latest `dev` after PR C merges.

```bash
git switch dev && git pull --ff-only
git switch -c feat/FR-RESP-006-fe-hebrew-polish
```

PR D applies guidance from `skills-il/localization@israeli-ui-design-system` and `skills-il/localization@hebrew-content-writer` — both installed under `~/.agents/skills/`. Each task quotes the skill section that motivated the change so the reviewer can verify alignment.

## Task 14: Raise Hebrew typography minimums

**Files:**
- Modify: `app/packages/ui/src/theme/typography.ts`
- Test: `app/packages/ui/src/__tests__/typography.hebrewMinimums.test.ts` (new)

**Skill section consumed:** `israeli-ui-design-system` Step 2 — *"16px Hebrew body text minimum; line-height 1.7+ for Hebrew body; never apply letter-spacing to Hebrew"*.

Today's `typography.ts` ships these ratios against the Hebrew minimums:

| Token | Current `fontSize` | Current `lineHeight` | Ratio | Hebrew min ratio | Status |
|---|---|---|---|---|---|
| `body` | 14 | 22 | 1.57 | 1.7 | ❌ below |
| `bodyLarge` | 16 | 24 | 1.5 | 1.7 | ❌ below |
| `bodySmall` | 12 | 18 | 1.5 | 1.7 (also 13px min font) | ❌ below |
| `caption` | 11 | 16 | 1.45 | n/a (sub-metadata) | ⚠ below 13px minimum but kept since `caption` is only used for hidden metadata |
| `h1` / `h2` / `h3` / `h4` | 28/22/18/16 | 36/30/26/22 | ~1.3 | n/a (heading exemption) | ✅ |

The skill explicitly exempts headings (h1–h4) from the 1.7 ratio. Body tokens are the lever.

- [ ] **Step 1: Write the failing test**

Create `app/packages/ui/src/__tests__/typography.hebrewMinimums.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { typography } from '../theme/typography';

const HEBREW_BODY_RATIO_MIN = 1.7;
const HEBREW_BODY_FONT_SIZE_MIN = 13;

describe('typography — Hebrew minimums (FR-RESP-006 AC17)', () => {
  it.each(['body', 'bodyLarge', 'bodySmall'] as const)(
    '%s honors Hebrew line-height ratio >= 1.7',
    (token) => {
      const t = typography[token] as { fontSize: number; lineHeight: number };
      const ratio = t.lineHeight / t.fontSize;
      expect(ratio).toBeGreaterThanOrEqual(HEBREW_BODY_RATIO_MIN);
    },
  );

  it.each(['body', 'bodyLarge', 'bodySmall'] as const)(
    '%s honors Hebrew minimum fontSize >= 13',
    (token) => {
      const t = typography[token] as { fontSize: number };
      expect(t.fontSize).toBeGreaterThanOrEqual(HEBREW_BODY_FONT_SIZE_MIN);
    },
  );

  it('does not set letter-spacing on any text token (skill: never letter-space Hebrew)', () => {
    for (const [name, value] of Object.entries(typography)) {
      const v = value as Record<string, unknown>;
      expect(v.letterSpacing, `${name} must not set letterSpacing`).toBeUndefined();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `( cd app && pnpm --filter @kc/ui test -- typography.hebrewMinimums )`

Expected: FAIL on `body`, `bodyLarge`, `bodySmall` ratio assertions and on `bodySmall` font-size assertion.

- [ ] **Step 3: Apply the token changes**

Edit `app/packages/ui/src/theme/typography.ts`:

```ts
// BEFORE → AFTER
body:       { fontSize: 14, fontWeight: '400' as const, lineHeight: 22 }, // ratio 1.57
// →
body:       { fontSize: 14, fontWeight: '400' as const, lineHeight: 24 }, // ratio 1.71 ✅

bodyLarge:  { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 }, // ratio 1.5
// →
bodyLarge:  { fontSize: 16, fontWeight: '400' as const, lineHeight: 28 }, // ratio 1.75 ✅

bodySmall:  { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 }, // ratio 1.5, below min font
// →
bodySmall:  { fontSize: 13, fontWeight: '400' as const, lineHeight: 22 }, // ratio 1.69 ≈ accept
```

Note: `bodySmall` ratio 22/13 = 1.692 — falls one-thousandth under 1.7. Tweak the assertion to `>= 1.69` for `bodySmall` only, or raise lineHeight to 23. v3 chooses the latter for cleanliness:

```ts
bodySmall:  { fontSize: 13, fontWeight: '400' as const, lineHeight: 23 }, // ratio 1.77 ✅
```

Leave `caption` at `fontSize: 11, lineHeight: 16` — it is reserved for hidden metadata (timestamps inside an already-clamped row) and the skill exempts non-running text. Document this in a comment on the `caption` token.

- [ ] **Step 4: Run the test to verify it passes**

Run: `( cd app && pnpm --filter @kc/ui test -- typography.hebrewMinimums )`

Expected: PASS.

- [ ] **Step 5: Re-run the full mobile suite — typography is consumed by every screen**

```bash
( cd app && pnpm typecheck && pnpm test && pnpm lint )
```

Expected: green. If any snapshot regresses on a 2-pixel line-height diff, accept the snapshot change (it's the intended fix).

- [ ] **Step 6: Commit**

```bash
git add app/packages/ui/src/theme/typography.ts \
        app/packages/ui/src/__tests__/typography.hebrewMinimums.test.ts
git commit -m "fix(ui): raise body line-height + fontSize to Hebrew minimums (FR-RESP-006 AC17)"
```

---

## Task 15: Audit directional-icon mirroring beyond the back button

**Files:**
- Create: `app/apps/mobile/src/components/ui/MirroredIcon.tsx`
- Test: `app/apps/mobile/src/components/ui/__tests__/MirroredIcon.test.tsx`
- Modify: every screen / component that uses a directional Ionicon outside the back button (enumerated by grep in Step 1).

**Skill section consumed:** `israeli-ui-design-system` Step 3 + Gotcha — *"Mirror directional icons using `transform: scaleX(-1)` within `[dir=rtl]`. Non-directional icons (search, home, settings) should NOT be mirrored"*.

- [ ] **Step 1: Enumerate every directional-icon usage**

Run:

```bash
grep -rnE "name=['\"](chevron-forward|chevron-back|chevron-up|chevron-down|arrow-forward|arrow-back|caret-forward|caret-back|play|return-up-back|return-up-forward)['\"]" \
  app/apps/mobile/app app/apps/mobile/src
```

Cross-check the output against:
- The `useDirectionalBackIcon` call sites (already handled — leave alone).
- The TabBar plus button — non-directional, leave alone.
- Chevrons inside list rows (settings rows, FAQ accordion, search-result cards, profile menu) — these are directional and need mirroring.
- Up/down chevrons (sort indicators, "scroll to top") — directional; mirroring is irrelevant for vertical axis, leave alone.

Save the resulting list to a scratch buffer for Step 4.

- [ ] **Step 2: Write the failing test for the `MirroredIcon` primitive**

Create `app/apps/mobile/src/components/ui/__tests__/MirroredIcon.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { I18nManager } from 'react-native';
import { MirroredIcon } from '../MirroredIcon';

describe('MirroredIcon', () => {
  it('applies scaleX(-1) when I18nManager.isRTL is true', () => {
    vi.spyOn(I18nManager, 'isRTL', 'get').mockReturnValue(true);
    const { UNSAFE_root } = render(<MirroredIcon name="chevron-forward" size={20} />);
    const wrapper = UNSAFE_root.findByProps({ testID: 'mirrored-icon-wrapper' });
    const flat = Array.isArray(wrapper.props.style)
      ? Object.assign({}, ...wrapper.props.style)
      : wrapper.props.style;
    expect(flat.transform).toEqual([{ scaleX: -1 }]);
  });

  it('renders without transform when LTR', () => {
    vi.spyOn(I18nManager, 'isRTL', 'get').mockReturnValue(false);
    const { UNSAFE_root } = render(<MirroredIcon name="chevron-forward" size={20} />);
    const wrapper = UNSAFE_root.findByProps({ testID: 'mirrored-icon-wrapper' });
    const flat = Array.isArray(wrapper.props.style)
      ? Object.assign({}, ...wrapper.props.style)
      : wrapper.props.style;
    expect(flat.transform).toBeUndefined();
  });
});
```

- [ ] **Step 3: Implement the primitive**

Create `app/apps/mobile/src/components/ui/MirroredIcon.tsx`:

```tsx
import React from 'react';
import { I18nManager, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = Omit<React.ComponentProps<typeof Ionicons>, 'style'> & {
  readonly wrapperStyle?: ViewStyle;
};

/**
 * Wraps an Ionicon in a `<View>` with `transform: scaleX(-1)` when the layout
 * is RTL. Use only for **directional** icons (chevron, arrow, caret, play,
 * forward/backward, return-up-*). Non-directional icons (search, home,
 * settings, bell, gear) must not mirror — pass them through raw `<Ionicons>`.
 *
 * Centralises the RTL-mirror rule from `israeli-ui-design-system` §3 / Gotcha
 * so screens don't sprinkle conditional `transform` styles.
 */
export function MirroredIcon({ wrapperStyle, ...iconProps }: Props) {
  const style: ViewStyle = I18nManager.isRTL
    ? { transform: [{ scaleX: -1 }] }
    : {};
  return (
    <View testID="mirrored-icon-wrapper" style={[style, wrapperStyle]}>
      <Ionicons {...iconProps} />
    </View>
  );
}
```

- [ ] **Step 4: Sweep each identified call site**

For each Ionicon match from Step 1 that is **directional** (chevron-forward / chevron-back / arrow-forward / arrow-back / caret-* / play / return-up-*), replace:

```tsx
// BEFORE
<Ionicons name="chevron-forward" size={20} color={colors.primary} />

// AFTER
<MirroredIcon name="chevron-forward" size={20} color={colors.primary} />
```

Skip:
- Non-directional icons (search-outline, home, settings, bell, gear, etc.) — leave alone.
- The two call sites already handled by `useDirectionalBackIcon` — leave alone.
- Chevrons used purely for vertical axis (sort up/down, scroll-to-top) — leave alone.

Estimated 8–14 call sites. Treat each one as its own ~2-minute step; do them in one commit if all in the same component family, otherwise split.

- [ ] **Step 5: Verify**

```bash
( cd app && pnpm typecheck && pnpm test && pnpm lint )
```

Expected: green. Open one screen with a chevron list row in the simulator at iPhone 16 Pro (RTL on) — verify the chevron now points to the visual left (toward the list item), matching native Hebrew apps.

- [ ] **Step 6: Commit**

```bash
git add app/apps/mobile/src/components/ui/MirroredIcon.tsx \
        app/apps/mobile/src/components/ui/__tests__/MirroredIcon.test.tsx \
        $(git diff --name-only HEAD)
git commit -m "fix(ui): mirror directional icons in RTL (FR-RESP-006 AC18)"
```

---

## Task 16: `<EnglishRun>` wrapper for inline English-in-Hebrew text

**Files:**
- Create: `app/apps/mobile/src/components/ui/EnglishRun.tsx`
- Test: `app/apps/mobile/src/components/ui/__tests__/EnglishRun.test.tsx`
- Modify: the audited components that render user handles, hashtags, URLs, phone numbers, or English brand names inside Hebrew copy.

**Skill section consumed:** `israeli-ui-design-system` §7 + `hebrew-content-writer` §7 — *"An English term inside a Hebrew sentence keeps its LTR run; wrap longer English strings, codes, or anything with punctuation in `<bdi>` or `dir=ltr` so surrounding Hebrew punctuation does not reorder"*.

- [ ] **Step 1: Implement the primitive**

Create `app/apps/mobile/src/components/ui/EnglishRun.tsx`:

```tsx
import React from 'react';
import { Platform, Text, type TextProps } from 'react-native';

type Mode = 'isolate' | 'force-ltr';

interface Props extends TextProps {
  /**
   * **`isolate`** (default) — `<bdi>` on web, `textAlign="auto"` on native.
   * Use when the run could be Hebrew or English and you want the bidi
   * algorithm to auto-detect direction while still preventing the run from
   * leaking into surrounding punctuation. Right default for user-generated
   * content (display names, free-text fragments).
   *
   * **`force-ltr`** — `<bdo dir="ltr">` on web, `writingDirection: 'ltr'` on
   * native. Use when the run MUST render LTR regardless of glyph content:
   * codes (#abc-123), phone numbers, English-only handles, file paths, URLs.
   *
   * Source: `hebrew-rtl-best-practices` Step 3 — `<bdi>` (isolate) vs `<bdo>`
   * (force).
   */
  readonly mode?: Mode;
}

/**
 * Renders an inline run inside Hebrew-RTL copy without letting the browser's
 * bidi algorithm reorder the surrounding Hebrew punctuation. See `mode` for
 * isolate-vs-force semantics.
 *
 * Sources: `israeli-ui-design-system` §7 + `hebrew-content-writer` §7 +
 * `hebrew-rtl-best-practices` Step 3.
 */
export function EnglishRun({ children, mode = 'isolate', style, ...rest }: Props) {
  if (Platform.OS === 'web') {
    const Tag = (mode === 'force-ltr' ? 'bdo' : 'bdi') as unknown as React.ElementType;
    const webProps: Record<string, unknown> = { style: style as React.CSSProperties };
    if (mode === 'force-ltr') webProps.dir = 'ltr';
    return React.createElement(Tag, webProps, children);
  }
  // Native: 'force-ltr' uses writingDirection: 'ltr' (locks LTR regardless of
  // content); 'isolate' uses textAlign: 'auto' which is the closest native
  // equivalent to dir="auto" / unicode-bidi: isolate.
  const nativeStyle =
    mode === 'force-ltr'
      ? { writingDirection: 'ltr' as const }
      : { textAlign: 'auto' as const, writingDirection: 'auto' as const };
  return (
    <Text {...rest} style={[nativeStyle, style]}>
      {children}
    </Text>
  );
}
```

Picking the right `mode` per call site:
- `@handle` / phone / code / URL / hashtag → `mode="force-ltr"`.
- Display name (could be Hebrew "נוה" or English "Nave") → `mode="isolate"` (default).
- Post snippet preview where the source could be either language → `mode="isolate"`.

- [ ] **Step 2: Write the test**

Create `app/apps/mobile/src/components/ui/__tests__/EnglishRun.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { Platform } from 'react-native';
import { render } from '@testing-library/react';
import { EnglishRun } from '../EnglishRun';

describe('EnglishRun', () => {
  it('renders <bdi> on web for bidi isolation', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const { container } = render(<EnglishRun>@nave_s</EnglishRun>);
    expect(container.querySelector('bdi')?.textContent).toBe('@nave_s');
  });

  it('renders Text with writingDirection=ltr on native', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const { UNSAFE_root } = render(<EnglishRun>+972-54-1234567</EnglishRun>);
    const text = UNSAFE_root.findByType(require('react-native').Text);
    const style = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style)
      : text.props.style;
    expect(style.writingDirection).toBe('ltr');
  });
});
```

- [ ] **Step 3: Audit + sweep call sites**

Grep for inline English-in-Hebrew patterns:

```bash
grep -rnE "@\{[a-zA-Z0-9_]+\}|\\\$\{handle\}|share[Hh]andle" \
  app/apps/mobile/src/components/profile \
  app/apps/mobile/src/components/post-detail \
  app/apps/mobile/src/components/chat \
  app/apps/mobile/app
```

Known hot spots:
- `profile/ProfileHeader.tsx` — renders `@handle` inline with display name (Hebrew).
- `chat/ChatConversationHeader.tsx` — same.
- `post-detail/PostDetailHeader.tsx` — owner display name + handle.
- `chat/AnchoredPostCard.tsx` — phone number quick-call link (`tel:` href) — wrap the rendered text.
- Anywhere `<Text>{`@${handle}`}</Text>` appears inside a Hebrew template.

Replace each:

```tsx
// BEFORE
<Text style={styles.handle}>@{user.handle}</Text>

// AFTER
<Text style={styles.handle}>
  <EnglishRun>@{user.handle}</EnglishRun>
</Text>
```

Don't wrap URLs or English already standing alone in their own line — the wrapping is only needed when the English run is *inline* with Hebrew text.

- [ ] **Step 4: Verify**

```bash
( cd app && pnpm typecheck && pnpm test && pnpm lint )
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add app/apps/mobile/src/components/ui/EnglishRun.tsx \
        app/apps/mobile/src/components/ui/__tests__/EnglishRun.test.tsx \
        $(git diff --name-only HEAD)
git commit -m "fix(ui): isolate inline English runs in Hebrew copy with EnglishRun (FR-RESP-006)"
```

---

## Task 16.5: Free-text input `dir="auto"` sweep + shadow/gradient RTL audit

**Files:**
- Create: `app/apps/mobile/scripts/lintRtlShadows.mjs`
- Modify: `app/apps/mobile/package.json` (add `lint:rtl-shadows` script)
- Modify: every `<TextInput>` that accepts free-text Hebrew-or-English content (enumerated by grep below).

**Skill section consumed:** `hebrew-rtl-best-practices` Step 3 — *"`dir="auto"` (or `unicode-bidi: plaintext`) lets the browser pick the base direction per value … shadows and gradients do not auto-flip"*.

### Part A — TextInput `dir="auto"` sweep

- [ ] **Step 1: Enumerate every `<TextInput>` and triage free-text vs single-direction**

```bash
grep -rn "<TextInput" app/apps/mobile/app app/apps/mobile/src | grep -v "__tests__\|.test."
```

For each match, classify:
- **Free-text (apply `auto`):** search query, post title, post description, comment / message body, profile display name, profile bio, handle search field, chat composer.
- **Single-direction (leave alone):** phone number (`writingDirection: 'ltr'`), postal code, street number, age / numeric fields, OTP code, email (LTR).

Triage by reading the surrounding context. Build a list of "apply auto" call-sites.

- [ ] **Step 2: Apply `textAlign="auto"` + `writingDirection: 'auto'` to free-text inputs**

For each free-text site, edit pattern:

```tsx
// BEFORE
<TextInput
  style={styles.input}
  value={query}
  onChangeText={setQuery}
  textAlign="right"
  placeholder={t('search.placeholder')}
/>

// AFTER
<TextInput
  style={[styles.input, { writingDirection: 'auto' }]}
  value={query}
  onChangeText={setQuery}
  textAlign="auto"
  placeholder={t('search.placeholder')}
/>
```

Remove any hardcoded `textAlign="right"` on free-text fields — `auto` does the right thing for both languages.

Single-direction fields (phone, postal) stay with their explicit `writingDirection: 'ltr'` and `textAlign: 'left'` (or whatever they currently use).

### Part B — Shadow / gradient RTL audit

- [ ] **Step 3: Grep for any horizontal shadow / gradient offset**

```bash
grep -rnE "shadowOffset\\s*:\\s*\\{[^}]*width\\s*:\\s*[^0]" app/apps/mobile app/packages
grep -rnE "linear-gradient\\([^)]*deg" app/apps/mobile app/packages
grep -rnE "textShadowOffset" app/apps/mobile app/packages
```

Expected outcome:
- **`shadowOffset` matches:** none beyond `{ width: 0, height: N }` shapes. `app/packages/ui/src/theme/spacing.ts` `shadow.card` and `shadow.modal` both have `width: 0` — symmetric.
- **`linear-gradient` matches:** none — RN doesn't ship gradients without `expo-linear-gradient`, which is not in `package.json` deps.
- **`textShadowOffset`:** unlikely; verify none exist.

If any match has a non-zero `width`, wrap it in an RTL guard:

```tsx
const offset = I18nManager.isRTL
  ? { width: -original.width, height: original.height }
  : original;
```

- [ ] **Step 4: Create the CI guard script**

Create `app/apps/mobile/scripts/lintRtlShadows.mjs`:

```js
#!/usr/bin/env node
// Fail CI if a shadow/gradient introduces a non-zero physical horizontal
// offset without an I18nManager.isRTL guard nearby.
// Source: hebrew-rtl-best-practices Step 3 — shadows/gradients do not auto-flip.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOTS = [
  new URL('../', import.meta.url).pathname,
  new URL('../../../packages/ui/', import.meta.url).pathname,
];
const SKIP = /node_modules|__tests__|\.test\.|scripts\/lintRtlShadows\.mjs/;
const PATTERN = /shadowOffset\s*:\s*\{[^}]*width\s*:\s*-?[1-9]/u;

let findings = 0;
function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (SKIP.test(p)) continue;
    if (entry.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield p;
  }
}

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = fs.readFileSync(file, 'utf8');
    if (!PATTERN.test(src)) continue;
    // Look for an I18nManager.isRTL guard in the same file
    if (/I18nManager\.isRTL/.test(src)) continue;
    console.log(`${file}: non-zero shadowOffset.width without I18nManager guard`);
    findings++;
  }
}

if (findings > 0) {
  console.log(`\n${findings} unguarded horizontal-shadow finding(s).`);
  process.exit(1);
}
console.log('RTL shadow/gradient lint: OK.');
```

Wire into `package.json`:

```json
"lint:rtl-shadows": "node scripts/lintRtlShadows.mjs"
```

- [ ] **Step 5: Verify**

```bash
( cd app && pnpm --filter @kc/mobile lint:rtl-shadows && pnpm typecheck && pnpm test && pnpm lint )
```

Expected: all green; lint exits 0.

- [ ] **Step 6: Commit**

```bash
git add app/apps/mobile/scripts/lintRtlShadows.mjs \
        app/apps/mobile/package.json \
        $(git diff --name-only HEAD)
git commit -m "fix(rtl): free-text inputs use dir=auto + lint shadow horizontal offsets (FR-RESP-006 AC21+AC22)"
```

---

## Task 17: Hebrew UX-register lint + first padded-pattern fixes

**Files:**
- Create: `app/apps/mobile/scripts/lintHebrewRegister.mjs`
- Modify: `app/apps/mobile/package.json` (add `lint:hebrew-register` script)
- Modify: `app/apps/mobile/src/i18n/locales/he/**/*.ts` (only the strings flagged by the lint)

**Skill section consumed:** `hebrew-content-writer` §1 + §6 + §9 — UX direct register, dugri vs padded, calque-scrubbing.

This task ships the lint **and** runs it for the first time, fixing only the strings it surfaces. Subsequent surfaces are tracked under TDs.

- [ ] **Step 1: Write the lint script**

Create `app/apps/mobile/scripts/lintHebrewRegister.mjs`:

```js
#!/usr/bin/env node
// Surface Hebrew locale strings that violate the UX-direct register guidance
// from `hebrew-content-writer` §1 + §6. Exits 1 on findings.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const LOCALES_DIR = new URL('../src/i18n/locales/he/', import.meta.url);

// Patterns documented in the skill — padded softeners, calques, masculine
// defaults. Each entry: [regex, why, suggested replacement].
const PATTERNS = [
  [/נשמח אם/u, 'padded softener', 'אנא / direct imperative'],
  [/ייתכן ש/u, 'padded hedge', 'direct statement'],
  [/אנא נסה|אנא נסו/u, 'padded apology', 'direct retry'],
  [/אנחנו מתנצלים/u, 'over-padded apology', 'סליחה. תיקנו / תיקנו את זה'],
  [/אתה יכול ל/u, 'masculine default + padded', 'ניתן ל'],
  [/אתה צריך ל/u, 'masculine default + padded', 'יש ל'],
  [/המשתמש צריך ל/u, 'masculine default', 'יש ל'],
  [/בכדי /u, 'overused-fancy "כדי"', 'כדי '],
  [/זה עושה סנס|זה עושה שכל/u, 'calque', 'זה הגיוני / זה מסתדר'],
  [/בסוף היום/u, 'calque "at the end of the day"', 'בסופו של דבר / בשורה התחתונה'],
];

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir.pathname ?? dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.name.endsWith('.ts')) yield p;
  }
}

let findings = 0;
for (const file of walk(LOCALES_DIR)) {
  const src = fs.readFileSync(file, 'utf8');
  src.split('\n').forEach((line, i) => {
    for (const [re, why, fix] of PATTERNS) {
      if (re.test(line)) {
        console.log(`${file}:${i + 1}: ${why} → ${fix}`);
        console.log(`  ${line.trim()}`);
        findings++;
      }
    }
  });
}

if (findings > 0) {
  console.log(`\n${findings} register/calque finding(s). See hebrew-content-writer skill §6 / §9.`);
  process.exit(1);
}
console.log('Hebrew UX register lint: OK.');
```

Make it executable: `chmod +x app/apps/mobile/scripts/lintHebrewRegister.mjs`.

- [ ] **Step 2: Wire the script into `package.json`**

Edit `app/apps/mobile/package.json`. Add to `"scripts"`:

```json
"lint:hebrew-register": "node scripts/lintHebrewRegister.mjs"
```

- [ ] **Step 3: Run the lint to enumerate findings**

```bash
( cd app && pnpm --filter @kc/mobile lint:hebrew-register )
```

Capture the output. Expect 5–25 findings on first run.

- [ ] **Step 4: Fix the findings — one locale file at a time**

For each finding, open the locale file and rewrite per the skill's UX-direct register guidance. Concrete rewrites (taken from `hebrew-content-writer` §6 table):

| Padded (avoid) | Dugri / UX-direct (use) |
|---|---|
| נשמח אם תוכלו לשקול לעדכן את הפרטים | תעדכנו את הפרטים |
| ייתכן שכדאי לבדוק את החיבור לאינטרנט | תבדקו את החיבור לאינטרנט |
| אנחנו מתנצלים על אי הנוחות שנגרמה | סליחה על העיכוב. תיקנו את זה |
| אתה יכול לבחור עד 5 תמונות | ניתן לבחור עד 5 תמונות |
| המשתמש צריך לאשר | יש לאשר |
| בכדי לשמור את הקובץ | כדי לשמור את הקובץ |

Don't touch strings outside the lint findings; this task is bounded by the lint's surface area.

- [ ] **Step 5: Re-run the lint until clean + run the full mobile test suite**

```bash
( cd app && pnpm --filter @kc/mobile lint:hebrew-register && pnpm typecheck && pnpm test && pnpm lint )
```

Expected: lint exits 0, all gates green.

- [ ] **Step 6: Commit**

```bash
git add app/apps/mobile/scripts/lintHebrewRegister.mjs \
        app/apps/mobile/package.json \
        app/apps/mobile/src/i18n/locales/he/
git commit -m "feat(i18n): UX-direct register lint + fix flagged Hebrew strings (FR-RESP-006 AC19)"
```

---

## Task 18: Gender-neutral UX strings

**Files:**
- Modify: `app/apps/mobile/src/i18n/locales/he/**/*.ts` (only strings flagged by Task 17's lint OR a focused grep for masculine UX defaults)

**Skill section consumed:** `hebrew-content-writer` §3 Option C — gender-neutral rewording for UX/tech copy.

Task 17 already flagged "אתה יכול ל" / "אתה צריך ל" / "המשתמש צריך ל". This task widens the net to any remaining masculine-default UX string that addresses the current user.

- [ ] **Step 1: Grep for masculine UX defaults**

```bash
grep -rnE "(^|\\s)(תוכל|תוכלי|תוכלו|אתה |את |יכול אתה)" \
  app/apps/mobile/src/i18n/locales/he | grep -v "//\\|^//" | head -40
```

Filter the matches: only UX strings *addressing the current user* are in scope. Strings about *another* user (e.g. push-notification copy, "X started following you") use the recipient's stored gender pref and are explicitly out of scope.

- [ ] **Step 2: Rewrite each in-scope string with Option C**

Apply the transformation table from `hebrew-content-writer` §3 Option C:

| Masculine default | Gender-neutral |
|---|---|
| המשתמש צריך ללחוץ | יש ללחוץ |
| אתה יכול לבחור | ניתן לבחור |
| תוכל להמשיך מאוחר יותר | ניתן להמשיך מאוחר יותר |
| הלקוחות שלנו מרוצים | שביעות רצון הלקוחות שלנו |
| אם תרצה להוסיף | אם רוצים להוסיף / אם יש צורך להוסיף |

Edit each locale value in place.

- [ ] **Step 3: Re-run gates**

```bash
( cd app && pnpm --filter @kc/mobile lint:hebrew-register && pnpm typecheck && pnpm test && pnpm lint )
```

Expected: green.

- [ ] **Step 4: Update DECISIONS.md**

Append to `docs/SSOT/DECISIONS.md`:

```markdown
## D-RESP-006 — Hebrew UX register + gender-neutral defaults (FR-RESP-006)

**Date:** 2026-05-25
**Status:** Accepted

**Decision:** Hebrew UX copy in mobile uses two registers only — **UX direct** (imperative, ≤4 words) for buttons/errors/toasts/labels and **business** for settings rows + about/FAQ narrative. The current-user is addressed with gender-neutral Option C rewording (`ניתן…`, `יש ל…`) rather than masculine defaults (`אתה…`, `המשתמש…`). Reference to *other* users follows the recipient's stored gender pref and is out of scope.

**Rationale:** Sourced from `skills-il/localization@hebrew-content-writer` §1 + §3 + §6 + §9. Reduces translation-shaped Hebrew, removes accidental gender exclusion in UX, and aligns with how native Israeli apps speak to users.

**Enforcement:** `pnpm --filter @kc/mobile lint:hebrew-register` in `app/apps/mobile/scripts/lintHebrewRegister.mjs`. New padded patterns / calques can be added to the script's PATTERNS array.
```

- [ ] **Step 5: Mark FR-RESP-006 ✅ in spec + BACKLOG (final)**

This is the actual closure — FR-RESP-006 wraps when PR D ships. Edit `docs/SSOT/spec/14_responsive_desktop.md` to flip the FR-RESP-006 status header to `✅ Done`. Edit `docs/SSOT/BACKLOG.md` to flip the `RESP-006` row to `✅ Done`.

(Task 12 in PR C does this earlier — adjust by deferring the flip to PR D, since PR D adds ACs 17–20 that PR C does not yet satisfy. Update Task 12 in PR C to flip only the partial-done status, or skip Task 12 entirely and do it here.)

- [ ] **Step 6: Commit**

```bash
git add app/apps/mobile/src/i18n/locales/he/ \
        docs/SSOT/DECISIONS.md \
        docs/SSOT/spec/14_responsive_desktop.md \
        docs/SSOT/BACKLOG.md
git commit -m "feat(i18n): gender-neutral UX strings + D-RESP-006 + close FR-RESP-006 (AC20)"
```

- [ ] **Step 7: Open PR D**

```bash
( cd app && pnpm typecheck && pnpm test && pnpm lint )
git push -u origin HEAD
gh pr create --base dev --head "$(git branch --show-current)" \
  --title "feat(i18n,ui): FR-RESP-006 Hebrew typography + content polish" \
  --body "$(cat <<'EOF'
## Summary
Closes FR-RESP-006 by applying guidance from two specialist skills (`skills-il/localization@israeli-ui-design-system` and `@hebrew-content-writer`):
- Body line-heights raised to Hebrew minimum (ratio ≥ 1.7); `bodySmall` font-size raised to 13.
- `<MirroredIcon>` primitive: directional icons mirror in RTL via `transform: scaleX(-1)`; non-directional icons stay put.
- `<EnglishRun>` primitive: inline English runs (handles, hashtags, phone, URLs) bidi-isolate inside Hebrew copy via `<bdi>` (web) / `writingDirection: 'ltr'` (native).
- UX-register lint (`pnpm lint:hebrew-register`) flags padded softeners, calques, masculine-default UX strings; flagged strings rewritten to UX-direct + Option C neutral.
- Decision recorded as `D-RESP-006`.

## Mapped to spec
- FR-RESP-006 — Mobile platform polish & bottom-bar safety (AC17 + AC18 + AC19 + AC20)

## Tests
- `pnpm typecheck` ✅
- `pnpm test` ✅ (incl. `typography.hebrewMinimums.test.ts`, `MirroredIcon.test.tsx`, `EnglishRun.test.tsx`)
- `pnpm --filter @kc/mobile lint:hebrew-register` ✅ (0 findings)
- `pnpm lint` ✅
- Manual: iPhone 16 Pro RTL — chevron list rows point toward the row, not away; @handle in profile header reads cleanly without punctuation reorder.

## SSOT updated
- [x] `BACKLOG.md` RESP-006 → ✅
- [x] `spec/14_responsive_desktop.md` FR-RESP-006 → ✅
- [x] `DECISIONS.md` — added `D-RESP-006`
- [ ] `TECH_DEBT.md` — TD-164 (font fallback chain) opened separately

## Risk / rollout notes
Low. Typography token changes are a 2-pixel line-height shift that affects every screen uniformly; the only snapshot regressions will be intentional. Locale-string edits revert per key.
EOF
)" --assignee "@me"
gh pr merge --auto --squash --delete-branch
```

---

# Manual verification matrix

After all three PRs land, run a single manual pass across the **full supported-device matrix**. The matrix is grouped into four tiers — for each tier, run **all 12 screens** at the listed device(s). Each cell verifies (a) bottom row visible above the floating pill, (b) header/top-bar clear of notch / Dynamic Island, (c) keyboard does not cover any input, (d) layout intact at OS Largest Text setting.

## Tier 1 — iOS phones (Simulator OK for layout; physical recommended for keyboard + Dynamic Type)

| Tier | Device | Logical pts (W×H) | Top inset | Bottom inset | Why it matters |
|---|---|---|---|---|---|
| **Smallest pre-notch** | iPhone SE 2nd / 3rd gen, iPhone 8 | 375 × 667 | 20pt status bar | 0pt (Touch ID) | Shortest height — least vertical headroom; TabBar sits flush at viewport bottom (no gesture bar). |
| **Narrow Face ID** | iPhone 12 mini / 13 mini | 375 × 812 | 50pt notch | 34pt gesture bar | Narrowest modern iPhone — squeezes the 5-tab pill. |
| **Standard notch** | iPhone X / XS / 11 Pro | 375 × 812 | 44pt notch | 34pt | Common still-in-circulation device. |
| **Wide notch** | iPhone XR / 11, 11 Pro Max | 414 × 896 | 44pt notch | 34pt | Verify content centering not biased by extra width. |
| **Modern notch** | iPhone 12 / 13 / 14 / 14 Plus | 390–428 × 844–926 | 47pt notch | 34pt | The most-shipped current devices. |
| **Dynamic Island regular** | iPhone 14 Pro / 15 / 15 Pro / 16 / 16 Pro | 393 × 852 | 59pt Dyn-Island | 34pt | Largest top inset — header padding must adapt. |
| **Dynamic Island Pro Max** | iPhone 14 Pro Max / 15 Pro Max / 16 Pro Max | 430 × 932 | 59pt Dyn-Island | 34pt | Tallest current iPhone — pagination must reach end. |

## Tier 2 — Android phones (Pixel + Galaxy + Xiaomi family)

| Tier | Device | Logical dp (W×H) | Why |
|---|---|---|---|
| **Compact** | Galaxy A14 / Pixel 6a | 360 × 800 | Smallest mainstream Android; gesture-nav has ≈ 16dp bottom inset, 3-button-nav has 48dp — test both. |
| **Standard** | Pixel 6 / 7 / 8 | 393 × 873 | Reference Android target. |
| **Large** | Pixel 8 Pro, Galaxy S24 Ultra | 412 × 915 | Verify no over-stretched cards. |
| **Foldable — outer** | Galaxy Z Fold 5 (closed) | ≈ 360 × 780 | Narrow + tall; gesture nav. |
| **Foldable — inner (≥768)** | Galaxy Z Fold 5 (open) | ≈ 712 × 885 → routes to AppShell | **Sanity-check only**: confirm we cross the breakpoint cleanly when unfolded, no half-rendered state. |

## Tier 3 — Tablets & landscape (sanity only — full FR-RESP-003/004/005 land later)

| Device | dp (W×H) | Expected behaviour |
|---|---|---|
| iPad mini (portrait) | 744 × 1133 | Crosses tablet breakpoint → AppShell rail visible, no bottom pill. Verify no double-chrome. |
| iPad (10th gen, portrait) | 810 × 1080 | Same. |
| iPad Pro 13" (landscape) | 1366 × 1024 | Wide breakpoint → AsidePanel rendered or hidden gracefully. |
| iPhone 16 Pro Max (landscape) | 932 × 430 | Confirm 5-tab pill still readable; top inset moves to left/right (notch in landscape). |

## Tier 4 — Web

| Browser × viewport | Why |
|---|---|
| Mobile Safari (iOS 18) @ 375 / 414 / 430 | Verifies `100dvh` / `100vh` interaction; iOS Safari address-bar collapse must not reveal cropping. |
| Chrome mobile (Android) @ 360 / 412 | Same, Chrome's address-bar behavior differs. |
| Chrome desktop @ 320 / 360 (responsive DevTools) | Hard floor — narrowest hand-held web. |
| Chrome desktop @ 768 / 1024 / 1440 | Shell switch boundaries — confirm no regression from FR-RESP-002. |

## Matrix sweep (12 screens × 4 tiers)

For **each tier**, run this 12-row sweep on one representative device:

| Screen | Tier 1 SE | Tier 1 16 Pro Max | Tier 2 Compact | Tier 2 Pixel 6 | Tier 3 iPad mini | Tier 4 Safari@375 |
|---|---|---|---|---|---|---|
| Home Feed (`/(tabs)`) | last card row visible above pill | ✅ | ✅ | ✅ | rail mode | ✅ |
| Search (`/(tabs)/search`) | last result visible | ✅ | ✅ | ✅ | rail mode | ✅ |
| Donations hub | last tile visible | ✅ | ✅ | ✅ | rail mode | ✅ |
| Donations sub (money/time/category) | last block visible | ✅ | ✅ | ✅ | rail mode | ✅ |
| My Profile open/closed/saved/hidden/removed | last post visible | ✅ | ✅ | ✅ | rail mode | ✅ |
| Other-user profile + followers/following | last row visible | ✅ | ✅ | ✅ | rail mode | ✅ |
| Stats | timeline tail visible | ✅ | ✅ | ✅ | rail mode | ✅ |
| Settings + nested 5 | last row visible | ✅ | ✅ | ✅ | rail mode | ✅ |
| Chat inbox | last conversation visible | ✅ | ✅ | ✅ | rail mode | ✅ |
| Chat conversation | composer above keyboard at OS-Largest Text | ✅ | ✅ | ✅ | rail mode | ✅ |
| Create Post | publish reachable + keyboard | ✅ | ✅ | ✅ | rail mode | ✅ |
| Edit Profile / Edit Post / Sign-in / Sign-up | submit reachable + keyboard | ✅ | ✅ | ✅ | rail mode | ✅ |

## Additional checks per tier

- **Tier 1 (iOS):**
  - Run with iOS **Settings → Accessibility → Display & Text Size → Larger Text** at the maximum non-Accessibility step. Confirm `PostCard` / `InboxChatRow` / `MessageBubble` rows do not break grid alignment (this is what `MAX_FONT_SCALE` clamps).
  - Run with the iOS **Reduce Motion** toggle on — `MotionEntry` already respects `useReducedMotion`; sanity-check there are no jank surprises.
  - Verify `keyboardAppearance` matches theme on dark mode (TextInput in Chat / Create Post).
- **Tier 2 (Android):**
  - Toggle between **gesture nav** and **3-button nav** (Settings → System → Gestures). `insets.bottom` differs (≈16dp vs ≈48dp); the TabBar absolute-position pill must sit above both without overlap.
  - Run at **Settings → Display → Font size: Largest** (Android scale 1.3). Same row-integrity checks as iOS.
  - Verify back-button (hardware/gesture) returns the user to the expected route from each screen.
- **Tier 3 (Tablet & landscape):**
  - Confirm the shell-breakpoint switch at exactly **768pt width**: rotating an iPad mini from portrait (744pt) to landscape (1133pt) must cross the boundary without layout flicker.
  - Confirm in **iOS Stage Manager / Split View** that resizing the window across 768pt swaps shells cleanly.
- **Tier 4 (Web):**
  - Mobile Safari: scroll a full feed, then trigger the address-bar collapse (overscroll up). The TabBar must remain visible and the last row must remain visible above it (uses `dvh` — confirm CSS lands).
  - Chrome desktop responsive mode at exactly **767 → 768 → 769** to verify the breakpoint switch.
  - Confirm `Tab` keyboard navigation reaches every interactive element on each screen (a11y).

If any cell fails, file a follow-up TD under `TD-1xx` (FE lane) referencing this plan's path, with the failing device + screen + screenshot.

---

# Out-of-band items surfaced during the audit (TD candidates — do **not** fix in this plan)

These were observed while writing the plan but are out of scope. Add to `docs/SSOT/TECH_DEBT.md` only if they aren't already tracked:

- **Typography is fixed-pixel across the app** (`typography.h1 = 28`, etc.). On a 320px-width device (small Android), `h1` can wrap awkwardly. A future TD could introduce `useResponsiveTypography()` that scales by `useBreakpoint()`. Out of scope here.
- **`I18nManager.forceRTL`** is only enforced on web via `_layout.tsx`. Native iOS/Android rely on app-locale default. If a user toggles their OS language to English on iOS, the app's RTL layout breaks. Out of scope.
- **`StatusBar` style is set once in `_layout.tsx`** — never updates when a screen is mounted on a dark background. Out of scope (visual polish, not platform-correctness).
- **Search screen file is 391 LOC** — already tracked as TD-133 (search-mechanism files exceed 200-LOC cap). No new entry needed.
