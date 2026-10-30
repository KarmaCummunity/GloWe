# Deploy runbooks (find in &lt;1 minute)

## After merge to `dev` (automatic)

| What | Workflow | Target |
|---|---|---|
| DB migrations | `DB deploy` (`.github/workflows/db-deploy.yml`) | Supabase **kc-dev** (`supabase-dev` env) |
| Web SPA | `Deploy Web` | Cloudflare Pages → `https://dev.karma-community.pages.dev/` |

Verify: open Pages URL; for SQL, check the Actions log for `Applying migration …` / `Finished supabase db push`.

## Local DB

```bash
./scripts/dev-up.sh          # Docker Supabase + apply migrations
cd app && pnpm install
cp app/.env.example app/.env.local   # use `supabase status` keys only
```

## Mobile release (manual)

See [RELEASE.md](./RELEASE.md): version bump → EAS preview → TestFlight / Play internal. Public store = Nave only.

## Seeding (kc-dev only)

| Need | How |
|---|---|
| Add a few reference/demo rows to kc-dev **without** wiping data | Idempotent migration (fixed ids + `on conflict … do update/nothing`). If the rows must never reach prod, guard the insert so it is a no-op without the kc-dev fake seed (example: `0400_kc_dev_demo_nonprofits.sql`). Also add the rows to `supabase/seed/kc-dev/seed.sql` so a reseed keeps them. |
| Full fake dataset (users, posts, chats …) | Actions → **Seed KC dev** (`seed-kc-dev.yml`, action `seed`). **Destructive:** wipes and recreates every `@seed.kc.test` row. Ask before running. Details: [`supabase/seed/kc-dev/README.md`](../../supabase/seed/kc-dev/README.md). |
| Remove the fake dataset | Same workflow, action `wipe`. |

Never seed prod. Seed credentials live only in the seed files; never paste them into code, issues, PRs or chat.

## DB types drift

`apply migrations · rls · types · sql probes` regenerates `app/packages/infrastructure-supabase/src/database.types.ts` on a fresh stack. If it fails with a diff, apply that exact diff to the file (or run `supabase gen types` locally with Docker) and push again.

## Verify on dev (E2E)

Playwright QA suite against `https://dev.karma-community.pages.dev` + kc-dev: [`tests/e2e/README.md`](../../tests/e2e/README.md). Run on demand with Actions → **E2E nightly (dev)**, or locally `cd tests/e2e && npm ci && npx playwright test`.

## All workflows

| Workflow | Trigger | Notes |
|---|---|---|
| `ci-*.yml` | PRs | Required checks; list in `ci-required-checks.yml` |
| `db-deploy.yml` (DB deploy) | push to `dev` (migration paths) / manual | kc-dev on `dev`; prod only from `main` (Nave) |
| `deploy-web.yml` | push to `dev` (`app/**`) / manual | Cloudflare Pages dev site |
| `supabase-functions-deploy.yml` | push to `dev` / manual | Edge Functions (WhatsApp, workers) to kc-dev; prod only from `main` |
| `seed-kc-dev.yml` | manual | Destructive dev reseed / wipe |
| `e2e-nightly-dev.yml` | nightly + manual | QA suite against dev |
| `ci-e2e-dev.yml` | dev → main PRs | Release gate |
| `k6-load-dev.yml` | manual | Load test against dev |
| `mobile-nightly.yml` → `testflight-ios.yml`, `play-internal.yml` | nightly + manual (dev) | Store builds of the newest green dev commit, see [RELEASE.md](./RELEASE.md) |
| `kc-mobile-eas-preview.yml` | manual | EAS preview build, no store submit |
| `prod-smoke.yml`, `sync-main-to-dev.yml`, `ci-main-guard.yml` | main / release | Prod side. Do not trigger without Nave |
| `auto-merge-agent-ready.yml`, `labeler.yml`, `bump-app-version.yml`, `stale-stack-report.yml` | PR / schedule | Housekeeping |

## Web Dockerfile / Railway (legacy note)

Historical Railway notes: [docs/DEPLOY_WEB.md](../DEPLOY_WEB.md). Current **dev** web path is Cloudflare Pages on push to `dev`.
