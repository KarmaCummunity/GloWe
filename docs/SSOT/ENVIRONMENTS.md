# Environments

> **Canonical source for branch ↔ Supabase ↔ Cloudflare Pages ↔ env-var mapping.**
> If another doc disagrees, this one wins. Last reviewed: 2026-10-30 (gated deploy pipeline, `INFRA-CI-3`).

## TL;DR

| Concern | `main` (KC production) | `dev` (KC integration) | `staging` (KC pre-prod) |
|---|---|---|---|
| Git branch | `main` | `dev` | `staging` |
| Supabase project | `kdqtbdbzwvlugkhonexg` | `enbqriuxvvuontiwslun` | `enbqriuxvvuontiwslun` |
| Hosting | Cloudflare Pages — `karma-community-kc.com` | Cloudflare Pages — `dev.karma-community.pages.dev` | Cloudflare Pages — `staging.karma-community.pages.dev` |
| **Live product URL** | `https://karma-community-kc.com/` | `https://dev.karma-community.pages.dev/` | `https://staging.karma-community.pages.dev/` |
| GitHub Actions env | `cloudflare-prod` | `cloudflare-dev` | `cloudflare-dev` |
| `EXPO_PUBLIC_ENVIRONMENT` | `production` | `development` | `development` |
| In-app dev banner | hidden | visible | visible |

> **GloWe sunset (2026-10-16, D-190):** The GloWe static frontend and `glowe_*` schema were removed. All branches deploy the KC web export at the site root. Legacy `/glowe/*` URLs redirect to `/` via `web-postbuild.mjs`.

## Branching rules

1. **`staging` is optional pre-integration.** Feature PRs may target `staging` first, then `staging` → `dev`. It has no automatic deploy since `INFRA-CI-3` (only `dev` and `main` deploy); `staging.karma-community.pages.dev` keeps its last build.
2. **`dev` is the integration branch.** After a merge passes CI, **Deploy** ships it to kc-dev and `https://dev.karma-community.pages.dev/`.
3. **`dev` is never behind `main`.** Every push to `main` triggers `.github/workflows/sync-main-to-dev.yml`, which merges `main` into `dev`. If that workflow fails (merge conflict), resolving it is the operator's first priority.
4. **`main` is fast-forward only from `dev`.** KC production releases happen by opening a PR from `dev` → `main` and squash-merging.
5. **Direct pushes to `main` are reserved for trivial doc/CI hotfixes** (see `CLAUDE.md` §6 "Change classes"). Whenever they happen, the sync workflow brings them into `dev` automatically.
6. **Never force-push to `main`, `dev`, or `staging`.** Never delete any of them. Branch-protection rules in GitHub enforce all three.

## Required environment variables

All variables prefixed `EXPO_PUBLIC_*` are exposed to the client bundle by Expo's bundler. Variables without that prefix are server-only.

| Variable | `main` value | `dev` value | Where it's read |
|---|---|---|---|
| `EXPO_PUBLIC_ENVIRONMENT` | `production` | `development` | `apps/mobile/src/config/environment.ts` — drives the in-app dev banner |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://kdqtbdbzwvlugkhonexg.supabase.co` | `https://enbqriuxvvuontiwslun.supabase.co` | `packages/infrastructure-supabase/src/client.ts` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | (publishable key for prod project) | (publishable key for dev project) | `packages/infrastructure-supabase/src/client.ts` |

**Edge Function secret (Survey B CORS, not in the client bundle):** set `PUBLIC_RESEARCH_ALLOWED_ORIGINS` on each Supabase project (or as a GitHub Environment **variable** on `supabase-prod` / `supabase-dev` — synced by the Edge Functions stage of **Deploy**). Values: prod → `https://karma-community-kc.com`; dev → `https://mvp-2-dev.up.railway.app,https://dev3.karma-community-kc.com,http://localhost:8081,http://localhost:19006`. See [`OPERATOR_RUNBOOK.md`](./OPERATOR_RUNBOOK.md) § Edge Functions.

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

## Deploy pipeline (`D-195`, `INFRA-CI-3`)

Nothing deploys on push. `.github/workflows/deploy.yml` (**Deploy**) is the only workflow that deploys, and it deploys one exact commit:

- **Trigger:** `workflow_run` of **CI** — a successful **push** run on `dev` or `main` deploys that run's `head_sha` — plus `workflow_dispatch` from `dev` or `main` (re-deploy the tip; the run itself checks via the GitHub API that a push-event CI run gave that SHA a green `CI gate`). A commit that is no longer the branch tip is skipped (its successor deploys after its own CI run), so a slow CI run can never roll an environment back. `workflow_run` executes `deploy.yml` as it is on `main`; changes to the pipeline take effect after a release.
- **Targets:** `dev` → environments `supabase-dev` + `cloudflare-dev` (kc-dev `enbqriuxvvuontiwslun`, Pages branch `dev`), automatic. `main` → **`production`** (approval only) then `supabase-prod` + `cloudflare-prod` (`kdqtbdbzwvlugkhonexg`, Pages production branch `main`).
- **Order:** resolve → preflight (`scripts/deploy-preflight.mjs`: secrets present, project refs pinned per target, project `ACTIVE_HEALTHY`; on prod also the backup key and the Pages production branch) → **approve** (prod) → database (`deploy-db.yml`: prod backup, dry-run, apply) → Edge Functions (`deploy-functions.yml`) → web baseline (prod) → web (`deploy-web.yml`) → smoke (`deploy-smoke.yml`) → tag (prod, `deploy-tag.yml`). On prod a failed functions/web/smoke stage runs `deploy-rollback.yml`.
- **Concurrency:** one deploy per environment (`deploy-dev`, `deploy-main`); a running deploy is never cancelled.
- **Environment layout:** `production` carries only the owner as required reviewer and no secrets; exactly one job (`approve release`) uses it, so a release is one click, and that job fails if the run has no recorded approval (reviewer missing). The secret-holding environments have **no** reviewers. Restrict `production`, `supabase-prod` and `cloudflare-prod` to the `main` branch; `supabase-dev` / `cloudflare-dev` to `dev` and `main` (`workflow_run` jobs run on `main`).
- **Guard:** `scripts/check-deploy-isolation.mjs` (static lane of CI) fails if any other workflow references a prod environment or runs `supabase db push`, `supabase functions deploy` or `pages deploy`, or if a stage workflow gains its own trigger.

| Stage | Workflow | Detail |
| --- | --- | --- |
| Database | `deploy-db.yml` (**DB deploy**) | Prod: encrypted `supabase db dump` (schema + data, `age` to `BACKUP_AGE_RECIPIENT`, 14-day artifact) when `supabase/migrations` changed since the last `v*` tag; then `db push --dry-run` and `db push` **without** `--include-all`, so a remote-ahead ledger or an out-of-order migration fails. Dev keeps `--include-all`. Manual dispatch: `dev` ref only, target fixed to dev, dry-run unless `apply`. |
| Edge Functions | `deploy-functions.yml` | Syncs `PUBLIC_RESEARCH_ALLOWED_ORIGINS` (through `env:`), then deploys every function `scripts/edge-functions.mjs` lists — all of `supabase/functions` except `_shared` and local-only `mock-login` — on both dev and prod. |
| Web | `deploy-web.yml` | Builds the export with `EXPO_PUBLIC_GIT_COMMIT_SHA` = the deployed SHA (stamped into `/version.json`) and uploads it with `wrangler pages deploy --branch=<dev|main> --commit-hash=<sha>`. |
| Smoke | `deploy-smoke.yml` | `scripts/smoke-deploy.mjs`: `/version.json` serves the SHA (backoff up to 10 min), `/` + every referenced JS bundle return 200, `/auth/v1/health` with the anon key, every deployed function answers `OPTIONS` without 5xx/404. Manual dispatch (read-only) against dev or prod from `dev`/`main`. |
| Tag | `deploy-tag.yml` | Annotated `v<app/VERSION>` on the deployed commit + GitHub Release (generated notes). The same version on another commit fails (checked again up front in **resolve**). |
| Rollback | `deploy-rollback.yml` | Cloudflare Pages production → the deployment recorded by **web baseline**; Edge Functions → previous release tag; smoke re-run; report. DB is forward-fix only. |

The Supabase CLI version is pinned once, in `.github/actions/setup-supabase-cli`.

**Migration safety guards:**

- **Every PR and push:** the static lane of **CI** runs `scripts/check-migration-safety.mjs` over all migrations (blocks `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, unqualified `DELETE FROM` unless the line carries `migration-safety: allow`).
- **Release into `main`:** the release lane runs it with `--release`: a marked line in a migration the release adds or changes also needs `Migration safety: <file>.sql — <reason>` in the PR body.

## Dev merge gates (branch protection)

All feature PRs target `dev`. Configure GitHub → Settings → Branches → `dev`:

- Require a pull request before merging (0 approvals).
- Block force-push and branch deletion.
- Require status checks: **exactly one** — `CI gate` (`D-195`). It aggregates every PR lane and fails when a lane the change needs failed, was cancelled or was skipped, so no other check needs to be listed. Do not also require the lane jobs: they skip on unrelated PRs, and an extra required context only adds a way to hang "Expected".

> The table below is machine-validated: `scripts/check-required-checks-drift.mjs` (static-guards lane of **CI**) fails CI if any row references a workflow/job name that no longer exists, if the `CI gate` row is missing, or if a job in `ci.yml` is not in the gate's `needs:`. If you rename the gate, update this table **and** the GitHub branch-protection required-checks list in the same change.

| Check | Workflow | Job |
| --- | --- | --- |
| Single PR gate | CI | `CI gate` |

**Owner action (one-time, GitHub → Settings → Branches → `dev`):** replace the eleven legacy required checks (`typecheck · test · lint`, `Hebrew source scan (no inline UI copy)`, `web export (production bundle)`, `migration chain lint`, `apply migrations · rls · types · sql probes`, `rpc · table contract`, `coalesce mirror · layer invariants`, `web manifest parity`, `PR hygiene`, `migration destructive-op scan`, `SonarCloud quality gate`) with the single check `CI gate` (source: GitHub Actions). Until then the legacy contexts never report and every PR waits on them.

`main` requires the same single check: the release lane runs inside `CI gate` for PRs into `main` (see [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md#merge-gates-automated--must-be-green)). Never require deploy jobs on a PR rule; they run after the merge.

## Production release

Operator checklist: [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md).

**CI layout (unified gate, 2026-10-30 — `D-195`):** one workflow, `.github/workflows/ci.yml` (**CI**), runs on every PR into `dev`/`main` (`opened`, `synchronize`, `reopened`, `ready_for_review`, `edited`), on merge-queue groups, on pushes to `dev`/`main` and on manual dispatch. Its `detect changes` job runs `scripts/ci-changes.mjs`, which maps a PR's (or merge group's) diff to lanes (conservatively: `.github/**` and `.nvmrc` turn on every lane, and a path no lane claims that is not docs-only turns on every lane). Pushes to `dev`/`main` and manual dispatches run every lane, so a green push run certifies the whole tree at that SHA — a docs-only push after a red or never-run push cannot come out green. The lanes are reusable workflows; the `CI gate` job needs all of them and is the only required check. PR runs use `concurrency` with `cancel-in-progress`; `dev`/`main` pushes keep every run. Shared setup: `.github/actions/setup-pnpm-turbo` (pnpm store cache + local Turbo cache under `app/.turbo`).

| Lane (job in `ci.yml`) | Workflow file | Runs when | What it checks |
| --- | --- | --- | --- |
| `hygiene` | `ci-pr.yml` | every PR | Conventional Commits title + `Mapped to spec` line in the body |
| `static` | `ci-static-guards.yml` | every non-draft change | actionlint + shellcheck, all `scripts/*.test.mjs` + `app/scripts/*.test.mjs`, architecture, SSOT links, Hebrew scan, RPC contract, web manifest, expo-router fallbacks, migration chain, migration destructive-op scan, FlatList / SQL `OFFSET` guards, required-check docs + gate wiring, deploy isolation |
| `release` | `ci-release.yml` | every PR / merge group into `main` | head branch is `dev`; strict migration scan (`--release`); `app/VERSION` above the latest `v*` tag; P0 Playwright on `DEV_WEB_URL` once its `/version.json` serves the PR head SHA |
| `frontend` | `ci-frontend.yml` (+ `ci-sonar.yml`) | `app/**`, `scripts/**`, `Dockerfile`, Sonar config, CI plumbing | typecheck, unit tests with coverage, ESLint (`--max-warnings` ratchet), dependency audit; production web export + bundle budget + headless smoke; iOS + Android Metro/Hermes bundles; SonarCloud quality gate on the same coverage |
| `backend` | `ci-backend.yml` | `supabase/**` except functions, `infrastructure-supabase`, workspace manifests, `scripts/**`, CI plumbing | fresh local stack, all `supabase/tests/*.sql`, `database.types.ts` drift, sqlProbes |
| `edge` | `ci-edge-functions.yml` | `supabase/**`, CI plumbing | `deno check`, `deno lint`, every `*.test.ts` under `supabase/functions` |

The gate fails closed: every lane must be explicitly planned as needed or not needed, and a needed lane must succeed. A draft PR fails `CI gate` on purpose (nothing ran); `ready_for_review` re-runs the whole workflow. A manual dispatch only produces a passing gate on `dev` or `main`. On PRs, `scripts/ci-changes.mjs` and `scripts/ci-gate.mjs` run from the base branch's copy, so a PR cannot weaken its own judge. A docs-only PR runs only `hygiene` + `static` (about a minute); a full-stack PR is bounded by the slowest lane (web export + smoke or the DB stack; expected 6–8 minutes).

**Store pipelines (manual only):** one TestFlight workflow (`.github/workflows/testflight-ios.yml`) and one Play internal workflow (`.github/workflows/play-internal.yml`). Both are `workflow_dispatch` only — never auto-run on push; prod/release submit stays disabled.

Tooling pins: Node version comes from the repo-root `.nvmrc` (all `setup-node` steps use `node-version-file`); pnpm version comes from the `packageManager` field in `app/package.json` (all `pnpm/action-setup` steps use `package_json_file`). Bump either in one place only. **One deliberate exception:** the `ci-backend.yml` db-validate job pins Node 22 — `@supabase/realtime-js` needs the native WebSocket global (Node ≥ 22) for the sqlProbes integration tests; do not align it back to `.nvmrc`.

Branch protection on `dev` uses the table above; `main` release PRs use [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md#merge-gates-automated--must-be-green).

**CI gates on `main` PRs:** the same `CI gate`, plus the `release` lane it plans for every PR into `main`.

**Post-deploy smoke:** the smoke stage of **Deploy** (see "Deploy pipeline" above) checks the environment it just deployed.

| GitHub | Name | Value / purpose |
| --- | --- | --- |
| Variable | `KC_PROD_URL` | KC live root — `https://karma-community-kc.com` (prod preflight, smoke, `production` environment URL) |
| Variable | `DEV_WEB_URL` | `https://dev.karma-community.pages.dev` (dev preflight + smoke, release-lane E2E) |
| Variable (`supabase-prod`) | `BACKUP_AGE_RECIPIENT` | `age1…` public key the pre-migration prod backup is encrypted to; the owner keeps the private key offline |

The legacy `PROD_WEB_URL` alias is no longer read; delete it.

**Manual follow-up:** Remove obsolete repo variables `GLOWE_PROD_URL`, `GLOWE_STAGING_URL`, and `GLOWE_SEED_PASSWORD` from GitHub Actions if still present.

## E2E automation (Web, `D-55`)

Playwright P0 journeys run against the live dev deployment before every `dev` → `main` release PR. Policy: [`TESTING.md`](./TESTING.md).

| GitHub | Name | Value / purpose |
| --- | --- | --- |
| Variable | `DEV_WEB_URL` | `https://dev.karma-community.pages.dev` |
| Secret | `E2E_TEST_EMAIL` | Dev-only test user (active, verified) |
| Secret | `E2E_TEST_PASSWORD` | Matching password |
| Secret | `E2E_SUPABASE_ANON_KEY_DEV` | Dev project publishable anon key (for `scripts/ensure-e2e-user.mjs` preflight). Dev-scoped name keeps it distinct from prod. Wired to the `E2E_SUPABASE_ANON_KEY` env var the test code reads. |

Release gate: the `dev E2E on the release head` job of the release lane (`.github/workflows/ci-release.yml`, inside `CI gate`) — it first waits until `DEV_WEB_URL/version.json` reports the release PR's head SHA, so E2E never runs against an older dev build. The full suite also runs nightly (`.github/workflows/e2e-nightly-dev.yml`).

Create user (once, if needed): `E2E_TEST_EMAIL=… E2E_TEST_PASSWORD=… node scripts/create-e2e-user.mjs` (requires dev `SUPABASE_SERVICE_ROLE_KEY`).

Local run (after deploy on dev):

```bash
export DEV_WEB_URL=https://dev.karma-community.pages.dev
export E2E_TEST_EMAIL=…
export E2E_TEST_PASSWORD=…
export E2E_SUPABASE_ANON_KEY=…
node scripts/ensure-e2e-user.mjs
cd tests/e2e && npm install && npm run install:browsers && npm test
```
