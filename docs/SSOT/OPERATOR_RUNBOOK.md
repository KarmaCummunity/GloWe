# Operator Runbook — Karma Community

> Migration verification steps for each numbered migration (0001–0009, P0.6).

**Status**: Migrations 0001–0009 all applied to the live Supabase project (0009 applied 2026-05-08).

## Standard procedure for any migration

```bash
supabase db push
supabase gen types typescript --project-id <ref> \
  > app/packages/infrastructure-supabase/src/database.types.ts
```

**GitHub Actions — DB deploy:** migrations reach kc-dev and prod only through the **Deploy** workflow ([`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml), database stage [`deploy-db.yml`](../../.github/workflows/deploy-db.yml); see `ENVIRONMENTS.md` § Deploy pipeline): after a `dev` push passes CI it applies them to kc-dev, and after a `main` push passes CI and the owner approves the release it backs up prod (encrypted) and applies them there without `--include-all`. To re-apply kc-dev migrations by hand, dispatch **Deploy** on `dev` (CI-gated; there is no separate DB dispatch). Each GitHub Environment (`supabase-dev`, `supabase-prod`) defines `SUPABASE_ACCESS_TOKEN` (an **account** token from [Account → Access tokens](https://supabase.com/dashboard/account/tokens), `sbp_…`, not a project key), `SUPABASE_DB_PASSWORD` and `SUPABASE_PROJECT_REF`; `scripts/deploy-preflight.mjs` refuses a ref that does not match the target.

---

## Migration application rules (READ FIRST) {#application-rules}

The repo uses **sequential** migration files (`supabase/migrations/NNNN_snake.sql`, e.g. `0212_glowe_event_registration.sql`). The `schema_migrations` ledger on each Supabase project must match those file versions exactly.

**Rule:** apply schema changes to the dev DB ONLY as committed sequential files, via **`supabase db push`** / **`supabase migration up`** — or let the **Deploy** workflow apply them after a `dev` push passes CI.

**Never** apply a dev schema change with the Supabase MCP **`apply_migration`** tool. It records a **TIMESTAMP** version (e.g. `20260701130827`) that has no local file. `supabase db push` then refuses to run — *"Remote migration versions not found in local migrations directory"* — and the next `DB deploy` on `dev` fails until the ledger is repaired. (The MCP **`execute_sql`** tool is fine for read-only inspection; it does not touch the ledger.)

**Guardrail:** the [`.github/workflows/ci-migration-drift.yml`](../../.github/workflows/ci-migration-drift.yml) workflow (`CI — migration drift`) scans the dev ledger on a 6-hour schedule, on push to `dev`, and on manual dispatch. It fails loudly the moment a remote version has no local file — instead of waiting for the next deploy. It is **not** a required merge check (needs live secrets, never runs on `pull_request`).

**Reconcile drift** (rewrites only the history table — the DDL was already applied, so the schema is untouched):

```bash
source ~/.kc-dev-secrets.env
supabase link --project-ref "$SUPABASE_PROJECT_REF"
node scripts/reconcile-migration-drift.mjs        # prints the exact repair commands
# review, then run each printed command, e.g.:
#   supabase migration repair --status reverted 20260701130827
#   supabase migration repair --status applied  0213
supabase db push --dry-run --include-all --linked --yes   # → "Remote database is up to date."
```

`node scripts/check-migration-drift.mjs` is the same detector the CI guard runs (pipe `supabase migration list --linked` into it).

---

## Restore a pre-migration backup (prod) {#restore-backup}

Before a prod release applies migrations, the database stage of **Deploy** (`deploy-db.yml`, job `backup (prod)`) dumps prod when `supabase/migrations` changed since the last `v*` tag. Each dump streams straight into [`age`](https://age-encryption.org), encrypted to the public key in the `supabase-prod` variable `BACKUP_AGE_RECIPIENT`; plaintext never touches the runner disk or the log. The run keeps artifact `prod-db-backup-<sha>-<attempt>` (`roles.sql.age`, `schema.sql.age`, `data.sql.age`) for **14 days**. **Storage objects (avatars, post images) are not included** — only the database; Supabase Storage keeps them, and a restore does not touch them. It holds user PII: only the owner holds the private key, and decrypted files must never be committed, uploaded or kept after the restore.

Policy (`D-195`): the database is **forward-fix only**. Restore only when a forward-fix migration cannot repair the damage (e.g. data destroyed), and only with the PM's typed confirmation (CLAUDE.md §7).

1. Download the artifact from the Deploy run (Actions → run → Artifacts) to a private machine.
2. Decrypt with the owner's private key: `age -d -i key.txt -o schema.sql schema.sql.age` and the same for `roles.sql.age` and `data.sql.age`.
3. Prefer restoring into a **new** Supabase project (or a branch) and copying the lost rows back; replaying a full dump over live prod also drops everything written since the backup.
4. Restore: `psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f roles.sql` (custom roles; skip on a Supabase project where they exist), then `psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f schema.sql`, then `psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -c 'SET session_replication_role = replica' -f data.sql` (triggers off while the data loads).
5. Delete the decrypted files (`shred -u roles.sql schema.sql data.sql`).

The key pair is created once by the owner: `age-keygen -o key.txt` prints the public key (`age1…`) to put in `BACKUP_AGE_RECIPIENT`; `key.txt` stays offline. Without the variable, the prod preflight fails and nothing deploys.

---

## Owner setup for D-195 CI/CD {#owner-setup-ci}

Repository settings only the owner (admin) can apply. Tracked as `INFRA-CI-OWNER` in [`BACKLOG.md`](./BACKLOG.md); background in [`DECISIONS.md`](./DECISIONS.md) `D-195`, layout in [`ENVIRONMENTS.md`](./ENVIRONMENTS.md). Do the steps **in this order**: each merge assumes the settings before it.

1. **Single required check, then merge #1292.** Settings → Branches (or the ruleset of step 5, if you apply it now) → `dev` and `main`: replace the legacy required checks with exactly **`CI gate`**, source **GitHub Actions** (list in [`ENVIRONMENTS.md` § Dev merge gates](./ENVIRONMENTS.md#dev-merge-gates-branch-protection)). Then merge PR #1292 (unified PR gate).
2. **Bot identity (`INFRA-CI-6`).**
   1. **Agent GitHub App** — Settings (your account or the org) → Developer settings → GitHub Apps → New GitHub App. Name e.g. `kc-agent`; webhook off; **Repository permissions:** Contents **Read and write**, Pull requests **Read and write**, Actions **Read-only**, Checks **Read-only**, Metadata **Read-only** (mandatory); everything else **No access** — never Administration. "Where can this app be installed?" → Only on this account. Create it, note the **App ID**, generate a **private key** (`.pem`).
   2. Install the App → **Only select repositories** → `KC` (no other repository).
   3. Repository → Settings → Secrets and variables → Actions → repository secrets: `AGENT_APP_ID` = the App ID, `AGENT_APP_PRIVATE_KEY` = the full `.pem` contents. Delete the local `.pem` afterwards. `auto-merge-agent-ready.yml` now merges as the App, so merges trigger **CI** → **Deploy** (`TD-197`); with neither these nor `AGENT_MERGE_TOKEN` it fails visibly.
   4. **Agent machine user** — create a separate GitHub account for Claude / agent sessions (its own e-mail, 2FA on; GitHub's terms allow one machine account per person). Invite it to `KC` with role **Write** — not Maintain, not Admin. Add its login nowhere in `.github/owners.json` or `.github/CODEOWNERS`.
   5. In Claude Code (claude.ai → Settings → Connectors → GitHub, and any local `gh auth login`), disconnect your personal account and connect **the machine user** instead. From then on agent PRs are authored by the machine user, so **you can approve them** (GitHub never counts an author's own approval) and agents can no longer use your admin rights to bypass rules.
   6. Optional fallback: a fine-grained PAT of the machine user (this repository only; Contents + Pull requests read/write) as secret `AGENT_MERGE_TOKEN`.
3. **Prod environments, then merge #1308** (gated prod release, `INFRA-CI-3`). Settings → Environments:
   - `production` — required reviewer: **you** only; deployment branches: `main` only; no secrets.
   - `supabase-prod`, `cloudflare-prod` — deployment branches `main` only; no reviewers. `supabase-dev`, `cloudflare-dev` — deployment branches `dev` and `main`; no reviewers.
   - Variables: `BACKUP_AGE_RECIPIENT` on `supabase-prod` (see [§ Restore a pre-migration backup](#restore-backup) for the key pair); repository variables `KC_PROD_URL` and `DEV_WEB_URL` ([`ENVIRONMENTS.md`](./ENVIRONMENTS.md) table). Delete the legacy `PROD_WEB_URL`.
   - `EXPO_PUBLIC_ENVIRONMENT` per environment: `production` on `cloudflare-prod`, `development` on `cloudflare-dev`.
   - The Cloudflare API token in `cloudflare-*` needs **Cloudflare Pages: Edit**.
   - Then merge PR #1308.
4. **Mobile store, then merge #1304** (nightly mobile, `INFRA-CI-4`).
   - Environment `mobile-store` (deployment branches `dev` + `main`) with secret `MOBILE_SUPABASE_ANON_KEY` = the **kc-dev** publishable key.
   - EAS → project → Environment variables → `preview`: the Sentry values and the `GOOGLE_SERVICES_JSON` file variable.
   - Verify the iOS signing secrets are present (`KC_IOS_*`, `ASC_*`).
   - Allow `mobile/*` tags (if a tag ruleset restricts tag creation, add `mobile/*` to the allowed patterns).
   - Then merge PR #1304.
5. **Import the ruleset (`INFRA-CI-2`).** Settings → Rules → Rulesets → New ruleset → **Import a ruleset** → upload [`.github/rulesets/dev-main.json`](../../.github/rulesets/dev-main.json) → review → Create. It targets `dev` + `main`: pull request with **0** approvals + **Require review from Code Owners** + dismiss stale approvals + approval of the most recent push; required check `CI gate` from GitHub Actions (`integration_id` 15368); no force pushes, no deletions; **no bypass actors**. Then remove the classic branch-protection rules on `dev`/`main` (the ruleset replaces them).
   - **Verify right after import** with two throwaway PRs into `dev`: (a) a docs-only change must merge on a green `CI gate` with no review; (b) a one-line comment change in `.github/CODEOWNERS` must ask for your review. GitHub does not document how "approval of the most recent push" behaves with 0 required approvals; if PR (a) also waits for an approval, edit the ruleset and turn that one option off (code-owner review + stale-approval dismissal still cover owned files).
   - Owner overrides: when `CI gate` fails with a "Test integrity" or "ci.yml must keep the base branch's lanes and jobs" error, read the listed reasons; if the change is intended, **approve the PR** — the review re-runs CI and the gate turns green for that head SHA. A new push needs a new approval.
6. **Cleanup.** Delete the `tmp-probe-*` workflows (and any runs you no longer need) and the stale branch `chore/ci-nightly-mobile` (superseded by `chore/ci-nightly-mobile-2`).

---

## 0001 — Foundation & Identity {#0001}

Verify: sign in with Google → confirm row appears in `public.users` with Google name + avatar → re-sign-in must not create a duplicate row.

---

## 0002 — Posts core {#0002}

Verify: sign in as test user → insert via SQL editor:
```sql
insert into posts (owner_id, type, title, city, street, street_number)
values ('<your-user-id>', 'Give', 'Test couch', '5000', 'Bialik', '12');
```
Expect the row to appear. Once P0.4 wires real CRUD, it should surface in the feed.

---

## 0003 — Following & Blocking {#0003}

```sql
-- NULL-safe helper
select public.is_blocked(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid
); -- → false

-- Self-follow must error self_follow_forbidden
insert into public.follow_edges(follower_id, followed_id) values ('A', 'A');

-- Blocked relationship must error blocked_relationship
insert into public.blocks(blocker_id, blocked_id) values ('A', 'B');
insert into public.follow_edges(follower_id, followed_id) values ('A', 'B');
```

Regenerate `database.types.ts` after applying.

---

## 0004 — Chat & Messaging {#0004}

```sql
-- NULL-safe helper
select public.has_blocked(null::uuid, null::uuid); -- → false

-- Canonicalize trigger: (B, A) must return (A, B)
insert into public.chats (participant_a, participant_b)
values ('B-uuid', 'A-uuid')
returning participant_a, participant_b;

-- Message must bump chats.last_message_at
insert into public.messages (chat_id, sender_id, body)
values ('<chat-id>', 'A-uuid', 'hello');

-- After A blocks B: querying chats as A → 0 rows (RLS hides); as B → row still visible
```

Realtime: subscribe a client to `messages:chat_id=eq.<chat-id>` and send a message — recipient must receive the event.

Regenerate `database.types.ts` after applying.

---

## 0005 — Moderation {#0005}

```sql
-- Admin helper
select public.is_admin(null::uuid); -- → false

-- Report must create a reporter_hide row + audit_events row
insert into public.reports (reporter_id, target_type, target_id, reason)
values ('A-uuid', 'post', '<post-id>', 'Spam');

-- Re-running same INSERT within 24 h must error duplicate_report

-- After 3 distinct reporters on the same post:
-- posts.status must flip to removed_admin
-- audit_events must have an auto_remove_target row

-- Bump posts.reopen_count to 5 → moderation_queue_entries row with reason='excessive_reopens'
```

Regenerate `database.types.ts` after applying.

---

## 0006 — Stats Counters {#0006}

```sql
select * from public.community_stats;
-- → 1 row with registered_users, active_public_posts, items_delivered_total, as_of

-- As user A, insert a Public post, then:
select active_posts_count_internal,
       active_posts_count_public_open,
       posts_created_total
from public.users where user_id = 'A-uuid';
-- → 1, 1, 1

-- visibility is upgrade-only: OnlyMe → Public allowed; Public → OnlyMe is blocked by trigger
-- After deleting the post: active_posts_count_internal + public_open → 0; posts_created_total stays 1

-- Viewer-aware function
select public.active_posts_count_for_viewer('A-uuid', 'A-uuid'); -- owner view (internal)
select public.active_posts_count_for_viewer('A-uuid', null);      -- anon view (public-only)

-- Two users mutual follow → followers_count + following_count of both = 1

-- Clamp-at-zero NOTICE
select public.stats_safe_dec(0); -- → 0, emits NOTICE in pg logs
```

Regenerate `database.types.ts` after applying.

---

## 0007 — Users Realtime Publication {#0007}

```sql
-- users must be in the publication
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public';
-- row with tablename = 'users' must be present

-- Subscribe a client to the users channel, then:
update public.users
set followers_count = followers_count
where user_id = '<id>';
-- subscribed client must receive the Realtime event
```

---

## 0008 — City Seed {#0008}

```sql
select count(*) from public.cities; -- ≥ 1,306

-- New auth user created via trigger must have city = '5000', city_name = 'תל אביב - יפו'
-- Pre-existing users with legacy slug cities must be remapped to numeric codes
```

Regenerate `database.types.ts` after applying.

---

## 0009 — Avatars Storage bucket {#0009}

Required for FR-AUTH-011 (onboarding profile photo) and FR-PROFILE-007 (Edit Profile photo replace).

```sql
-- Bucket must exist with the right shape
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'avatars';
-- → ('avatars', true, 524288, '{image/jpeg}')

-- 4 RLS policies must exist on storage.objects
select polname from pg_policies
where schemaname = 'storage' and tablename = 'objects' and polname like 'avatars_%';
-- → avatars_insert_own, avatars_update_own, avatars_delete_own, avatars_read_public

-- As authenticated user A, upload to <user_a_id>/avatar.jpg → success
-- As authenticated user A, upload to <user_b_id>/avatar.jpg → RLS denied
-- As anon, fetch public URL of any avatars/<id>/avatar.jpg → 200 OK
```

After apply, verify in the app: onboarding photo step → camera or gallery → image visible after upload → "Continue with current photo" advances to tour. Errors keep Skip available.

---

## P0.6 — Closure flow (one-time setup, 2026-05-10)

The closure flow ships two SQL migrations that depend on the `pg_cron` extension being enabled on the Supabase project. The migration file is idempotent and safe to re-run.

### 1. Enable `pg_cron` extension

In the Supabase dashboard:

1. Database → Extensions → search "pg_cron".
2. Toggle **Enable**.

### 2. Apply migrations

```bash
# From the repo root, with the Supabase CLI logged in to the dev project:
supabase migration up 0015_closure_rpcs.sql
supabase migration up 0016_closure_cleanup_cron.sql

# Or via the dashboard SQL editor: paste each file's contents and run.
```

### 3. Verify

```sql
-- Two new RPCs exist
select proname from pg_proc
 where proname in ('close_post_with_recipient', 'reopen_post_marked', 'closure_cleanup_expired_with_metric');
-- → 3 rows

-- Daily cron schedule installed
select jobname, schedule from cron.job where jobname = 'closure_cleanup_daily';
-- → ('closure_cleanup_daily', '0 4 * * *')

-- Metric table exists
select count(*) from public.closure_cleanup_metrics; -- 0 until first run
```

### 4. App-side smoke (after migrations)

- Sign in as a test user with at least one open post and one chat partner on it.
- PostDetail → "סמן כנמסר ✓" → Step 1 confirm → Step 2 picker → "סמן וסגור ✓" → Step 3 explainer → done.
- Profile → "פריטים שתרמתי" should be +1.
- Reopen the same post via "📤 פתח מחדש" → counter -1.

Repeat for staging / prod when promoting.

---

## FR-STATS — Activity log + nightly counter recompute (migrations `0044`, `0045`, 2026-05-12)

Same **`pg_cron` prerequisite** as P0.6 §1. Apply `0044_personal_activity_log.sql` then `0045_stats_recompute_nightly.sql` (or `supabase db push` from repo root).

### Verify

```sql
-- Timeline RPC still exists (reads `user_personal_activity_log`)
select proname from pg_proc where proname = 'rpc_my_activity_timeline';

-- Nightly job + drift tables
select proname from pg_proc where proname = 'stats_recompute_personal_counters_nightly';
select jobname, schedule from cron.job where jobname = 'stats_recompute_nightly';
-- → ('stats_recompute_nightly', '15 4 * * *') when pg_cron is enabled

-- Manual smoke (postgres / SQL editor — function is not granted to `authenticated`)
select * from public.stats_recompute_personal_counters_nightly();
select * from public.stats_recompute_runs order by run_id desc limit 3;
```

Drift rows are visible to super-admins via RLS on `stats_drift_events` / `stats_recompute_runs`. For **NFR-RELI-005** (>0.1% drift/night), wire alerts from database logs or export `stats_drift_events` to your metrics stack.

Regenerate `database.types.ts` after applying (or merge the manually added table + function stubs from `main`).

---

## Edge Functions — CI deploy + prod smoke (2026-05-12)

**Workflow:** the Edge Functions stage of **Deploy** (`.github/workflows/deploy-functions.yml`), after the database stage, for every `dev` push that passes CI (kc-dev) and every approved `main` release (prod). It deploys every function in `supabase/functions` except `_shared` and the local-only `mock-login`; the deploy smoke then sends `OPTIONS` to each and fails on a 5xx or 404. No push or manual trigger of its own — dispatch **Deploy** on `dev` to redeploy kc-dev.

**GitHub:** Repository → Settings → Environments → `supabase-prod` / `supabase-dev` must expose the same secrets as DB deploy:

| Secret | Purpose |
| ------ | ------- |
| `SUPABASE_ACCESS_TOKEN` | Supabase account access token (dashboard → Account → access tokens). |
| `SUPABASE_PROJECT_REF` | Project ref from the dashboard URL (not `project_id` from local `config.toml`). |

| Variable (optional, recommended) | Purpose |
| -------------------------------- | ------- |
| `PUBLIC_RESEARCH_ALLOWED_ORIGINS` | Comma-separated `Origin` allowlist for `public-research-submit`. Synced on each deploy when set. |

**Survey B CORS values (2026-05-29 catch-up):**

| Environment | `PUBLIC_RESEARCH_ALLOWED_ORIGINS` |
| ------------- | --------------------------------- |
| `supabase-dev` | `https://mvp-2-dev.up.railway.app,https://dev3.karma-community-kc.com,http://localhost:8081,http://localhost:19006` |
| `supabase-prod` | `https://karma-community-kc.com` |

CLI one-liner (from repo root, account token in env):

```bash
supabase secrets set PUBLIC_RESEARCH_ALLOWED_ORIGINS="<origins>" --project-ref <ref>
```

`SUPABASE_DB_PASSWORD` is **not** required for function deploy.

**After merge:** open Actions → the **Deploy** run for the commit → confirm the `edge functions` and `smoke` stages succeeded. If a stage failed: fix secrets/permissions, then use **Re-run all jobs** — never **Re-run failed jobs**. Every stage that changes an environment starts with the deploy guard, which refuses an attempt whose release approval or rollback baseline came from an earlier attempt, so a partial re-run fails on prod; **Re-run all jobs** re-resolves the commit (it must still be the `main` tip) and asks the owner to approve again. On prod a failed release has already been rolled back to the previous tag (unless it applied migrations — then it demands a forward-fix).

**One-time catch-up (if prod was behind `main`):** from a machine with the CLI logged in, at repo root:

```bash
supabase link --project-ref "<SUPABASE_PROJECT_REF>"
supabase functions deploy
```

**Smoke — donation link edit (guards against stale `validate-donation-link`):**

1. As an authenticated user, open an existing donation link and change only display name; save.
2. In SQL editor: `select id, display_name, validated_at, created_at from public.donation_links where submitted_by = '<user_id>' order by created_at desc limit 5;`  
   Expect **one** row per logical link: the same `id` as before the edit, updated `display_name` / `validated_at` — not a second row with the same URL/category from the same edit session.

### Optional — duplicate `donation_links` rows from pre-fix prod

If historical bad data exists (same contributor intent, two live rows), identification is **manual** and needs product/operator judgment — do **not** bulk-delete blindly.

Heuristic: same `submitted_by`, same `category_slug`, same `url`, two rows with different `created_at` (often the “edit” created an unintended INSERT). Keep the row you want to show (typically the older canonical row or the one referenced by UI); remove or soft-hide the duplicate per your data policy. Migration `0050_donation_links_purge_soft_deleted.sql` only addresses `hidden_at` / soft-delete hygiene, not this class of duplicate.

---

## Backfill image thumbnails (PERF-4, 2026-05-28)

After PR-1a (`perf(images): upload-time thumbs ...`) ships, **new** post / avatar uploads always write a sibling `-thumb.jpg` object. **Existing** objects need a one-time backfill pass to get the same wins.

The `backfill-image-thumbs` Edge Function scans `post-images` and `avatars` buckets, downloads each non-thumb object, resizes via ImageMagick WASM (400px for posts, 96px for avatars), and uploads the thumb with `cache-control: public, max-age=31536000, immutable`. Idempotent: existing thumbs are skipped, so it's safe to re-run.

### Run against dev

From a machine with the Supabase CLI logged in (or a service-role JWT in `$SR`):

```bash
SUPABASE_REF=enbqriuxvvuontiwslun
SR="$(cat ~/.kc-dev-secrets.env | grep SUPABASE_SERVICE_ROLE_KEY | cut -d= -f2-)"

# Dry-run first to see what would be processed:
curl -sS -X POST "https://${SUPABASE_REF}.supabase.co/functions/v1/backfill-image-thumbs" \
  -H "Authorization: Bearer ${SR}" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true,"pageLimit":500}'

# Real run — invoke repeatedly until `results[*].more === false`:
curl -sS -X POST "https://${SUPABASE_REF}.supabase.co/functions/v1/backfill-image-thumbs" \
  -H "Authorization: Bearer ${SR}" \
  -H "Content-Type: application/json" \
  -d '{"pageLimit":100}'
```

Per-invocation budget is bounded by Edge Function timeout (25s on free tier). `pageLimit: 100` is a safe default that fits inside that envelope. Bump or lower based on dashboard latency.

### Body options

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `bucket` | `"post-images" \| "avatars" \| "both"` | `"both"` | Narrow the scope. |
| `pageLimit` | `number` (1-500) | `100` | Max objects processed per invocation. |
| `lookbackHours` | `number` | _all_ | Only objects newer than `now - hours`. |
| `dryRun` | `boolean` | `false` | Count + log without writing. |

### Response

```json
{
  "ok": true,
  "dryRun": false,
  "results": [
    { "bucket": "post-images", "scanned": 100, "generated": 87, "skipped_existing": 13, "errors": 0, "more": true },
    { "bucket": "avatars",     "scanned":  42, "generated": 39, "skipped_existing":  3, "errors": 0, "more": false }
  ]
}
```

Re-invoke until every entry's `more` is `false`.

### Run against prod

Same flow, swap `SUPABASE_REF` and use the prod service-role bearer. The function ships to prod with every approved release (Edge Functions stage of **Deploy**).

---

## KC support channels — donations to KC (FR-DONATE-011, migration `0447`)

The Money hub's *Support KC directly* card reads its payment links from `public.kc_support_channels`. Changing a row changes the app immediately — **no release**. Only super admins can write (RLS); the URL must be `https://` with no credentials (CHECK).

| `channel` | Shown as | Seeded |
|---|---|---|
| `bit` | One-time — Bit (interim, D64) | ✅ (FR-DONATE-010 link) |
| `paybox` | One-time — PayBox (interim, D64) | ✅ (FR-DONATE-010 link) |
| `card_one_time` | One-time — credit-card hosted page | ❌ add after Grow setup |
| `card_standing_order` | Monthly standing order — hosted page | ❌ add after Grow setup |

### Add / replace a provider page (e.g. Grow, launch plan A11)

Create two hosted pages in the Grow dashboard (one-time; recurring monthly), then run against **dev first**, check the app, then prod:

```sql
insert into public.kc_support_channels (channel, url, provider_label)
values
  ('card_one_time',       'https://<grow one-time page>', 'Grow'),
  ('card_standing_order', 'https://<grow recurring page>', 'Grow')
on conflict (channel) do update
  set url = excluded.url, provider_label = excluded.provider_label, is_active = true;
```

As soon as an active `card_one_time` row exists, the app hides Bit / PayBox on its own (D64) — on the Money hub and on the About / Settings card. Once clearing is confirmed working on prod, remove the interim rows for good: `delete from public.kc_support_channels where channel in ('bit', 'paybox');`

The app has **no compiled payment links**: if this table cannot be read, donors see "unavailable" rather than a stale link.

Pause a channel: `update public.kc_support_channels set is_active = false where channel = '<channel>';`

### Standing-order cancellation requests (legal obligation)

A donor's *Request to cancel a standing order* posts `בקשה לביטול הוראת הקבע שלי לתמיכה בקהילת קארמה.` (en: *Request to cancel my standing order…*) to their support thread with the super admin. The app promises cancellation **within 3 business days** (Israeli Consumer Protection Law §13D): cancel the recurring transaction in the provider dashboard, then confirm in the same chat.

### Sandbox org-payments flow

The in-app verified-nonprofit donation flow (#850) is sandbox-only and hidden by default. To exercise it on dev: `update public.app_flags set enabled = true where key = 'money_in_app_org_payments';` — never on prod until a real provider is wired.

## Publishing legal documents (FR-SETTINGS-010)

Editable from Supabase Studio without a frontend deploy. Each publish is an immutable `legal_document_versions` row plus an update to the current-pointer row in `legal_documents`. The trigger computes `content_hash` (SHA-256) automatically.

**Severity semantics:**
- `minor` — typo / cosmetic. No re-acknowledgement. `change_summary` may be null.
- `standard` — material change. Users see a 7-day soft-grace banner, then the server promotes the gate to a blocking modal at day 7. `change_summary` is required (Markdown bullets shown on the consent card).
- `critical` — urgent change. Blocks immediately on the next foreground. `effective_date` must be within 1 hour of `now()`; the RPC rejects scheduled criticals.

### Snippet 1 — Publish Terms (minor): typo / cosmetic, no re-ack

```sql
select public.publish_legal_document(
  p_doc_type       => 'terms',
  p_body_md        => $$
# תנאי שימוש
<full Markdown body here>
$$,
  p_severity       => 'minor',
  p_change_summary => null,
  p_effective_date => now()
);
```

### Snippet 2 — Publish Terms (material): re-ack required, 7-day soft grace

```sql
select public.publish_legal_document(
  p_doc_type       => 'terms',
  p_body_md        => $$
# תנאי שימוש
<full Markdown body here>
$$,
  p_severity       => 'standard',
  p_change_summary => $$- בולט 1
- בולט 2
- בולט 3$$,
  p_effective_date => now()
);
```

### Snippet 3 — Publish Privacy (minor)

Same as Snippet 1 with `p_doc_type => 'privacy'`.

### Snippet 4 — Publish Privacy (material)

Same as Snippet 2 with `p_doc_type => 'privacy'`.

### Snippet 5 — Publish CRITICAL (blocks all users immediately)

Use sparingly. Effective date must be within 1 hour of `now()` or the RPC rejects.

```sql
select public.publish_legal_document(
  p_doc_type       => 'privacy',
  p_body_md        => $$<full Markdown>$$,
  p_severity       => 'critical',
  p_change_summary => $$- שינוי דחוף שדורש אישור מיידי$$,
  p_effective_date => now()
);
```

### Verification after publish

```sql
select doc_type, current_version, last_material_version, last_material_severity
  from public.legal_documents;
```

The published row should show the new `current_version`. For `standard` / `critical`, `last_material_version` advances; for `minor`, it stays.

---

## External GLOWE contributors (INFRA-OSS-8)

Org project board: [GloWe (#2)](https://github.com/orgs/KarmaCummunity/projects/2) — public.

### Labels

| Label | Use |
| --- | --- |
| `contributor-facing` | Safe for volunteers |
| `good first issue` / `help wanted` | Entry / next tasks |
| `maintainer-only` | Org-admin / PM only (Snyk, CodeRabbit, GitGuardian, Phase C, …) |
| `area:glowe-web` / `area:docs` / `area:a11y` / `area:i18n` | Area filter |
| `size:S` / `size:M` | Effort hint |

### Project views (maintainer setup)

**Project:** [GloWe #2](https://github.com/orgs/KarmaCummunity/projects/2)

| View | Layout | Filter | URL |
|------|--------|--------|-----|
| **Contributor board** (default for newcomers) | Board | `label:contributor-facing is:open` | [view/4](https://github.com/orgs/KarmaCummunity/projects/2/views/4) |
| **Good first issues** | Table | `label:"good first issue" is:open` | [view/5](https://github.com/orgs/KarmaCummunity/projects/2/views/5) |
| **Maintainer / blocked** | Table | `label:maintainer-only is:open` | [view/6](https://github.com/orgs/KarmaCummunity/projects/2/views/6) |

Legacy unfiltered views (`View 1`, `board`, `RoadMap`) can be removed in the project UI
(**⋯ → Manage views → Delete**). The REST API does not expose view delete/patch for org
projects (404 as of 2026-07).

#### Create or recreate views via REST (requires `project` scope)

```bash
gh auth refresh -h github.com -s project,read:project

gh api -X POST orgs/KarmaCummunity/projectsV2/2/views \
  -f name='Contributor board' -f layout='board' \
  -f filter='label:contributor-facing is:open'

gh api -X POST orgs/KarmaCummunity/projectsV2/2/views \
  -f name='Good first issues' -f layout='table' \
  -f filter='label:"good first issue" is:open'

gh api -X POST orgs/KarmaCummunity/projectsV2/2/views \
  -f name='Maintainer / blocked' -f layout='table' \
  -f filter='label:maintainer-only is:open'
```

Set **Contributor board** as the project default in the UI: project **⋯ → Settings →
Default view**.

Custom fields (optional): **Size** (S/M/L), **Area** (glowe-web/docs/a11y/i18n).

#### One-time: grant CLI project scope + bulk-add items

`@navesarussi` must refresh the GitHub CLI token (interactive browser):

```bash
gh auth switch --user navesarussi
gh auth refresh -h github.com -s project,read:project,repo,workflow,read:org
```

Then add contributor issues to project #2 and set Status=Todo:

```bash
for n in 704 726 727 728 729 730 731 732 733 734 735; do
  gh project item-add 2 --owner KarmaCummunity \
    --url "https://github.com/KarmaCummunity/GloWe/issues/$n"
done
for n in 708 709 710 712 713; do
  gh project item-add 2 --owner KarmaCummunity \
    --url "https://github.com/KarmaCummunity/GloWe/issues/$n"
done
```

Size/Area custom fields still require the project UI if GraphQL field APIs are unavailable.

### Scope guard

Workflow `.github/workflows/ci-scope-guard.yml` closes PRs that only touch
`app/apps/mobile/**` and comments with links to `AGENTS.md` + `CONTRIBUTING.md`.
Mixed mobile+other PRs get a one-time warning comment.

### Discussions

Categories: **Q&A**, **Ideas**, **Show and tell**, **Announcements** (maintainer).
Point newcomers from README / issue-template `config.yml` contact links.

Welcome thread: [Discussion #736](https://github.com/KarmaCummunity/GloWe/discussions/736) — pin manually in the UI (GraphQL pin API unavailable).

### Security tooling secrets (INFRA-OSS-4/5/6)

Workflows are committed; scans **skip gracefully** until secrets exist:

| Secret | Workflow | Obtain |
| --- | --- | --- |
| `SNYK_TOKEN` | `CI — Snyk` | https://app.snyk.io/account |
| `GITGUARDIAN_API_KEY` | `CI — GitGuardian` | GitGuardian dashboard → API |
| *(none)* | CodeRabbit | Install https://github.com/apps/coderabbitai on the repo |

Full matrix: [`SECURITY.md`](../../SECURITY.md) at repo root.

After a clean baseline, promote `Snyk dependency scan` / `GitGuardian secret scan` to
required branch-protection checks and update `ENVIRONMENTS.md` in the same PR.

### Review SLA

Documented in `CONTRIBUTING.md`: aim to review external PRs within **3 business days**.
