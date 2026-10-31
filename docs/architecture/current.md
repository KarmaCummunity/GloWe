# Current architecture (from the code, 2026-10-30)

## Overview
```
app/ (pnpm + turbo monorepo)
├── apps/mobile                 Expo + React Native + expo-router (typed routes); web export; Hebrew RTL forced
└── packages/
    ├── domain                  Entities, value objects, pure rules (no I/O)
    ├── application             Use cases + ports (interfaces)
    ├── infrastructure-supabase Adapters implementing ports on Supabase
    └── ui                      Design tokens & shared components (@kc/ui)
supabase/
├── migrations/                 Sequential NNNN_snake.sql (≈386 files; latest 0441)
└── functions/                  Edge Functions (Deno)
.github/workflows/              CI gate + lanes, gated Deploy + stages, nightly mobile builds
```
Dependency direction is strictly inward: `apps/mobile → application → domain`; `infrastructure-supabase` implements `application` ports. App semver: `app/VERSION` (PATCH bumped automatically on every merge into `dev`, `bump-version-on-merge.yml`).

## Backend: Supabase
- Auth (Google, Apple, email/password; guest mode), Postgres with RLS, Storage, Realtime, Edge Functions. Phone is a **verification** status (migration `0068`), not a sign-in method yet (legacy `TD-151`).
- **Two projects:** `kc-dev` (integration; also used by `staging`) and `kc-prod` (production). Seed data **only** in `kc-dev` (D8). Project refs/keys live in GitHub Environments (`supabase-dev`, `supabase-prod`) and are referenced by name only.
- Schema changes reach any DB **only** as committed migration files applied via `supabase db push` / the database stage of the **Deploy** workflow (after a green push CI run on `dev`/`main`; prod also needs the owner's approval). Never via ad-hoc MCP `apply_migration`. Drift is checked by `ci-migration-drift`.

### Edge Functions (by purpose)
| Area | Functions |
|---|---|
| Account & auth | `delete-account`, `mock-login` (dev) |
| Notifications | `dispatch-notification` |
| Matching | `embed-worker`, `match-rerank` |
| Media | `strip-exif`, `backfill-image-thumbs`, `reconcile-storage-orphans` |
| Money | `payments-webhook`, `receipts-issuer`, `subscriptions-charger`, `revenuecat-webhook`, `validate-donation-link` |
| WhatsApp | `whatsapp-intake-worker`, `whatsapp-sender`, `whatsapp-webhook` |
| Research & i18n | `public-research-submit`, `rotate-research-salt`, `translate` |
| Shared | `_shared/` |

### Core data (as-is)
- Content lives in **both** `posts` and `listings` (with sync triggers), plus `ride_listings` and `giving_handoffs` — three state machines. `world_slug` + `MARKETPLACE_WORLD_SLUGS`; `listing_kinds`; `public.categories`.
- Karma: `karma_ledger`, values hard-coded (migration 0099).
- Ratings: `ride_ratings`, `giving_handoff_ratings` (currently readable via RLS; spec says admin-only — G4).
- Engagement: likes/comments (migration 0250). Chat: one conversation per pair with pinned post. Moderation: `reports` + suspects queue. Orgs: `donation_links`. Matching: `match_candidates` (MATCHING_V2).
- World launch flags (migration 0441); rides world exists behind a flag.

## Environments & delivery
| Branch | Role | Web | Supabase |
|---|---|---|---|
| `main` | production | Cloudflare Pages (prod domain) | kc-prod |
| `dev` | integration (default PR base) | Cloudflare Pages (dev) | kc-dev |
| `staging` | optional pre-integration | Cloudflare Pages (staging) | kc-dev |

- `dev` must contain `main`'s history: after each `main` push `sync-main-to-dev.yml` opens a zero-diff `-s ours` PR into `dev`, which the owner merges as a merge commit with the admin bypass because the `dev` merge queue only squashes (`TD-182`). `main`-only file changes must reach `dev` by their own PR. `main` advances only via PR `dev → main`. No force-push, no branch deletion.
- **PR CI:** `ci` — one required check, `CI gate` (`D-195`), over the lanes `ci-pr`, `ci-static-guards`, `ci-frontend` (+ `ci-sonar`), `ci-backend`, `ci-edge-functions` and, for PRs into `main`, `ci-release`; plus `ci-migration-drift` and security scanners (GitGuardian, Snyk).
- **Deploy:** `deploy` only (after a green push CI run; prod behind one owner approval), with stages `deploy-db`, `deploy-functions`, `deploy-web`, `deploy-smoke`, `deploy-tag`, `deploy-rollback` (`D-195`).
- **Mobile:** `mobile-nightly` builds the newest green `dev` commit and calls `testflight-ios` and `play-internal` (no push trigger); `kc-mobile-eas-preview` is manual. Tester builds use kc-dev through the eas.json `nightly` profile and the `mobile-store` environment key, and a bundle pointing anywhere else is not uploaded (`D-195`, [`../SSOT/ENVIRONMENTS.md`](../SSOT/ENVIRONMENTS.md) § Production release). Public store release is currently paused.
- Nightly/ops: `e2e-nightly-dev`, `k6-load-dev`, `db-explain-dev`, `seed-kc-dev`, `stale-stack-report`.

## Known structural gaps vs spec
See [`../spec/93_implementation_gaps.md`](../spec/93_implementation_gaps.md) — notably G1 (posts/listings unification), G2/G24 (world list & domains), G14 (form per type), G16 (karma config), G23 (world hub infra).
