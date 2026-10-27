# KC — App language switch (Hebrew ↔ English)

**FR:** FR-SETTINGS-018 · **Decision:** D-167 · **Date:** 2026-07-05 · **Status:** ✅ Implemented

## Problem

KC is Hebrew-only, RTL-forced (`R-MVP-Core-4`). The PM urgently needs a user-facing option to switch the KC UI to English (at `https://karma-community-kc.com/settings`), shipped to both `dev` and `main`. No English strings exist today (~3,500 Hebrew keys, hardcoded `lng: 'he'`, `I18nManager.forceRTL(true)`).

This is not a hidden toggle — English copy must be *created* and the layout must flip to LTR for English.

## Decision (see D-167)

Ship an opt-in, machine-translated English locale now; Hebrew stays default + `fallbackLng`. Persist the choice device-locally; reload the app on switch so reading-direction re-resolves. Human polish + long-form RTL are deferred as tech debt (TD-176/177/178). PM chose "full English, machine translation" over partial or human-quality-first.

## Architecture

### 1. Locale bundle
- `src/i18n/locales/en/**` mirrors `he/**` file-for-file (44 files), same key structure, English values, placeholders/functions preserved. Export consts renamed `*He → *En`; non-suffixed names (`donations`, `search`, `stats`, `rides`, `aboutContent*`) unchanged.
- `src/i18n/index.ts` registers both bundles: `resources: { he, en }`, `lng: getInitialLanguage()`, `fallbackLng: 'he'`.
- A `localeParity` test asserts `en` and `he` have identical key paths (guards against translator drift / future key additions to only one bundle).

### 2. Preference + persistence — `src/i18n/language.ts`
- `AppLanguage = 'he' | 'en'`; `DEFAULT = 'he'`; `isRtlLanguage(he)=true`.
- `getInitialLanguage()` — synchronous; web reads `localStorage['kc.appLanguage']`, native returns default (reconciled on boot).
- `loadStoredLanguageAsync()` / `persistLanguage()` — web `localStorage`, native `AsyncStorage`.
- `applyLayoutDirection(lang)` — sets `document.documentElement.dir/lang` on web + keeps `I18nManager` in sync.
- `reloadApp()` — web `location.reload()`; native `DevSettings.reload()` (prod needs `expo-updates`, TD-178).

### 3. Direction (RTL ↔ LTR)
The codebase was already mid-migration to LTR-aware helpers (`isLayoutRtl()` reads `document.dir` on web; `textAlignStart()`, `layoutWritingDirectionStyle()` are direction-aware). The remaining hardcoded-RTL *constants* were made direction-aware (evaluated at module load; reload re-resolves them):
- `rtlTextAlignStart` / `rtlTextAlignEnd` (121 importers)
- `webTextRtl` (33 importers)
- `rowDirectionStart` / `rowDirectionEnd` (76 importers)

`_layout.tsx` sets `document.dir`/`lang` from the persisted language at module load (before any style module reads `isLayoutRtl()`), and reconciles the native async preference on boot. Residual scattered `writingDirection: 'rtl'` in long-form content stays RTL-biased for now (TD-177).

### 4. UI
- `app/settings/language.tsx` — picker mirroring the Appearance / Translation-language screens; reuses `LanguageRow`. Options labelled in native script ("עברית" / "English"). On pick: persist → `changeLanguage` → `applyLayoutDirection` → reload.
- `settings.tsx` — new "App language" row (`globe-outline`), above the existing "Translation language" (FR-TRANSLATE-003) row to keep the two language concepts adjacent but distinct.

## Not doing (YAGNI / deferred)
- No `users.language` column (local-only; works for anonymous web). Can add later without breaking the local default.
- No live (reload-free) switch — would require converting ~250 module-load direction constants into reactive hooks across 120+ files.
- No human translation pass in this change (TD-176).

## Verification
- `localeParity` test (en ≡ he key structure) ✅
- `language.ts` unit tests (direction classification, storage read, `document.dir` application) ✅
- `pnpm --filter @kc/mobile typecheck` ✅ · `lint` ✅ (0 errors) · `test` ✅ (490/490 under UTC)
- Recommended follow-up: live browser pass on the dev preview (sign in → Settings → App language → English) to confirm LTR visuals — see TD-177 for known long-form gaps.
