# Environments

> **Canonical source for branch ↔ Supabase ↔ Cloudflare Pages ↔ env-var mapping.**
> If another doc disagrees, this one wins. Last reviewed: 2026-06-09.

## TL;DR

| Concern | `main` (KC production) | `dev` (GloWe production) | `staging` (GloWe integration) |
|---|---|---|---|
| Git branch | `main` | `dev` | `staging` |
| Supabase project | `slxijdfvinbjmrsfgbzx` | `roeefqpdbftlndzsvhfj` | `roeefqpdbftlndzsvhfj` |
| Hosting | Cloudflare Pages — `karma-community-kc.com` | Cloudflare Pages — `dev.karma-community.pages.dev` | Cloudflare Pages — `staging.karma-community.pages.dev` |
| **Live product URL** | **KC:** `https://karma-community-kc.com/` | **GloWe:** `https://dev.karma-community.pages.dev/glowe/` | **GloWe staging:** `https://staging.karma-community.pages.dev/glowe/` |
| GitHub Actions env | `cloudflare-prod` | `cloudflare-dev` | `cloudflare-dev` |
| `EXPO_PUBLIC_ENVIRONMENT` | `production` | `development` | `development` |
| In-app dev banner | hidden | visible | visible |

> **Dual production (2026-07-22, D-182):** KC and GloWe ship **separate live URLs** from **separate branches**. The hostname `dev.karma-community.pages.dev` is Cloudflare's branch alias for the `dev` deploy — it is **GloWe's production front door**, not a throwaway preview. Do not point GloWe synthetics at `karma-community-kc.com/glowe` unless that URL is promoted to canonical (it currently lags `dev`).
>
> **GloWe staging (2026-07-27, D-189):** Ongoing feature work lands on `staging` first (`staging` → `dev` for release). Playwright E2E + visual regression run against `GLOWE_STAGING_URL` on PRs to `staging`, and against `GLOWE_PROD_URL` on PRs/pushes to `dev`.

## Branching rules

1. **`staging` is the integration branch for GloWe.** Feature/fix/refactor PRs target `staging` first. When stable, open a release PR `staging` → `dev`.
2. **`dev` is GloWe's production branch.** Merges to `dev` deploy to `https://dev.karma-community.pages.dev/glowe/` (GloWe's live front door). Playwright prod-health + release gates run here.
3. **`dev` is never behind `main`.** Every push to `main` triggers `.github/workflows/sync-main-to-dev.yml`, which merges `main` into `dev`. If that workflow fails (merge conflict), resolving it is the operator's first priority.
4. **`main` is fast-forward only from `dev`.** KC production releases happen by opening a PR from `dev` → `main` and squash-merging.
5. **Direct pushes to `main` are reserved for trivial doc/CI hotfixes** (see `CLAUDE.md` §6 "Change classes"). Whenever they happen, the sync workflow brings them into `dev` automatically.
6. **Never force-push to `main`, `dev`, or `staging`.** Never delete any of them. Branch-protection rules in GitHub enforce all three.

## Required environment variables

All variables prefixed `EXPO_PUBLIC_*` are exposed to the client bundle by Expo's bundler. Variables without that prefix are server-only.

| Variable | `main` value | `dev` value | Where it's read |
|---|---|---|---|
| `EXPO_PUBLIC_ENVIRONMENT` | `production` | `development` | `apps/mobile/src/config/environment.ts` — drives the in-app dev banner |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://slxijdfvinbjmrsfgbzx.supabase.co` | `https://roeefqpdbftlndzsvhfj.supabase.co` | `packages/infrastructure-supabase/src/client.ts` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | (publishable key for prod project) | (publishable key for dev project) | `packages/infrastructure-supabase/src/client.ts` |

**Edge Function secret (Survey B CORS, not in the client bundle):** set `PUBLIC_RESEARCH_ALLOWED_ORIGINS` on each Supabase project (or as a GitHub Environment **variable** on `supabase-prod` / `supabase-dev` — synced by **Supabase Functions deploy**). Values: prod → `https://karma-community-kc.com`; dev → `https://mvp-2-dev.up.railway.app,https://dev3.karma-community-kc.com,http://localhost:8081,http://localhost:19006`. See [`OPERATOR_RUNBOOK.md`](./OPERATOR_RUNBOOK.md) § Edge Functions.

> **Pitfall:** Expo only exposes vars that start with `EXPO_PUBLIC_`. A var named `PUBLIC_ENVIRONMENT` (no `EXPO_` prefix) is invisible to the client bundle.
>
> **Docker / Railway web build:** The repo root `Dockerfile` builder stage must declare an `ARG` + `ENV` for each `EXPO_PUBLIC_*` value that must appear in the static web bundle. Service variables in the Railway UI are **not** visible inside `RUN pnpm build:web` unless they are wired through that stage (we ship `EXPO_PUBLIC_SUPABASE_*` and `EXPO_PUBLIC_ENVIRONMENT`). If the dev banner is missing on the hosted URL but variables look correct in Railway, redeploy after a Dockerfile fix or add the missing `ARG`/`ENV` pair.
>
> **Local Metro:** `pnpm ios` / `expo start` runs a `__DEV__` bundle, which shows the dev strip even without `EXPO_PUBLIC_ENVIRONMENT`. That variable is still required for **non-`__DEV__`** builds (e.g. `expo export` on CI) so testers see the strip without a debug client.

## Runbook: `dev` branch was deleted

If `git ls-remote --heads origin | grep dev` returns nothing (e.g. an agent accidentally deleted it), restore it from `main`:

```bash
git fetch origin main
git push origin refs/remotes/origin/main:refs/heads/dev
```

Then in Railway → service Settings → reconnect the dev environment to the `dev` branch. Then verify branch protection is back in place (Settings → Branches → `dev` → require PRs + disable force-push + disable deletion).

## Runbook: dev banner not showing on the dev deployment

Checklist in order:

0. If you are on **local Metro** (`expo start`) and still see no strip, you are likely running a **release** build (`__DEV__` off). Use a debug build or set `EXPO_PUBLIC_ENVIRONMENT=development` and rebuild.
1. **Railway + Docker:** In Railway Variables, confirm `EXPO_PUBLIC_ENVIRONMENT=development` (exact name). Confirm the repo `Dockerfile` builder passes that name into the build stage (`ARG`/`ENV`); without it, `expo export` never sees the variable even if Railway shows it.
2. Trigger a redeploy — env-var and Dockerfile changes require a **new image build**.
3. Open the dev URL in an incognito window (cached service worker can serve stale bundles).
4. In DevTools console: `process.env` is not present at runtime in Expo; instead inspect the bundle by searching for `'development'` in the JS bundle source, OR temporarily add `console.log('env', getAppEnvironment())` to verify the value reached the client.

## Sync workflow internals

`.github/workflows/sync-main-to-dev.yml`:

- Triggers: every push to `main`, plus manual `workflow_dispatch`.
- Concurrency: `sync-main-to-dev` group with `cancel-in-progress: false` — back-to-back pushes queue rather than skip.
- Strategy: `git merge --no-edit origin/main` on `dev`. Fast-forward when possible; merge commit otherwise.
- Failure mode: merge conflict → workflow fails, operator resolves manually. Do not auto-resolve.

## DB deploy automation

`.github/workflows/db-deploy.yml` trigger modes:

- **Auto** — on push to `dev` or `main` when any of these paths change: `supabase/migrations/**`, `supabase/seed.sql`, `supabase/config.toml`, or the workflow file. Pending migrations are applied via `supabase db push` to the matching GitHub Environment: `dev` → `supabase-dev` (`roeefqpdbftlndzsvhfj`); `main` → `supabase-prod` (`slxijdfvinbjmrsfgbzx`). PRs must keep **CI — backend** (`apply migrations · rls · types · sql probes`) green before merge — it applies all migrations on a fresh local stack.
- **Manual** — `workflow_dispatch` lets an operator target `supabase-prod` or `supabase-dev`. Defaults to dry-run; flip `apply` to true to push (useful for inspection, retries, or one-off applies).

Concurrency group `db-deploy-<environment>` (with `cancel-in-progress: false`) ensures back-to-back migration pushes queue rather than race.

**DB apply gate (`D-53`, extended `D-54`):** every auto-push and every manual `workflow_dispatch` apply (both `supabase-dev` and `supabase-prod`) runs `supabase db push --dry-run` immediately before the real `db push`. No human reviewers on deploy environments — protection is automated CI only.

**Migration safety guards:**

- **Dev:** `.github/workflows/ci-dev-guard.yml` on PRs/pushes to `dev` runs `scripts/check-migration-safety.mjs` (blocks `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, unqualified `DELETE FROM` unless the line includes `migration-safety: allow`).
- **Main release:** `.github/workflows/ci-main-guard.yml` on PRs to `main` enforces head branch `dev` **and** runs the same migration safety scan.

## Dev merge gates (branch protection)

All feature PRs target `dev`. Configure GitHub → Settings → Branches → `dev`:

- Require a pull request before merging (0 approvals).
- Block force-push and branch deletion.
- Require status checks (path-filtered workflows may skip when unrelated paths change — that is OK):

> The table below is machine-validated: `scripts/check-required-checks-drift.mjs` (workflow **CI — required-checks drift**) fails CI if any row references a workflow/job name that no longer exists. If you rename a job, update this table **and** the GitHub branch-protection required-checks list in the same change.

| Check | Workflow | Job |
| --- | --- | --- |
| Quality | CI — frontend | `typecheck · test · lint` |
| i18n guard | CI — frontend | `Hebrew source scan (no inline UI copy)` |
| Web bundle | CI — frontend | `web export (production bundle)` |
| Migration chain | CI — backend | `migration chain lint` |
| DB + RLS + types | CI — backend | `apply migrations · rls · types · sql probes` |
| Contract | CI — contract | `rpc · table contract` |
| Architecture | CI — contract | `coalesce mirror · layer invariants` |
| Manifest | CI — contract | `web manifest parity` |
| PR hygiene | CI — PR hygiene | `PR hygiene` |
| Migration safety | CI — dev guard | `migration destructive-op scan` |
| SonarCloud | CI — SonarCloud | `SonarCloud quality gate` |

Do **not** require **CI — main release guard** on `dev` (prod-only release-source job). Prod-only post-merge jobs (`prod-smoke`, Edge Functions deploy to `supabase-prod`) stay on `main` only.

## Production release

Operator checklist: [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md).

**CI layout (2026-05-22):** PR/push checks are split by responsibility with path filters so unrelated work doesn't burn time:

- `.github/workflows/ci-frontend.yml` — `app/**`, `Dockerfile`, Hebrew scan. Jobs: `typecheck · test · lint`, `Hebrew source scan (no inline UI copy)`, `web export (production bundle)`.
- `.github/workflows/ci-dev-guard.yml` — every non-draft PR to `dev`; migration destructive-op scan (`D-54`).
- `.github/workflows/ci-backend.yml` — `supabase/**` + the migration chain script. Jobs: `migration chain lint`, then `apply migrations · rls · types · sql probes` against a fresh local Supabase stack (replaces the old `db-validate.yml`).
- `.github/workflows/ci-contract.yml` — infra/application/domain packages + migrations + locale + manifest script. Jobs: `rpc · table contract`, `coalesce mirror · layer invariants` (file-size + layer + domain-typed-error guard), `web manifest parity`.
- `.github/workflows/ci-pr.yml` — `pull_request` only, non-draft. Job: `PR hygiene` (Conventional Commits title + required `Mapped to spec` line).
- `.github/workflows/ci-actionlint.yml` — `.github/workflows/**` only; runs `actionlint` (pinned) + shellcheck over every workflow's `run:` blocks. Meta-guard: agents edit CI unsupervised, so workflow files need their own linter. **Not** a required check (path-filtered — would hang "Expected" on non-workflow PRs).

Tooling pins: Node version comes from the repo-root `.nvmrc` (all `setup-node` steps use `node-version-file`); pnpm version comes from the `packageManager` field in `app/package.json` (all `pnpm/action-setup` steps use `package_json_file`). Bump either in one place only. **One deliberate exception:** the `ci-backend.yml` db-validate job pins Node 22 — `@supabase/realtime-js` needs the native WebSocket global (Node ≥ 22) for the sqlProbes integration tests; do not align it back to `.nvmrc`.

Draft PRs skip every job except none (PR hygiene waits for `ready_for_review`). Branch protection on `dev` uses the table above; `main` release PRs use [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md#merge-gates-automated--must-be-green).

**CI gates on `main` PRs:** `CI — frontend / web export (production bundle)` mirrors the Dockerfile builder (`EXPO_PUBLIC_*` + `pnpm build:web`).

**Post-merge KC smoke:** `.github/workflows/prod-smoke.yml` polls **`KC_PROD_URL`** (legacy alias: `PROD_WEB_URL`) after `main` deploy.

**GloWe live-site synthetics:** `.github/workflows/glowe-prod-smoke.yml` runs read-only Playwright probes against **`GLOWE_PROD_URL`** after `dev` deploy, on a 15-minute cron, and via `workflow_dispatch`. Results ingest into `glowe_health_checks` on the **dev** Supabase project (GloWe's backend today).

### GloWe production monitoring (`INFRA-QA-W7`)

| GitHub | Name | Value / purpose |
| --- | --- | --- |
| Variable | `GLOWE_PROD_URL` | GloWe live URL — `https://dev.karma-community.pages.dev/glowe` |
| Variable | `GLOWE_STAGING_URL` | GloWe integration URL — `https://staging.karma-community.pages.dev/glowe` |
| Variable | `KC_PROD_URL` | KC live root — `https://karma-community-kc.com` (for `prod-smoke.yml`) |
| Environment | `supabase-dev` | Ingest uses Management API service-role key (same as seed workflow) |

Admin visibility: GloWe `admin.html` → **System health** panel. Ingest script: `scripts/record-prod-health.mjs`.

### Legacy alias

| GitHub | Name | Notes |
| --- | --- | --- |
| Variable | `PROD_WEB_URL` | Deprecated for GloWe; `prod-smoke.yml` still accepts it as fallback for `KC_PROD_URL` |

## E2E automation (Web, `D-55`)

Playwright P0 journeys run against the live dev deployment before every `dev` → `main` release PR. Policy: [`TESTING.md`](./TESTING.md).

| GitHub | Name | Value / purpose |
| --- | --- | --- |
| Variable | `DEV_WEB_URL` | `https://dev.karma-community.pages.dev` |
| Secret | `E2E_TEST_EMAIL` | Dev-only test user (active, verified) |
| Secret | `E2E_TEST_PASSWORD` | Matching password |
| Secret | `E2E_SUPABASE_ANON_KEY_DEV` | Dev project publishable anon key (for `scripts/ensure-e2e-user.mjs` preflight). Dev-scoped name keeps it distinct from prod. Wired to the `E2E_SUPABASE_ANON_KEY` env var the test code reads. |

Workflow: `.github/workflows/ci-e2e-dev.yml` — required status check on `main`: **CI — E2E dev / user journeys (P0)**.

Create user (once, if needed): `E2E_TEST_EMAIL=… E2E_TEST_PASSWORD=… node scripts/create-e2e-user.mjs` (requires dev `SUPABASE_SERVICE_ROLE_KEY`).

Local run (after deploy on dev):

```bash
export DEV_WEB_URL=https://mvp-2-dev.up.railway.app
export E2E_TEST_EMAIL=…
export E2E_TEST_PASSWORD=…
export E2E_SUPABASE_ANON_KEY=…
node scripts/ensure-e2e-user.mjs
cd tests/e2e && npm install && npm run install:browsers && npm test
```
