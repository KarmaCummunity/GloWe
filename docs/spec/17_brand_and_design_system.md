# 17 — Brand and design system

> Decisions **D65, D66** (2026-10-30). This file is the brand book for agents and designers. The values themselves live in code; this file says what they mean, who owns them, and how a change travels.

## 1. Brand identity (D65)

| Item | Value |
|---|---|
| Full name (EN) | **Karma Community** |
| Full name (HE) | **קהילת קארמה** |
| Short name / nickname | **KC** — used in UI chrome, store listing prefix (`KC - קהילת קארמה`), and internal docs |
| Code constant | `brand` in `app/packages/ui/src/theme/brand.ts` |

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
| Radius / elevation | `theme/spacing.ts` | `radius.sm…full`; `shadow.card`, `shadow.modal`. |
| Breakpoints | `theme/breakpoints.ts` | Responsive shell (mobile → desktop web). |

Usage rules for app code (`app/apps/mobile/**`):
1. Colours come from `useTheme()` / `makeUseStyles()` only — no hex or `rgb()` literals.
2. Font sizes come from `typography.*` presets — no raw `fontSize: <number>`.
3. No `fontFamily` literals outside `packages/ui`. Text renders through `Text` / `TextInput` from `@kc/ui` (ESLint blocks importing them from `react-native`); they pick the brand face from `fontWeight`, so **changing the brand font is a change to `theme/fonts.ts` + the loader map only**.
4. A justified exception (e.g. a third-party brand mark that must keep its own colour) carries an end-of-line comment `brand-guard-allow: <reason>` and is reviewed in the PR.

## 5. Accessibility floor

KC targets **WCAG 2.x AA** (Israeli standard IS 5568): normal text ≥ 4.5:1, large text and UI glyphs ≥ 3:1, in **both** palettes. The required pairs are encoded in `packages/ui/src/__tests__/brandContrast.test.ts`. Known failures are listed there with a TD reference and must be removed when fixed.

Since D66 every required pair passes in both palettes (e.g. white on `primary` 5.2:1, give/request tags 4.9:1, `error` on white 4.8:1); the exception list in the test is empty. The vivid orange may be used only where it carries no text or meaning (decoration).

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
| Hard-coded style ratchet | `apps/mobile/src/__tests__/brandGuard.test.ts` | a file gains a colour / `fontSize` / `fontFamily` literal beyond its frozen baseline, or a new file has any |

The ratchet baseline (`apps/mobile/brand-guard.baseline.json`) only goes down. After removing literals, refresh it with `KC_BRAND_BASELINE=update pnpm --filter @kc/mobile test -- brandGuard`; a PR that *raises* a count must explain why in its body.

## 7. Change process

1. Token or brand change → edit `theme/*.ts` (and this file if the meaning changes) → regenerate `kc.tokens.json` → tests green.
2. New/changed **brand-level** value (primary colour, font, logo, name) needs a PM decision `D#` logged in [90](./90_decisions_log.md).
3. After merge to `dev`, refresh Figma variables and the Claude Design project from `kc.tokens.json`.
4. Exploratory design (new screens, components) may start in Figma or Claude Design; implementation must consume existing tokens or add new ones through step 1.

## 8. Brand decisions log (D65, D66)

| Question | Decision |
|---|---|
| Name | Karma Community / קהילת קארמה, nickname KC (D65) |
| Brand orange vs. AA | Light `primary` = `#C2410C` (brightest orange on this hue that passes 4.5:1 with white and on tags); vivid `#F97316` for decoration only (D66) |
| Brand font | Rubik, app-wide via `@kc/ui` `Text` / `TextInput` (D66) |
| Secondary colour | Logo navy `#203050` (light) / `#A5B8DC` (dark) (D66) |
| Logo master | Current `assets/logo.png` (D66) |

Open: logo teal `#95D1CF` is not a token yet — add it only when a surface needs it.
