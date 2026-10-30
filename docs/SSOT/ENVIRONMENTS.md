# Environments

> **Canonical source for branch ↔ Supabase ↔ Cloudflare Pages ↔ env-var mapping.**
> If another doc disagrees, this one wins. Last reviewed: 2026-06-09.

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

1. **`staging` is optional pre-integration.** Feature PRs may target `staging` first, then `staging` → `dev`.
2. **`dev` is the integration branch.** Merges deploy KC web to `https://dev.karma-community.pages.dev/`.
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

- **Auto** — on push to `dev` or `main` when any of these paths change: `supabase/migrations/**`, `supabase/seed.sql`, `supabase/config.toml`, or the workflow file. Pending migrations are applied via `supabase db push` to the matching GitHub Environment: `dev` → `supabase-dev` (`enbqriuxvvuontiwslun`); `main` → `supabase-prod` (`kdqtbdbzwvlugkhonexg`). PRs must keep **CI — backend** (`apply migrations · rls · types · sql probes`) green before merge — it applies all migrations on a fresh local stack.
- **Manual** — `workflow_dispatch` lets an operator target `supabase-prod` or `supabase-dev`. Defaults to dry-run; flip `apply` to true to push (useful for inspection, retries, or one-off applies).

Concurrency group `db-deploy-<environment>` (with `cancel-in-progress: false`) ensures back-to-back migration pushes queue rather than race.

**DB apply gate (`D-53`, extended `D-54`):** every auto-push and every manual `workflow_dispatch` apply (both `supabase-dev` and `supabase-prod`) runs `supabase db push --dry-run` immediately before the real `db push`. No human reviewers on deploy environments — protection is automated CI only.

**Migration safety guards:**

- **Dev:** the static-guards lane of **CI** (`.github/workflows/ci-static-guards.yml`, behind the `CI gate` check) runs `scripts/check-migration-safety.mjs` on every PR and push (blocks `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, unqualified `DELETE FROM` unless the line includes `migration-safety: allow`).
- **Main release:** `.github/workflows/ci-main-guard.yml` on PRs to `main` enforces head branch `dev` **and** runs the same migration safety scan.

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

Do **not** require **CI — main release guard** on `dev` (prod-only release-source job). Prod-only post-merge jobs (`prod-smoke`, Edge Functions deploy to `supabase-prod`) stay on `main` only.

## Production release

Operator checklist: [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md).

**CI layout (unified gate, 2026-10-30 — `D-195`):** one workflow, `.github/workflows/ci.yml` (**CI**), runs on every PR into `dev`/`main` (`opened`, `synchronize`, `reopened`, `ready_for_review`, `edited`), on merge-queue groups, on pushes to `dev`/`main` and on manual dispatch. Its `detect changes` job runs `scripts/ci-changes.mjs`, which maps a PR's (or merge group's) diff to lanes (conservatively: `.github/**` and `.nvmrc` turn on every lane, and a path no lane claims that is not docs-only turns on every lane). Pushes to `dev`/`main` and manual dispatches run every lane, so a green push run certifies the whole tree at that SHA — a docs-only push after a red or never-run push cannot come out green. The lanes are reusable workflows; the `CI gate` job needs all of them and is the only required check. PR runs use `concurrency` with `cancel-in-progress`; `dev`/`main` pushes keep every run. Shared setup: `.github/actions/setup-pnpm-turbo` (pnpm store cache + local Turbo cache under `app/.turbo`).

| Lane (job in `ci.yml`) | Workflow file | Runs when | What it checks |
| --- | --- | --- | --- |
| `hygiene` | `ci-pr.yml` | every PR | Conventional Commits title + `Mapped to spec` line in the body |
| `static` | `ci-static-guards.yml` | every non-draft change | actionlint + shellcheck, all `scripts/*.test.mjs` + `app/scripts/*.test.mjs`, architecture, SSOT links, Hebrew scan, RPC contract, web manifest, expo-router fallbacks, migration chain, migration destructive-op scan, FlatList / SQL `OFFSET` guards, required-check docs + gate wiring |
| `frontend` | `ci-frontend.yml` (+ `ci-sonar.yml`) | `app/**`, `scripts/**`, `Dockerfile`, Sonar config, CI plumbing | typecheck, unit tests with coverage, ESLint (`--max-warnings` ratchet), dependency audit; production web export + bundle budget + headless smoke; iOS + Android Metro/Hermes bundles; SonarCloud quality gate on the same coverage |
| `backend` | `ci-backend.yml` | `supabase/**` except functions, `infrastructure-supabase`, workspace manifests, `scripts/**`, CI plumbing | fresh local stack, all `supabase/tests/*.sql`, `database.types.ts` drift, sqlProbes |
| `edge` | `ci-edge-functions.yml` | `supabase/**`, CI plumbing | `deno check`, `deno lint`, every `*.test.ts` under `supabase/functions` |

The gate fails closed: every lane must be explicitly planned as needed or not needed, and a needed lane must succeed. A draft PR fails `CI gate` on purpose (nothing ran); `ready_for_review` re-runs the whole workflow. A manual dispatch only produces a passing gate on `dev` or `main`. On PRs, `scripts/ci-changes.mjs` and `scripts/ci-gate.mjs` run from the base branch's copy, so a PR cannot weaken its own judge. A docs-only PR runs only `hygiene` + `static` (about a minute); a full-stack PR is bounded by the slowest lane (web export + smoke or the DB stack; expected 6–8 minutes).

**Store pipelines (nightly, `D-195` tier 2):** `.github/workflows/mobile-nightly.yml` (**Mobile nightly**, 23:43 UTC + manual dispatch on `dev` with a `force` input) ships the newest `dev` commit whose `CI` push run succeeded — that exact SHA, never the tip — to TestFlight (`testflight-ios.yml`) and Play internal (`play-internal.yml`). Flow: `resolve` (`scripts/mobile-nightly-resolve.mjs`; fails when none of the last 30 `dev` commits is green; builds nothing when the commit already carries the tag `mobile-nightly/last`) → `e2e` (P0 journeys of `e2e-nightly-dev.yml` against the dev deployment) → `ios` ∥ `android` → `record` (tags the commit `mobile/v<VERSION>-ios<buildNumber>-android<versionCode>` and moves `mobile-nightly/last`). The schedule runs main's copy of the file, so it starts after the next release. Both store workflows also keep `workflow_dispatch`, accepted only on `dev`/`main` and only for a commit with a green `CI` push run. Preflights fail closed: a missing secret fails the job with the list of names. App Store review and Play promotion beyond `internal` stay manual. Tooling: eas-cli `24.12.1` in all three mobile workflows (`EAS_CLI_VERSION`), Node from `.nvmrc`. Marketing version = `app/VERSION` (via `app.config.ts`); iOS `buildNumber` / Android `versionCode` = EAS remote `autoIncrement`.

**Mobile store backend (one config source).** Both store builds read the Supabase backend from the GitHub Environment **`mobile-store`** (deployment branches: `dev`, `main`): `scripts/mobile-store-config.mjs` writes it into the eas.json `production` profile `env` on the runner, which eas-cli ranks above the EAS server environment for cloud (Android) and local (iOS) builds alike. Before this, iOS took the repository-level secrets `EXPO_PUBLIC_SUPABASE_*` (eas-cli local builds let the runner env override EAS env) and Android took the EAS `production` environment, so the two could differ; neither value is readable from the repo.

| GitHub (`mobile-store` environment) | Name | Value |
| --- | --- | --- |
| Variable | `MOBILE_SUPABASE_TARGET` | `prod` (`kdqtbdbzwvlugkhonexg`) or `dev` (`enbqriuxvvuontiwslun`) — the backend testers' builds use; the job summary prints it |
| Secret | `MOBILE_SUPABASE_ANON_KEY` | That project's publishable (anon) key; a key of the other project or a service-role key fails the job |

Store credentials stay repository-level for now (`TD-214`): secrets `EXPO_TOKEN`, `ASC_API_KEY_ID`, `ASC_API_KEY_ISSUER_ID`, `ASC_API_KEY_P8`, `KC_IOS_TEAM_ID`, `KC_IOS_DIST_P12_B64`, `KC_IOS_DIST_P12_PASSWORD`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`; variables `KC_ASC_APP_ID`, `KC_EAS_PROJECT_ID`, `KC_IOS_DIST_CERT_ID`. The preview workflow (`kc-mobile-eas-preview.yml`, manual) builds on EAS cloud and takes its config from the eas.json `preview` profile + EAS `preview` environment.

Tooling pins: Node version comes from the repo-root `.nvmrc` (all `setup-node` steps use `node-version-file`); pnpm version comes from the `packageManager` field in `app/package.json` (all `pnpm/action-setup` steps use `package_json_file`). Bump either in one place only. **One deliberate exception:** the `ci-backend.yml` db-validate job pins Node 22 — `@supabase/realtime-js` needs the native WebSocket global (Node ≥ 22) for the sqlProbes integration tests; do not align it back to `.nvmrc`.

Branch protection on `dev` uses the table above; `main` release PRs use [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md#merge-gates-automated--must-be-green).

**CI gates on `main` PRs:** the same `CI gate`; its frontend lane's web export mirrors the Dockerfile builder (`EXPO_PUBLIC_*` + `pnpm build:web`).

**Post-merge KC smoke:** `.github/workflows/prod-smoke.yml` polls **`KC_PROD_URL`** (legacy alias: `PROD_WEB_URL`) after `main` deploy.

| GitHub | Name | Value / purpose |
| --- | --- | --- |
| Variable | `KC_PROD_URL` | KC live root — `https://karma-community-kc.com` (for `prod-smoke.yml`) |
| Variable | `PROD_WEB_URL` | Legacy alias for `KC_PROD_URL` |

**Manual follow-up:** Remove obsolete repo variables `GLOWE_PROD_URL`, `GLOWE_STAGING_URL`, and `GLOWE_SEED_PASSWORD` from GitHub Actions if still present.

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
