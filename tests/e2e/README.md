# Web E2E (Playwright)

P0 user journeys against the **live dev deployment** (`DEV_WEB_URL`). See `docs/SSOT/TESTING.md`.

## GloWe URLs

| Environment | Branch | URL | CI variable |
| --- | --- | --- | --- |
| **Production** | `dev` | `https://dev.karma-community.pages.dev/glowe/` | `GLOWE_PROD_URL` |
| **Staging** | `staging` | `https://staging.karma-community.pages.dev/glowe/` | `GLOWE_STAGING_URL` |

Workflow: `CI — GloWe E2E (dev + staging)` (`.github/workflows/ci-e2e-glowe.yml`).

## Auth (session injection)

Tests do **not** use the `/sign-in` screen. Setup calls Supabase Auth API, writes `sb-<project-ref>-auth-token` to `localStorage`, then runs feed / create / chat journeys.

Create the user in Supabase dev Dashboard (**Add user** + **Auto Confirm**), even if the login form fails for you personally.

## Local run

```bash
export DEV_WEB_URL=https://mvp-2-dev.up.railway.app
export E2E_TEST_EMAIL=your-dev-test-user@example.com
export E2E_TEST_PASSWORD=…
export E2E_SUPABASE_ANON_KEY=your-dev-publishable-anon-key
node scripts/ensure-e2e-user.mjs   # optional preflight
cd tests/e2e
npm install
npm run install:browsers
npm test
```

GloWe suite (`glowe-*.spec.ts`, including launch Wave 4): set `DEV_WEB_URL` (or `GLOWE_WEB_URL`) and run `npx playwright test --project=glowe`. Seed personas via `scripts/seed-glowe-dev.mjs` for member/org/owner specs; guest Google-gate and `glowe_can_create` API checks run without OAuth secrets.

## CI

Workflow: `.github/workflows/ci-e2e-dev.yml` — runs on PRs to `main` (from `dev`).

Required GitHub configuration is documented in `docs/SSOT/ENVIRONMENTS.md` § E2E automation.
