# 17 — Brand and design system

> Decisions **D65, D66, D67, D80** (2026-10-30). This file is the brand book for agents and designers. The values themselves live in code; this file says what they mean, who owns them, and how a change travels.

## 1. Brand identity (D65)

| Item | Value |
|---|---|
| Full name (EN) | **Karma Community** |
| Full name (HE) | **קהילת קארמה** |
| Short name / nickname | **KC** — used in UI chrome, store listing prefix (`KC - קהילת קארמה`), and internal docs |
| Code constant | `brand` in `app/packages/ui/src/theme/brand.ts` |
| Bundle id / package | `org.karmacommunity.app` (`app/apps/mobile/app.json`) |

**KC, the platform vs. KC, the organization (D67).** "KC" names the platform. KC is also an organization that operates *inside* the platform almost like any other organization (D37). Platform chrome (app name, splash, store listing, navigation) speaks as the platform; content published by the KC organization (posts, org page, donations to KC) is styled like any other organization's content, with no extra visual privilege.

**Hidden meaning (D67).** The initials also stand for "קיבוץ קפיטליסטי" ("capitalist kibbutz"). It is an internal easter egg only: it never appears in UI copy, store listings, marketing visuals or the logo.

Rules:
- Never introduce another product name in KC surfaces. GloWe (`app/apps/glowe-web`, `glowe-*` packages) is a separate product and is out of scope for this brand book.
- In Hebrew copy write "קהילת קארמה" or "KC"; do not transliterate "Karma Community" into Hebrew letters.

## 2. Logo

- Master asset: `app/apps/mobile/assets/logo.png` (K + heart + globe). Store icons, splash and favicon are derived from it (`assets/icon.png`, `adaptive-icon*.png`, `splash*.png`, `favicon.png`).
- History: `assets/logo-evolution/` (read-only archive).
- Logo colours: dark navy `#203050` (the K and the globe ring), warm orange/peach gradient (heart), teal `#95D1CF` (globe sea). The navy is the app's `secondary` (D66).
- Do not recolour, stretch, add effects, or place the full-colour logo on a busy or orange background. Use the monochrome adaptive icon on coloured backgrounds.
- The current `logo.png` is the **official master** (D66). Other variants in the Claude Design project (`new_logo`, `new_logo_black`, `pink_logo`) are drafts and are not used in the product.

## 3. Sources of truth and sync flow

```
packages/ui/src/theme/*.ts   ← the ONLY place token values are edited
        │  (vitest file snapshot)
        ▼
packages/ui/tokens/kc.tokens.json   ← generated, W3C design-tokens format
        │
        ├──► Figma: "KC Design System" file — variables (Light/Dark modes), text styles
        └──► Claude Design: "Design System" project — tokens + component previews
```

- **Figma file:** "KC Design System — Karma Community" (`https://www.figma.com/design/Gxu8WNeNlU7rkxeS87lzcj`). Variables: `Color / Light` and `Color / Dark` (same variable names in both — the Figma starter plan allows one mode per collection; merge into one collection with two modes if the plan is upgraded), `Spacing`, `Radius`. Text styles `KC/*`, effect styles `KC/shadow/*`, and a `Foundations` specimen page. Text styles use **Rubik**, the brand font (a Google font, so every Figma user sees it).
- **Code wins.** A value changed in Figma or Claude Design is a *proposal*: it lands only when the matching `theme/*.ts` change is merged, and the JSON + Figma + Claude Design are then refreshed from code.
- `kc.tokens.json` is never hand-edited. Regenerate with `pnpm --filter @kc/ui test -- -u` after changing a token, and commit both files in the same PR.

## 4. Foundations (summary — values in code)

| Foundation | File | Notes |
|---|---|---|
| Colour | `theme/colors.ts` | Two palettes (light, warm-dark) with one shape, `ColorPalette`. Brand primary = warm orange (generosity) — light-mode `#C2410C` so text and icons meet AA; the vivid `#F97316` stays for decoration (ambient blobs, illustrations). Secondary = logo navy (D66). |
| Font | `theme/fonts.ts` | Brand font **Rubik** (Hebrew + Latin, rounded and warm like the logo; SIL OFL) in weights 400/500/600/700/800 (D66). Loaded by `apps/mobile/src/lib/useBrandFonts.ts` before the splash hides; falls back to the system font if loading fails. |
| Typography | `theme/typography.ts` | Scale h1–h4, bodyLarge/body/bodySmall, button, label, caption. Hebrew RTL first. |
| Spacing | `theme/spacing.ts` | 4-based scale `xs…4xl`; shell layout sizes in `shellDimensions`. |
| Radius / elevation | `theme/spacing.ts` | `radius` xs 4 · sm 8 · md 12 · lg 16 · xl 24 · full (D67 — matches the values screens already used most); `shadow.card`, `shadow.modal` (neutral) and `shadow.glow` — the brand-coloured lift under primary calls to action (offset 0/4, opacity 0.3, blur 8, elevation 4; spread it and set `shadowColor: colors.primary`) (D80). |
| Icon size | `theme/iconSize.ts` | `iconSize` xs 14 · sm 16 · md 18 · lg 20 · xl 22 · 2xl 24 (D80 — the six sizes screens already used most, ~85% of literal Ionicons sizes). |
| Layers | `theme/zIndex.ts` | `zIndex` base 0 · raised 1 · overlay 2 · floating 20 · toast 9999 (D80 — the values already in use, so stacking does not change). |
| Weight | `theme/typography.ts` | Weight modifiers `typography.medium / semiBold / bold / extraBold` (500–800), one per loaded Rubik face, spread over a size preset. |
| Decoration orange | `theme/colors.ts` | `primaryVivid` `#F97316` — the same in both palettes; decoration only (no text, no meaning). Config files that cannot import tokens (`app.json` web `themeColor`, notification `color`, `app/+html.tsx`) are pinned to it by `brandGuard.test.ts`. |
| Avatar colours | `theme/colors.ts` | `avatarPalette` — 8 theme-independent backgrounds with white initials, each ≥ 4.5:1. |
| Breakpoints | `theme/breakpoints.ts` | Responsive shell (mobile → desktop web). |

Usage rules for app code (`app/apps/mobile/**`):
1. Colours come from `useTheme()` / `makeUseStyles()` only — no hex or `rgb()` literals.
2. Font sizes come from `typography.*` presets — no raw `fontSize: <number>`.
3. Font weights come from the `typography` presets and weight modifiers — no raw `fontWeight`.
4. No `fontFamily` literals outside `packages/ui`. Text renders through `Text` / `TextInput` from `@kc/ui` (ESLint blocks importing them from `react-native`); they pick the brand face from `fontWeight`, so **changing the brand font is a change to `theme/fonts.ts` + the loader map only**. If the faces fail to load, `BrandFontProvider` falls back to the system font with its real weights.
5. Corner radii come from `radius.*` — no raw `borderRadius: <number>` (`0` is allowed).
6. Margin, padding and gap come from `spacing.*` (`0` is allowed). Layout sizes (widths, heights, rail and content widths) are not spacing; shell sizes live in `shellDimensions`.
7. Use logical sides so layouts mirror between Hebrew (RTL) and English (LTR): `Start` / `End` properties and the `lib/rtlLayout.ts` helpers — never `textAlign: 'left' | 'right'`, `marginLeft`, `paddingRight`, `borderLeft*` or `borderTopLeftRadius`.
8. Icon sizes come from `iconSize.*` — no numeric `size={N}` on `Ionicons` (§4.2).
9. Stacking order comes from `zIndex.*` — no raw `zIndex: <number>` (`0` is allowed).
10. Shadows come from the `shadow.*` presets — no raw `shadowOpacity`, `shadowRadius`, `shadowOffset` or `elevation` numbers (`0`, which switches a shadow off, is allowed).
11. Form fields use the kit `TextField` (`apps/mobile/src/components/ui/TextField.tsx`) instead of a raw `<TextInput`; a non-form input (chat composer, search bar) carries the allow-marker with its reason. Dialogs: a raw React Native `<Modal` is frozen at its current count until the shared modal exists (GitHub #1284). The UI kit folder (`apps/mobile/src/components/ui/`) is where these wrappers live, so these two rules do not apply there.
12. A justified exception (e.g. a third-party brand mark that must keep its own colour, or a circle whose radius is half its size) carries an end-of-line comment `brand-guard-allow: <reason>` and is reviewed in the PR.

### 4.1 Components

Screens are composed from shared components, not restyled per screen. Use these before writing new styles:

| Need | Component | Where |
|---|---|---|
| Text / text input (primitives) | `Text`, `TextInput` | `@kc/ui` |
| Form field (label, helper, error, icon, multiline) | `TextField` | `apps/mobile/src/components/ui/TextField.tsx` |
| Toggle | `PlatformSwitch` | `@kc/ui` |
| Loading placeholder | `Skeleton` | `@kc/ui` |
| Desktop side column | `AsidePanel`, `useAside` | `@kc/ui` |
| Screen frame | `Screen` | `apps/mobile/src/components/ui/` |
| Buttons | `PrimaryButton`, `SecondaryButton`, `GhostButton` | `apps/mobile/src/components/ui/Buttons.tsx` |
| Card | `Card` | `apps/mobile/src/components/ui/` |
| Section title, field label, icon tile, image, date/time field | `SectionHeading`, `FormFieldLabel`, `IconTile`, `KCImage`, `DateTimeField` | `apps/mobile/src/components/ui/` |
| Avatar | `AvatarInitials` | `apps/mobile/src/components/` |

Not built yet (GitHub epic #1061 / #1021): a shared modal (#1284), bottom sheet, chip/tag, empty state and screen header. Until each exists, new code reuses the closest existing implementation instead of adding another one.

### 4.2 Icons

- One icon set: **Ionicons** from `@expo/vector-icons`. Do not add another icon library or inline SVG icons without a decision. ESLint `no-restricted-imports` blocks the other `@expo/vector-icons` families (named or deep imports) and other icon libraries (lucide, react-native-vector-icons, Feather, Phosphor, Heroicons, Tabler, Font Awesome) (D80).
- Sizes come from `iconSize` (xs 14 · sm 16 · md 18 · lg 20 · xl 22 · 2xl 24). A larger hero / empty-state glyph (28+) stays off the scale with an end-of-line `brand-guard-allow: <reason>` on its `size=` line.
- Directional icons (arrows, chevrons, "back") must mirror between RTL and LTR; non-directional icons never mirror.
- Icon colours come from tokens (`colors.primary` for brand glyphs, `textSecondary` for neutral ones).

### 4.3 Admin surfaces (D67)

Admin and team-only screens use the **same** colours, type, radius, components and rules as the rest of the app. They may be denser: one spacing step tighter, smaller type presets (`bodySmall`, `label`) and tables instead of cards. They never introduce their own colours (role badges included).

### 4.4 Appearance

Light, dark and system appearance (FR-SETTINGS-014). The native app passes the OS colour scheme through (`app.json` `userInterfaceStyle: "automatic"`, `expo-system-ui` on Android) so "system" can resolve to dark; signed-out surfaces stay light.

## 5. Accessibility floor

KC targets **WCAG 2.x AA** (Israeli standard IS 5568): normal text ≥ 4.5:1, large text and UI glyphs ≥ 3:1, in **both** palettes. The required pairs are encoded in `packages/ui/src/__tests__/brandContrast.test.ts`. Known failures are listed there with a TD reference and must be removed when fixed.

Since D66 every required pair passes in both palettes (e.g. white on `primary` 5.2:1, give/request tags 4.9:1, `error` on white 4.8:1); the exception list in the test is empty. The vivid orange (`primaryVivid`) may be used only where it carries no text or meaning (decoration). Avatar initials (`avatarPalette`) are checked in the same test.

## 6. Guardrails (automated)

All run inside `pnpm test` (pre-push gate and CI):

| Test | Location | Fails when |
|---|---|---|
| Token contract | `packages/ui/src/__tests__/theme.test.ts` | a core token is removed or changes shape |
| Palette parity | `packages/ui/src/__tests__/brandTokens.test.ts` | light and dark palettes drift in keys, or a value is not a valid colour |
| Token export drift | `packages/ui/src/__tests__/brandTokens.test.ts` | `kc.tokens.json` does not match the code |
| Brand identity | `packages/ui/src/__tests__/brandTokens.test.ts` + `apps/mobile/src/__tests__/brandGuard.test.ts` | the brand name / nickname, the locale `appName`s, or the store name in `app.json` drift |
| Contrast floor | `packages/ui/src/__tests__/brandContrast.test.ts` | a required pair drops below AA, or a listed exception starts passing (stale) |
| Brand font | `packages/ui/src/__tests__/brandFont.test.tsx` + ESLint `no-restricted-imports` | a weight stops mapping to its face, or app code imports `Text` / `TextInput` from `react-native` |
| Icon set | ESLint `no-restricted-imports` (`app/eslint.config.mjs`) | app code imports an icon family other than `Ionicons`, or another icon library (D80) |
| Hard-coded style ratchet | `apps/mobile/src/__tests__/brandGuard.test.ts` (rules in `brandGuardRules.ts`, pinned by `brandGuardRules.test.ts`) | a file gains a finding beyond its frozen baseline, or a new file has any. Rules: `colorLiteral`, `fontSizeLiteral`, `fontWeightLiteral`, `fontFamilyLiteral`, `radiusLiteral`, `spacingLiteral`, `physicalSide`; since D80 also `iconSizeLiteral` (numeric Ionicons `size`), `zIndexLiteral`, `shadowLiteral`, `rawTextInput` (use `TextField`) and `rawModal` (count frozen until #1284) |
| Touched-file rule | `apps/mobile/src/__tests__/brandGuard.test.ts` | a file changed since the PR base still has any finding (D67) |
| Config colours | `apps/mobile/src/__tests__/brandGuard.test.ts` | `app.json` / `+html.tsx` brand colours drift from `primaryVivid`, or the native colour scheme is forced to light |

**Touched-file rule (D67).** A PR that changes a file in `apps/mobile/{src,app}` must leave that file with **zero** findings — every rule, the whole file, not only the changed lines. Files nobody touches keep their frozen counts until someone works in them. The guard diffs against the merge-base with the PR base (`GITHUB_BASE_REF`, else `origin/dev`; override with `KC_BRAND_BASE_REF`), including uncommitted changes. In CI an unresolvable base fails the test (the frontend job checks out full history); a local clone without the ref skips the rule.

The ratchet baseline (`apps/mobile/brand-guard.baseline.json`) only goes down. After removing literals, refresh it with `KC_BRAND_BASELINE=update pnpm --filter @kc/mobile test -- brandGuard`; a PR that *raises* a count must explain why in its body.

## 7. Change process

1. Token or brand change → edit `theme/*.ts` (and this file if the meaning changes) → regenerate `kc.tokens.json` → tests green.
2. New/changed **brand-level** value (primary colour, font, logo, name) needs a PM decision `D#` logged in [90](./90_decisions_log.md).
3. After merge to `dev`, refresh Figma variables and the Claude Design project from `kc.tokens.json`.
4. Exploratory design (new screens, components) may start in Figma or Claude Design; implementation must consume existing tokens or add new ones through step 1.

## 8. Brand decisions log (D65, D66, D67, D80)

| Question | Decision |
|---|---|
| Name | Karma Community / קהילת קארמה, nickname KC (D65) |
| Brand orange vs. AA | Light `primary` = `#C2410C` (brightest orange on this hue that passes 4.5:1 with white and on tags); vivid `#F97316` for decoration only (D66) |
| Brand font | Rubik, app-wide via `@kc/ui` `Text` / `TextInput` (D66) |
| Secondary colour | Logo navy `#203050` (light) / `#A5B8DC` (dark) (D66) |
| Logo master | Current `assets/logo.png` (D66) |
| KC platform vs. KC organization; hidden meaning | KC = the platform; the KC organization is styled like any other org; "קיבוץ קפיטליסטי" never appears in product surfaces (D67) |
| Radius scale | xs 4 · sm 8 · md 12 · lg 16 · xl 24 · full (D67) |
| Enforcement | Ratchet covers colour, type, radius, spacing and physical sides; every file a PR touches must be fully clean (D67) |
| Admin surfaces | Same tokens and components, denser layout (D67) |
| Icon, layer and shadow tokens | `iconSize` xs 14 · sm 16 · md 18 · lg 20 · xl 22 · 2xl 24; `zIndex` base 0 · raised 1 · overlay 2 · floating 20 · toast 9999; `shadow.glow` added beside `card` / `modal` — each matches the values screens already used most (D80) |
| Components and icons in the guard | Ratchet adds icon size, z-index, shadow, raw `TextInput` and raw `Modal`; ESLint allows only Ionicons (D80) |

Open: logo teal `#95D1CF` is not a token yet — add it only when a surface needs it.
