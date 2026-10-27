# Security & Database-Integrity Audit — Karma Community

- **Date:** 2026-06-14
- **Branch:** `dev`
- **Target Supabase project:** `roeefqpdbftlndzsvhfj` (**dev**). Prod (`slxijdfvinbjmrsfgbzx`) was **not** touched.
- **Type:** Authorized internal audit + **live pentest** (owner-requested), with read-only live DB access to dev via the Supabase MCP server. No prod access; no data mutated.
- **Mapped to spec:** NA (audit). Findings reference FR-PROFILE-*, FR-CHAT-*, FR-FOLLOW-*, FR-POST-*, FR-ADMIN-006, FR-MOD-*.

## Methodology

Six parallel static sub-agents (SQL/RLS, auth/authz, injection, secrets/CI/edge, known-issues baseline, code) → then **live verification on dev**: Supabase advisors, full catalog inspection (grants, RLS policies, SECURITY DEFINER function bodies, triggers), an unauthenticated PostgREST sweep with the public anon key over every table/view, and a **white-box authenticated-surface pentest** (every RLS policy + every parameterized SECURITY DEFINER RPC reviewed for IDOR / privilege escalation).

**Environment discipline (owner instruction "dev ≠ prod"):** all live access went through the MCP server pinned to `https://roeefqpdbftlndzsvhfj.supabase.co` (confirmed via `get_project_url`; its tools take no `project_id`, so prod is unreachable). dev and prod run the same migration chain, so the schema/policy/grant findings **almost certainly also exist on prod** and must be remediated through the migration pipeline (dev → main release), never by manual prod SQL.

## Severity summary

| # | Severity | Live? | Category | Title | Status |
|---|----------|-------|----------|-------|--------|
| **H1** | **CRITICAL** | ✅ verified | privilege escalation | **Any authenticated user can self-promote to `super_admin`** | **fixed (0196)** |
| 1 | MEDIUM | ✅ verified | authz / privacy | Anon can read the entire follow graph (`follow_edges`) | fixed (0194) |
| 2 | MEDIUM | ✅ verified | data exposure | Public storage buckets anon-listable (`post-images`) | deferred → TD-11 |
| M1 | MEDIUM | ✅ verified | integrity | Chat participant can forge/rewrite counterpart's messages | fixed (0196) |
| M2 | MEDIUM | ✅ verified | integrity | Post owner bypasses closure state-machine / mints karma | fixed (0199, TD-172) |
| M3 | MEDIUM | ✅ verified | IDOR | `rpc_unread_counts_for_chats` trusts caller `p_viewer_id` | fixed (0197) |
| 3 | MEDIUM | static | injection | CSV formula injection in moderation audit export | fixed (code) |
| 4 | LOW | ✅ verified | db hygiene | `cron.job_run_details` unbounded (48.5k rows / 66 MB) | fixed (0195) |
| 5 | MEDIUM | ✅ verified | authz / integrity | 5 internal SECURITY DEFINER funcs client-callable & ungated (karma mint, system-msg forge, audit read) | fixed (0198) |
| 6 | LOW | static | authz | App-layer permission checks unwired (`PERMISSION_MATRIX` dead) | backlog |
| 7 | LOW | ✅ verified | data exposure | Web session in `localStorage`; leaked-password protection off | backlog |

## Systemic root cause (the thread through H1, 1, M1, M2)

Supabase's **default privileges grant `ALL` on every table to `anon` and `authenticated`**. The app's migrations try to constrain writes with narrow column-level grants (e.g. `0004: grant update (status) on messages`, the `0006` comment "column-grant on users intentionally forbids clients"), but the default-privilege `GRANT ALL` **silently overrides** them. Net effect: **RLS policies are the only enforcement, and they gate on row ownership, not columns.** Wherever a table mixes user-editable columns with system-owned ones (`users.is_super_admin`, `messages.body`, `posts.status`, `follow_edges` visibility), an owner can write the privileged columns. The fix pattern is `REVOKE … then GRANT (explicit safe columns)` and/or tightening the RLS policy.

---

## H1 — [CRITICAL] Any authenticated user can self-promote to super_admin

- **Exploit (one statement, via PostgREST with any logged-in JWT):**
  `update public.users set is_super_admin = true where user_id = auth.uid();`
- **Live proof:** `has_column_privilege('authenticated','public.users','is_super_admin','UPDATE') = true`. The RLS policy `users_update_self` permits the row (own row); no `BEFORE UPDATE` trigger guards the column; and `users_sync_admin_role_grants` (AFTER UPDATE OF is_super_admin) then **inserts the `super_admin` row into `admin_role_grants`**, completing escalation into the RBAC system. The attacker immediately satisfies `is_admin()` / `has_admin_role(...,'super_admin')` and unlocks every `admin_*` RPC (ban users, delete posts/messages, grant roles, read finance/CRM/timesheets/audit).
- **Secondary impact (same hole):** self-set `account_status='active'` (ban/suspension evasion), inflate `karma_points` / `followers_count` / `items_*_count` / `posts_created_total` (leaderboard + stats forgery), zero `false_reports_count` / `false_report_sanction_count` (sanction evasion).
- **Root cause:** see "Systemic root cause" — table-wide UPDATE grant from Supabase defaults + ownership-only RLS + no column guard. This contradicts the static read of the migrations (which intended a narrow grant); only live catalog inspection revealed the effective broad grant.
- **Fix (migration 0196):** `revoke update on public.users from anon, authenticated;` then `grant update (<14 profile columns>) on public.users to authenticated;` — system-owned columns become unreachable from the client (maintained by SECURITY DEFINER RPCs / triggers / cron). Regression test `supabase/tests/0196_users_update_grant.sql` asserts the privilege matrix and that an authenticated self-escalation attempt is rejected with 42501.
- **⚠️ Prod:** present on prod (same mechanism + migrations). Expedite the dev→main release once green.

## Finding 1 — [MEDIUM] Anonymous read of the entire follow graph

- **Live:** `GET /rest/v1/follow_edges?select=*` with the anon key returns all `(follower_id, followed_id)` rows. Policy `follow_edges_select_visible` applies to role `public` and has no `auth.uid()` predicate (only "both users exist"). `follow_requests`/`blocks` don't leak (their policies require `auth.uid()`). 0070's `revoke … from anon` is defeated by the default-privilege grant.
- **Impact:** complete who-follows-whom social graph exposed to any holder of the public anon key.
- **Fix (migration 0194):** scope the SELECT policy to `authenticated`; re-revoke anon grants. Guest follower **counts** already come from `users_public` aggregates. (Open product question: should authenticated users see the full graph, or should it respect `privacy_mode`? — separate from the anon fix.)

## Finding 2 — [MEDIUM] Public storage buckets are anon-listable

- **Live:** `post-images` and `avatars` are `public=true`; `storage.objects` SELECT policy is `USING (bucket_id='…')` for roles `{anon, authenticated}` — no per-object check. Anon can **enumerate every object** in `post-images` (paths embed the owner uid) and read any image, defeating the OnlyMe/FollowersOnly image-privacy assumption (URL non-discoverability).
- **Fix:** real remediation is TD-11 (private bucket + short-lived signed URLs with a visibility-aware check). No safe one-line policy fix (the public guest feed legitimately needs public-post images). **Elevate TD-11 🟢→🟠.** Deferred from this PR.

## Finding M1 — [MEDIUM] Chat participant can forge/rewrite the counterpart's messages

- **Live:** policy `messages_update_status_recipient` authorizes a full-row UPDATE by either participant; the status state-machine trigger is `BEFORE UPDATE OF status`, so updates touching only `body`/`sender_id`/`created_at`/`system_payload` skip it, and `authenticated` held column-UPDATE on all of them.
- **Impact:** in any chat I'm in, I can rewrite the other party's message text, forge timestamps, swap `sender_id`, or inject a fake `system_payload`.
- **Fix (migration 0196):** `revoke update on public.messages` and re-grant `update (status)` only (restores 0004's intent). Body/sender/timestamps now immutable from the client.

## Finding M2 — [MEDIUM] Post owner bypasses closure state-machine / mints karma — FIXED (migration 0199)

- **Live:** `posts_update_self` (own row) + `authenticated` column-UPDATE on `status`/`reopen_count`/`delete_after`; no status-transition trigger. An owner can directly set `status='closed_delivered'` (the `karma_on_post_change` AFTER trigger then awards `closure_giver +20` / `closure_receiver +15`), or set `removed_admin`/`expired`, or rewrite `reopen_count`/`delete_after`.
- **Why it couldn't be a grant revoke:** the legitimate closure flow also writes `posts.status`/`delete_after` directly from the client (`closureMethods.ts:71`), so a blanket column revoke would break closure.
- **Fix (migration 0199, TD-172):** a `BEFORE UPDATE` guard trigger `posts_guard_client_status_transition` (SECURITY INVOKER, so `current_user` is the real role) enforces the legal status-transition graph for client-originated updates and rejects `reopen_count` rewrites — the only client-direct transition left is `open → deleted_no_recipient`. Every other status writer runs as `postgres` and bypasses via `current_user not in ('authenticated','anon')`: the admin/unmark/report/expiry writers were already SECURITY DEFINER, and the three closure/reopen RPCs (`close_post_with_recipient`, `reopen_post_marked`, `reopen_post_deleted_no_recipient`) were converted INVOKER→DEFINER (taking the audit's "move status writes behind SECURITY DEFINER RPCs" path; each already asserts `auth.uid() = owner`). That conversion also fixes a latent bug: `reopen_count` is absent from 0070's narrow client grant, so the INVOKER reopen RPCs raised `permission denied` whenever the grant was correctly narrow (a fresh stack) — reopen only "worked" on the drifted dev/prod DBs. Regression test `supabase/tests/0199_posts_status_transition_guard.sql`. (The audit-PR scope below predates this follow-up.)

## Finding M3 — [MEDIUM] `rpc_unread_counts_for_chats` IDOR

- **Live:** the SECURITY DEFINER function authorizes against the caller-supplied `p_viewer_id` instead of `auth.uid()`, so a caller can pass another user's id and read that victim's per-chat unread counts (info-leak oracle).
- **Fix (migration 0197):** derive the viewer from `auth.uid()` inside the body; `p_viewer_id` retained for signature compatibility but ignored. App caller (`getMyChats.ts`) already passes the session user → behaviour-preserving.

## Finding 3 — [MEDIUM] CSV formula injection in moderation audit export

- `app/apps/mobile/src/lib/auditCsvExport.ts` `escapeCsvField` didn't neutralize formula triggers (`= + - @`, tab, CR); user-controlled display names / metadata flow into the export. A crafted display name (`=HYPERLINK(...)`) executes when a super-admin opens the CSV in Excel/Sheets.
- **Fix (code):** prefix such values with `'` before RFC-4180 quoting; regression test added (6/6 pass).

## Finding 4 — [LOW] `cron.job_run_details` unbounded growth

- 48,503 rows / **66 MB** (oldest 2026-05-14), the largest object in the DB; rest of the data is small with no orphans (verified: `audit_events` orphan-actors = 0; queues empty; the `reports` 39 are polymorphic `target_type`, not a bug).
- **Fix (migration 0195):** daily `cron.schedule` purge keeping 7 days, guarded on pg_cron presence (matches 0080/0153/0190).

## Findings 5–7 — [LOW] (backlog)

- **5:** ~153 privileged SECURITY DEFINER functions are anon/authenticated-`EXECUTE`-able (Postgres grants function EXECUTE to PUBLIC by default). Most **self-gate on `auth.uid()`** and are not exploitable (`admin_*` assert `is_admin`; `delete_account_data()` raises if uid null — verified live). **However, a follow-up sweep found 5 internal helpers that do NOT self-gate and ARE exploitable — fixed in migration `0198`:** `karma_apply` / `karma_grant_once` (mint arbitrary karma for any user), `inject_system_message` (forge `system` messages into any chat), `admin_audit_lookup` (read any user's `audit_events`, bypassing the `_guarded` admin check), `find_or_create_support_chat` (create support threads for arbitrary users). They have no app caller (the client uses the guarded wrapper / support RPC; the karma + system-message ones are trigger-only), so revoking client EXECUTE is safe. Remaining hardening (revoke client EXECUTE on the ~12 cron/maintenance helpers; the 24 invoker `function_search_path_mutable` hits — low risk) is tracked in TD-173.
- **6:** `PERMISSION_MATRIX`/`hasPermission` defined but unwired (`GrantAdminRoleUseCase`/`BanUserUseCase` don't call them). Not exploitable (RPC+RLS enforce), incomplete FR-ADMIN-006.
- **7:** web session in `localStorage` (supabase-js default; no in-repo XSS sink); leaked-password protection (HIBP) disabled on Auth (one toggle).

## Performance / hygiene backlog (Supabase advisors)

`auth_rls_initplan` ×96 (use `(select auth.uid())`), `unindexed_foreign_keys` ×32, `unused_index` ×42, `multiple_permissive_policies` on users/admin_role_grants/follow_requests, 2 `security_definer_view` ERRORs (intentional aggregates). Remediate opportunistically.

## Verified safe (explicitly cleared)

- **No anon write/pollution vector:** anon holds all table grants by default, but every anon-facing write policy requires `auth.uid()` or is `using false`. The full anon read sweep found **only** `follow_edges` leaking; everything else is intended-public or denied.
- **`media_assets`:** gated by `is_post_visible_to(post, auth.uid())` — anon sees media only for public posts. **Not** a leak.
- **`is_post_visible_to`:** OnlyMe → false for non-owner; FollowersOnly → followers only. Authenticated attackers can't see others' private posts.
- **Ride / admin / self-scoped RPCs:** re-check `auth.uid()` ownership/membership; `can_grant_role` refuses `super_admin`; `admin_ban_user` refuses banning admins/self.
- **PII projection, ghost session, secrets, CI (`pull_request_target`), edge-function authz, client-persistence purge:** all cleared (details in git history of this doc / sub-agent runs).

## What this PR fixes vs defers

- **Fixed:** H1 (0196), M1 (0196), M3 (0197), Finding 1 (0194), Finding 3 (CSV), Finding 4 (0195) + regression test (0196).
- **Deferred (tracked as tech debt):** Finding 2 / TD-11 (storage signed URLs), M2 (posts status-transition trigger), Findings 5–7, and the perf backlog.

## Coverage / next

- Live inspection was dev-only (correct). Re-run the catalog checks against prod after the fixes ship, to confirm parity (I did not access prod).
- Recommend a recurring **advisor + grant-drift CI check** so column-grant / policy regressions surface early.
