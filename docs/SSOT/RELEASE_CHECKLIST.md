# Production release checklist (`dev` → `main`)

> **Scope:** Web app on Railway + Supabase prod (`slxijdfvinbjmrsfgbzx`).
> **Branch topology:** [`ENVIRONMENTS.md`](./ENVIRONMENTS.md) · **DB/Functions runbook:** [`OPERATOR_RUNBOOK.md`](./OPERATOR_RUNBOOK.md)

Use this checklist for every production release. CI automates gates; the agent (CTO) executes the flow — no human approval on deploy environments (`D-53`).

---

## Before opening the release PR

- [ ] **`dev` is green** — latest `dev` commit passed CI (typecheck, test, lint, DB validate if migrations touched).
- [ ] **Dev E2E P0 green** — `CI — E2E dev / user journeys (P0)` on this release PR (auth, feed, create-post, chat inbox). Human spot-check on dev optional. Skip only for pure CI/docs hotfixes to `main` (no app paths).
- [ ] **Migration review** — if `supabase/migrations/**` changed: read each new migration; confirm backward-compatible; note any manual operator steps in the PR body.
- [ ] **Edge Functions review** — if `supabase/functions/**` changed: note which functions changed; plan post-merge smoke (donation link edit — see OPERATOR_RUNBOOK § Edge Functions).
- [ ] **Release PR** — open **`dev` → `main`**, Conventional Commits title, PR body includes **Mapped to spec** and migration/rollout notes.

---

## Merge gates (automated — must be green)

Required on the release PR (GitHub branch protection on `main`):

> Machine-validated by `scripts/check-required-checks-drift.mjs` (**CI — required-checks drift**): the table below must reference real workflow/job names. Rename a job → update this table and the branch-protection list together.

| Check | Workflow | Job |
| --- | --- | --- |
| Quality | CI — frontend | `typecheck · test · lint` |
| i18n guard | CI — frontend | `Hebrew source scan (no inline UI copy)` |
| Web bundle | CI — frontend | `web export (production bundle)` |
| Migration chain | CI — backend | `migration chain lint` |
| DB + RLS + types | CI — backend | `apply migrations · rls · types · sql probes` |
| Contract | CI — contract | `rpc · table contract` |
| PR hygiene | CI — PR hygiene | `PR hygiene` |
| Main release guard | CI — main release guard | `release PR source is dev` + `migration destructive-op scan` |
| E2E dev | CI — E2E dev | `user journeys (P0)` |
| SonarCloud | CI — SonarCloud | `SonarCloud quality gate` |

> Path-filtered workflows: a release PR that only touches `docs/**` will not run the frontend/backend/contract workflows. Such PRs are rare; release PRs typically touch app + supabase paths and trigger the full set. `CI — PR hygiene` always runs on non-draft PRs.

Do **not** require post-merge deploy jobs on the PR rule (`DB deploy`, `Supabase Functions deploy`, `Prod smoke`).

---

## Immediately after squash-merge to `main`

Watch **Actions** on `main` (in order, as applicable):

1. **CI** — push workflow green.
2. **DB deploy** — when migration paths changed: **dry-run then apply** to `supabase-prod` (no human gate).
3. **Supabase Functions deploy** — runs when `supabase/functions/**` changed.
4. **KC prod smoke** — `prod-smoke.yml` polls `KC_PROD_URL` after app/Dockerfile changes on `main`.
5. **GloWe prod smoke** — `glowe-prod-smoke.yml` runs Playwright probes on `GLOWE_PROD_URL` after `dev` deploy (and every 15 min).
6. **Sync main → dev** — must succeed; if it fails (merge conflict), fix before any further `dev` work.

Watch **Railway → prod** — new deployment from `main` reaches **Success**.

---

## Post-deploy smoke (operator — ~5 min)

Automated checks after deploy:
- **KC (`main`):** `prod-smoke.yml` — HTTP 200 on `KC_PROD_URL`.
- **GloWe (`dev`):** `glowe-prod-smoke.yml` — Playwright probes on `GLOWE_PROD_URL`; results in admin **System health** when ingest runs.

Spot-check manually:

- [ ] **Prod URL loads** — incognito window, no dev banner.
- [ ] **Sign-in** — Google (web) or email OTP path you ship.
- [ ] **One write path** — e.g. edit profile or create draft post.
- [ ] **If migrations merged** — exercise the feature that migration enables; run SQL checks from OPERATOR_RUNBOOK for that migration if listed.
- [ ] **If functions merged** — donation link edit smoke (same row `id`, no duplicate insert).

---

## Rollback (if prod is broken)

| Layer | Action |
| --- | --- |
| **Web (Cloudflare Pages)** | See **Cloudflare Pages rollback** below — primary path for GloWe + KC static web. |
| **App (Railway)** | Railway → prod service → Deployments → redeploy previous successful image (legacy / secondary host if still in use). |
| **DB** | **No auto-rollback.** Forward-fix with a new migration or manual SQL per OPERATOR_RUNBOOK. Prefer backward-compatible migrations. |
| **Edge Functions** | Redeploy from last known-good commit: `workflow_dispatch` on **Supabase Functions deploy**, or local `supabase functions deploy` from that commit. |
| **Git** | Do **not** force-push `main`. Forward-fix on `dev`, release again. |

### Cloudflare Pages rollback (GloWe + KC web)

GloWe and the KC web bundle share **one** Cloudflare Pages project (`karma-community`), deployed by [`.github/workflows/deploy-web.yml`](../../.github/workflows/deploy-web.yml) (`wrangler pages deploy … --project-name=karma-community --branch=<git-branch>`). Topology: [`ENVIRONMENTS.md`](./ENVIRONMENTS.md).

| Git branch | Pages “branch” / URL | Product front door |
| --- | --- | --- |
| `dev` | `dev` → `https://dev.karma-community.pages.dev` | **GloWe:** `/glowe` (also KC under same host) |
| `main` | `main` → `https://karma-community-kc.com` | **KC** root; GloWe still at `/glowe` |

Rolling back a Pages deployment restores the **entire** static site for that branch (KC SPA + `/glowe/**`). It does **not** roll back Supabase schema, Edge Functions, or Auth config.

#### Dashboard (preferred, ~1 min)

1. Cloudflare Dashboard → **Workers & Pages** → project **`karma-community`**.
2. Open **Deployments**.
3. Filter / select the environment that matches the broken URL (`dev` for GloWe live / `main` for KC prod).
4. Find the last **Successful** deployment known-good (match commit SHA / deploy time from GitHub Actions **Deploy Web → Cloudflare Pages**).
5. Open that deployment → **Rollback to this deployment** (wording may be “Retry deployment” / promote previous alias — use the control that makes this deployment the live alias for the branch).
6. Confirm the live URL: GloWe footer `vX.Y.Z` / `glowe-version.js` matches the rolled-back build; KC root loads without the bad change.

#### CLI (same project)

Requires `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (same secrets as deploy-web).

```bash
# List recent deployments for the project
npx wrangler pages deployment list --project-name=karma-community

# Redeploy a known-good artifact by re-running CI from that commit, or
# use the dashboard Rollback on the listed deployment id.
# (Prefer dashboard rollback over improvising a new deploy from an old tree
# unless you intentionally rebuild that commit.)
```

#### Re-deploy a known-good git commit (when dashboard rollback is unavailable)

1. Check out the last good commit on `dev` or `main` (do **not** force-push).
2. GitHub Actions → **Deploy Web → Cloudflare Pages** → **Run workflow** (`workflow_dispatch`) on that ref, **or** open a forward-fix PR that restores the good tree and merge so the normal push deploy runs.
3. Watch the workflow green, then smoke the URL(s) above.

#### After rollback

- [ ] Smoke GloWe (`/glowe`) and/or KC root for the rolled branch.
- [ ] If the bad release also shipped migrations/functions, Pages rollback alone is not enough — follow **DB** / **Edge Functions** rows above (forward-fix).
- [ ] Land a forward-fix on `dev` (then `dev` → `main` if prod) so git history matches what is live; do not leave production pinned to an orphaned Pages alias indefinitely.

---

## Dev branch protection (`dev` — working branch)

Feature PRs merge into `dev` first. One-time setup: Settings → Branches → `dev` — require PR, block force-push/deletion, require status checks from the **Dev merge gates** table in [`ENVIRONMENTS.md`](./ENVIRONMENTS.md#dev-merge-gates-branch-protection) (includes **CI — dev guard / migration destructive-op scan**). Do not add **CI — main release guard** to `dev`.

---

## GitHub settings (one-time)

| Setting | Location | Value |
| --- | --- | --- |
| Branch protection on `dev` | Settings → Branches → `dev` | PR required; status checks per ENVIRONMENTS dev table (`D-54`) |
| Branch protection on `main` | Settings → Branches → `main` | Block direct pushes; require status checks (table above) — **no required human reviewers** (`D-53`) |
| Required status checks | Same (`main`) | Include **CI — main release guard** and **CI — E2E dev / user journeys (P0)** on `dev` → `main` PRs |
| Dev web URL for E2E | Settings → Secrets and variables → Actions → **Variables** | `DEV_WEB_URL` = `https://mvp-2-dev.up.railway.app` |
| E2E credentials | Settings → Secrets and variables → Actions → **Secrets** | `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `E2E_SUPABASE_ANON_KEY_DEV` (dev publishable anon) |
| `supabase-prod` environment | Settings → Environments → `supabase-prod` | Secrets only (`SUPABASE_*`); **do not** enable required reviewers |
| KC prod URL for smoke | Settings → Secrets and variables → Actions → **Variables** | `KC_PROD_URL` = `https://karma-community-kc.com` (legacy: `PROD_WEB_URL`) |
| GloWe prod URL for synthetics | same | `GLOWE_PROD_URL` = `https://dev.karma-community.pages.dev/glowe` |

Document the canonical prod URL in [`ENVIRONMENTS.md`](./ENVIRONMENTS.md) once confirmed.

---

## Quick reference — prod targets

| Concern | Value |
| --- | --- |
| Git branch | `main` |
| Supabase project | `slxijdfvinbjmrsfgbzx` |
| `EXPO_PUBLIC_ENVIRONMENT` | `production` |
| Railway service | `prod` (branch `main`) |

---

# Mobile app store submission (iOS App Store + Google Play)

> **Scope:** the Expo / EAS mobile app at `app/apps/mobile` (bundle id `com.karmacommunity.app`, version from `app.json`).
> This is separate from the web release flow above. Run it for each native store release.
> **Do not build or submit while known bugs are open** — the PM gates the first build.

## A. One-time account + project setup (needs owner credentials — cannot be automated)

1. **Link the EAS project.** From `app/apps/mobile`: `eas login` then `eas init`. This writes `extra.eas.projectId` into `app.json` — **commit that change**. Closes `TD-121`: until the real projectId is committed, push-token registration is skipped on any non-EAS build (no push notifications).
2. **Apple Developer.** Membership active. In **App Store Connect**, create the app record (name `KC - קהילת קארמה`, bundle `com.karmacommunity.app`) — this yields the numeric **ASC App ID**. Ensure the App ID has the **Sign in with Apple** capability (EAS can manage this during `eas credentials` / build when signed in with your Apple account).
3. **Sign in with Apple → Supabase (required for `FR-AUTH-004`).** In Supabase Auth → Providers → Apple, add the **Services ID**, **Team ID**, **Key ID**, and the **.p8 "Sign in with Apple" key**. Without this the native Apple flow fails at the token exchange. This is the go-live dependency for the Apple SSO that ships in code; the iOS button is otherwise wired and tested.
4. **Google Play.** Play Console account active. Create the app, then a **Google Cloud service account** with Play release permission; download its JSON to `app/apps/mobile/credentials/google-play-service-account.json` (already gitignored, referenced by `eas.json`).

## B. Fill the config placeholders (after step A yields the values)

- `app/apps/mobile/eas.json` → `submit.production.ios`: `appleId`, `ascAppId`, `appleTeamId`.
- `app/apps/mobile/public/.well-known/apple-app-site-association`: replace `REPLACE_WITH_APPLE_TEAM_ID`.
- `app/apps/mobile/public/.well-known/assetlinks.json`: replace `REPLACE_WITH_ANDROID_RELEASE_SHA256` with the release signing cert SHA-256 (from `eas credentials` after the first Android build). Closes `TD-66` — until filled, universal/app links open the browser chooser instead of the app.

## C. Store listing content (prepare before submitting)

- **Privacy policy + Terms public URLs.** Both stores require a publicly reachable privacy-policy URL. In-app legal is server-driven (`FR-SETTINGS-010`); also expose a public web copy (e.g. `https://karma-community-kc.com/legal/privacy`).
- **Apple App Privacy labels** + **Google Data Safety form**: declare account email/phone, user-generated content, and Sentry diagnostics.
- **Assets / copy:** screenshots per device class; description, keywords, category (Social), age rating, support email `karmacommunity2.0@gmail.com`. Marketing icons are ready: iOS 1024 is baked from `assets/icon.png`; Google Play 512 listing icon is `assets/play-store-icon-512.png`.

## D. Build — PM-gated, do NOT run until bugs are cleared

From `app/apps/mobile` (production profile auto-increments build number / versionCode; version string `1.0.0` from `app.json`):

```bash
eas build --platform ios     --profile production
eas build --platform android --profile production
```

## E. Submit

```bash
eas submit --platform ios     --profile production --latest
eas submit --platform android --profile production --latest
```

- iOS lands in TestFlight → then submit for App Review.
- Android lands on the `internal` track → test → promote to production.

## F. Pre-submit verification on a real device build

- [ ] Sign in with Apple completes (needs step A.3).
- [ ] A push notification is received (needs step A.1 projectId).
- [ ] Universal / app links open the app directly (needs step B fingerprints).
- [ ] No dev banner, no dev auto-sign-in (production env).

## Go-live blockers checklist

- [ ] `eas init` → real `extra.eas.projectId` committed (`TD-121`).
- [ ] Supabase Apple provider configured (`FR-AUTH-004`; closes the go-live half of `TD-24`).
- [ ] Deep-link fingerprints filled (`TD-66`).
- [ ] Remaining app bugs resolved (PM-tracked) — first build is gated on this.
