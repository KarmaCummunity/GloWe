# KC mobile (Expo / React Native)

Native KC app (`@kc/mobile`) — resumed for App Store / Google Play (issues #836, #837).
Uses the shared Supabase backend in `supabase/` (same as GLOWE web).

## Prerequisites

- Node.js per repo [`.nvmrc`](../../../.nvmrc)
- [pnpm](https://pnpm.io/) from `app/package.json`
- Local Supabase: `./scripts/dev-up.sh` from repo root (see [CONTRIBUTING.md](../../../CONTRIBUTING.md))
- For device builds: [EAS CLI](https://docs.expo.dev/build/setup/) and an Expo account

## Install & run (local)

```bash
cd app
pnpm install
cp .env.example .env.local   # fill EXPO_PUBLIC_SUPABASE_* from dev-up output
pnpm --filter @kc/mobile start:go    # Expo Go (limited — dev client recommended)
pnpm --filter @kc/mobile start       # dev client
pnpm --filter @kc/mobile ios         # local iOS simulator (macOS + Xcode)
pnpm --filter @kc/mobile android     # local Android emulator
```

Typecheck (also runs in CI):

```bash
pnpm --filter @kc/mobile typecheck
```

## Native identifiers (proposal)

| Platform | Id |
| -------- | --- |
| iOS `bundleIdentifier` | `org.karmacommunity.app` |
| Android `package` | `org.karmacommunity.app` |
| Expo slug | `karma-community` |
| URL scheme | `karmacommunity` |

Marketing version comes from [`app/VERSION`](../../VERSION) via `app.config.ts`.
EAS **production** profile sets `autoIncrement: true` for native build numbers.

## EAS profiles (`eas.json`)

| Profile | Use |
| ------- | --- |
| `development` | Dev client, internal, iOS simulator builds |
| `preview` | Internal QA builds (OTA channel `preview`) |
| `production` | Store-bound builds (OTA channel `production`, auto-increment) |

Set Supabase and Sentry values as [EAS secrets](https://docs.expo.dev/build-reference/variables/) or GitHub Actions secrets (see below). Never commit keys.

## One-time manual setup (maintainers)

1. **Expo / EAS**
   - Create or link an Expo project: from this directory run `eas init` (writes `extra.eas.projectId` into config).
   - Create an access token → GitHub secret `EXPO_TOKEN`.
   - Configure EAS secrets for hosted dev Supabase, e.g. `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

2. **Apple (TestFlight)**
   - App Store Connect app for `org.karmacommunity.app`.
   - App Store Connect API key → secrets `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_API_KEY_P8` (contents of the `.p8` file).
   - Optional: `EXPO_APPLE_TEAM_ID`, `KC_ASC_APP_ID` (numeric App Store Connect app id for `eas.json` submit).
   - Run workflow **KC mobile — TestFlight iOS** (upload only, no App Review).

3. **Google Play (internal track)**
   - Play Console app with package `org.karmacommunity.app`.
   - Service account JSON → secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (file path wired in `eas.json` at build time).
   - Run workflow **KC mobile — Play internal Android**.

4. **Store listings** — screenshots, privacy policy URLs, and review metadata are out of scope for CI; prepare in App Store Connect / Play Console before public release.

## GitHub Actions workflows

| Workflow | Purpose |
| -------- | ------- |
| [`kc-mobile-eas-preview.yml`](../../../.github/workflows/kc-mobile-eas-preview.yml) | Manual preview builds |
| [`kc-mobile-testflight-ios.yml`](../../../.github/workflows/kc-mobile-testflight-ios.yml) | Production/preview iOS + TestFlight submit |
| [`kc-mobile-play-internal.yml`](../../../.github/workflows/kc-mobile-play-internal.yml) | Production/preview Android + Play internal submit |

Workflows skip gracefully when required secrets are missing.

## OTA updates

`runtimeVersion` policy is `appVersion` (see `app.json`). After `eas init`, configure EAS Update channels matching `eas.json` (`development`, `preview`, `production`).
