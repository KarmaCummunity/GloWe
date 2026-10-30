# Production release checklist (`dev` → `main`)

> **Scope:** KC web on Cloudflare Pages (project `karma-community`, production branch `main`, `https://karma-community-kc.com`) + Supabase prod (`kdqtbdbzwvlugkhonexg`) + Edge Functions.
> **Branch topology:** [`ENVIRONMENTS.md`](./ENVIRONMENTS.md) · **DB/Functions runbook:** [`OPERATOR_RUNBOOK.md`](./OPERATOR_RUNBOOK.md) · **Policy:** `D-195` (gated prod release).

A release is a PR from `dev` into `main`. CI judges it (`CI gate`, including the release lane); after the squash merge, `.github/workflows/deploy.yml` deploys `main` and waits for **one owner approval click** before touching production. Agents prepare the release; only the owner approves it.

---

## Before opening the release PR

- [ ] **`dev` is deployed** — the latest `dev` push passed **CI** and the **Deploy** run for that commit is green (dev web serves it at `https://dev.karma-community.pages.dev/version.json`).
- [ ] **`app/VERSION` is above the latest `v*` tag** — the release lane checks it; bump PATCH/MINOR/MAJOR on `dev` first if needed.
- [ ] **Migration review** — read each new migration since the last tag; confirm it is backward compatible (web and functions may be rolled back, the DB is not). A destructive line needs the `migration-safety: allow` marker **and** a line `Migration safety: <file>.sql — <reason>` in the release PR body.
- [ ] **Release PR** — **`dev` → `main`**, Conventional Commits title, body with **Mapped to spec** and migration/rollout notes.

---

## Merge gates (automated — must be green)

Required on the release PR (GitHub branch protection on `main`):

> Machine-validated by `scripts/check-required-checks-drift.mjs` (static-guards lane of **CI**): the table below must reference real workflow/job names and must include `CI gate`. Rename a job → update this table and the branch-protection list together.

| Check | Workflow | Job |
| --- | --- | --- |
| PR gate | CI | `CI gate` |

`CI gate` (`D-195`) aggregates every lane. For a PR into `main` the change detector also plans the **release** lane (`.github/workflows/ci-release.yml`), whatever the diff touches, and the gate fails if it did not succeed:

| Release-lane job | Fails when |
| --- | --- |
| `release source is dev` | the head branch is not `dev` (a merge group always fails: releases go through a PR) |
| `release migration scan (strict)` | a migration added or changed by the release has a destructive line without the marker, or with the marker but no `Migration safety:` justification line for its file in the PR body |
| `release version bump` | `app/VERSION` on the release head is not greater than the latest `v*` tag |
| `dev E2E on the release head` | dev does not serve the release head SHA (`/version.json`) within 30 minutes, or a P0 Playwright journey fails |

---

## After the squash merge — the deploy

The `main` push runs **CI**; when it succeeds, **Deploy** (`deploy.yml`) starts for exactly that commit:

1. **resolve target** — confirms the commit is the `main` tip, that a push-event CI run gave it a green `CI gate`, and that tag `v<app/VERSION>` does not already exist on another commit.
2. **preflight · supabase / preflight · web** — every secret present, project refs pinned (`kdqtbdbzwvlugkhonexg`), Supabase project `ACTIVE_HEALTHY`, Pages production branch is `main`, `BACKUP_AGE_RECIPIENT` set. Fails before anything changes.
3. **approve release** — the run waits on the `production` environment. **Owner: review the run summary (version, SHA) and approve.** This is the only click. The job fails if the environment let the run through without a recorded approval.
4. **database** — encrypted backup (only when `supabase/migrations` changed since the last tag) → `db push --dry-run` → `db push`. No `--include-all`: a remote that is ahead or an out-of-order migration fails here.
5. **edge functions** — CORS variable synced, then every function deployed.
6. **web baseline → web** — the Cloudflare deployment serving prod is recorded, then the new build (stamped with the SHA) is uploaded.
7. **smoke** — `/version.json` reports the SHA, page + JS bundle load, Supabase Auth health, every function answers.
8. **tag release** — annotated `vX.Y.Z` on the commit + a GitHub Release with generated notes.

**Sync main → dev** still runs after the merge and still fails with `GH006` (`TD-182`); leave it alone.

### Spot-check after a green deploy (~5 min, optional)

- [ ] Prod URL loads in an incognito window, no dev banner.
- [ ] Sign-in works; one write path (edit profile or create a draft post).
- [ ] If migrations merged — exercise the feature they enable; run any SQL checks OPERATOR_RUNBOOK lists for them.

---

## Rollback

| Layer | What happens |
| --- | --- |
| **Web (Cloudflare Pages)** | Automatic when the functions, web or smoke stage fails after approval: production is pointed back at the deployment recorded in **web baseline** (Cloudflare Pages rollback API), then the smoke re-runs. By hand: Cloudflare dashboard → Pages → `karma-community` → Deployments → previous production deployment → *Rollback*. |
| **Edge Functions** | Automatic in the same case: the previous release tag's functions are redeployed. With no earlier tag the rollback report says so and functions stay on the failed release. |
| **DB** | **Never rolled back.** Forward-fix with a new migration. The deploy run holds an encrypted `prod-db-backup-<sha>-<attempt>` artifact (14 days) for a manual restore — OPERATOR_RUNBOOK § "Restore a pre-migration backup". |
| **Git** | Do **not** force-push `main`. Forward-fix on `dev`, bump `app/VERSION`, release again. |

A failed release is never tagged, so the next release's notes and rollback target stay correct.

---

## Dev branch protection (`dev` — working branch)

Feature PRs merge into `dev` first. One-time setup: Settings → Branches → `dev` — require PR, block force-push/deletion, require the single status check from the **Dev merge gates** table in [`ENVIRONMENTS.md`](./ENVIRONMENTS.md#dev-merge-gates-branch-protection) (`CI gate`).

---

## GitHub settings (one-time, owner)

| Setting | Location | Value |
| --- | --- | --- |
| Branch protection on `main` | Settings → Branches → `main` | PR required; block force-push/deletion; required status checks: **only** `CI gate` (remove `release PR source is dev`, `migration destructive-op scan`, `user journeys (P0)`) |
| `production` environment | Settings → Environments → `production` | **Required reviewer: the owner.** Deployment branches: `main` only. No secrets. |
| `supabase-prod`, `cloudflare-prod` | Settings → Environments | **No** required reviewers (each would add a click). Deployment branches: `main` only. |
| `supabase-dev`, `cloudflare-dev` | Settings → Environments | No reviewers. Deployment branches: `dev` and `main` (`workflow_run` deploys run on `main`). |
| Backup key | `supabase-prod` → Variables | `BACKUP_AGE_RECIPIENT` = an `age1…` public key; the owner keeps the private key offline |
| Web URLs | Repository → Variables | `KC_PROD_URL` = `https://karma-community-kc.com`; `DEV_WEB_URL` = `https://dev.karma-community.pages.dev` |

---

## Quick reference — prod targets

| Concern | Value |
| --- | --- |
| Git branch | `main` |
| Supabase project | `kdqtbdbzwvlugkhonexg` (`supabase-prod`) |
| Web | Cloudflare Pages `karma-community`, branch `main` (`cloudflare-prod`) |
| `EXPO_PUBLIC_ENVIRONMENT` | `production` |
| Release tag | `v<app/VERSION>` on the deployed commit |

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
