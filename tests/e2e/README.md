# E2E (Playwright)

KC P0 user journeys against a deployed web URL (`DEV_WEB_URL`).

## CI

Workflow: `.github/workflows/ci-e2e-dev.yml` — project `journeys` (requires auth setup + E2E secrets).

## Local

```bash
cd tests/e2e
npm install
export DEV_WEB_URL=https://your-dev-deploy.example
export E2E_TEST_EMAIL=…
export E2E_TEST_PASSWORD=…
export E2E_SUPABASE_ANON_KEY=…
npm test
```
