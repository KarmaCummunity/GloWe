# 2.12 Super Admin (in-chat moderation)

> **Status:** ✅ Done — FR-ADMIN-001..021 shipped. **FR-ADMIN-021 (Survey results & feedback dashboard, A5) added 2026-06-14** — `/admin/surveys` exposes aggregate per-question statistics + per-user answers + the free-text feedback list, gated by the new `surveys.view` permission (super_admin / moderator). See §15 + migration `0194_admin_survey_results.sql`. **P3.A0 + P3.A1 + Pre-A2 Hardening + P3.A2 + P3.A3 + P3.A4 all merged to `dev` as of 2026-05-28** (PRs #384, #385, #387, #394, #426/#428, #439 + this PR). Admin Portal roadmap is complete. TD-93 closed at the UX layer via `admin_search_users` (banned/suspended users now searchable from the portal). The portal infrastructure is production-ready for moderator/support roles: `admin_role_grants` table with PRD V2-wide role enum + partial-unique single-super_admin index (closes TD-95); `has_admin_role` / `admin_assert_role` SQL predicates wired into every moderation RPC (`admin_remove_post`, `admin_dismiss_report`, `admin_confirm_report`, `admin_restore_target`, `admin_delete_message`); `(admin)` route group with `AdminGate` redirect + responsive `AdminNav` + 7 nav entries (Reports live; Tasks/Admins/Users/Posts/Audit as A2..A4 stubs); reports inbox + per-case detail with permission-gated actions consuming the `@kc/domain` `PERMISSION_MATRIX` SSOT; chat-flow coexistence behind `EXPO_PUBLIC_ADMIN_PORTAL_REPORTS` flag; auto-removal protected by 14-day freshness window; 7 legacy `useIsSuperAdmin` callsites migrated to `hasPermission()`. **Closed TDs:** TD-95 (single-super-admin DB invariant), TD-94 #2 / #4 / #5 / #6 (already-moderated error / cascade-dismiss / audit metadata parity / freshness window). **Open TDs in this domain:** TD-93 (admin search visibility — closes in P3.A4); TD-94 #1 now by design per D-41 (tickets ≠ reports); TD-94 #3 (`is_post_visible_to` admin bypass — closes in P3.A4). **Suspect-queue producers (FR-MOD-008)** and **90-day re-registration block (FR-ADMIN-003 AC3)** deferred to TECH_DEBT. **Next:** P3.A2 RBAC management (FR-ADMIN-015..017) — gives super_admin a UI to grant moderator/support roles without raw SQL. See `docs/SSOT/archive/superpowers/specs/2026-05-25-admin-portal-design.md` for A2..A4 design and `docs/SSOT/archive/audit/2026-05-16/05_following_moderation_admin.md` for the original audit.



Prefix: `FR-ADMIN-*`

---

## Scope

The Super Admin is a single privileged account (`karmacommunity2.0@gmail.com`) that performs all moderation operations through the existing chat surface — there is no dedicated admin UI in MVP. This section defines:

- The "system message" payloads injected into the Super Admin's inbox.
- The inline actions on those messages (restore, dismiss, escalate).
- Manual moderation actions performed by the Super Admin from regular UI surfaces while signed in to that account.
- Authorization checks that gate admin-only behavior.

---

## FR-ADMIN-001 — Receiving content reports as system messages

**Description.**
Every `Report` (except `target_type = none` which becomes a support thread directly) results in a system message in the Super Admin's inbox.

**Source.**
- PRD: `02_Personas_Roles.md` §2.2, `04_User_Flows.md` Flow 9 (תהליך פנימי).
- Constraints: `R-MVP-Privacy-4`, `R-MVP-Privacy-5`.

**Acceptance Criteria.**
- AC1. The system message is delivered into a dedicated `Chat` between the reporter and the Super Admin (the report itself does not open a thread; this is the channel where the admin sees moderation operations).
- AC2. Payload contains: target type, target ID, reporter `display_name`, reason, optional note, deep-link to the target's surface, and the current report count toward the auto-removal threshold.
- AC3. Each new report on the same target appends a new message to the same channel; the messages are sequenced by `created_at`.
- AC4. The system messages render in the chat UI with a distinct visual style (icon, light-shaded background) and inline action buttons (`FR-ADMIN-002`, `FR-ADMIN-003`).

**Related.** Domain: `Message.kind = system`, `Report`.

---

## FR-ADMIN-002 — Auto-removal alert with restore action

**Description.**
When a target reaches the 3-report threshold and is auto-removed, a system message is appended with a "↩ Restore" inline action.

**Source.**
- PRD: `04_User_Flows.md` Flow 9.A.
- Constraints: `R-MVP-Privacy-5`.

**Acceptance Criteria.**
- AC1. The message is appended within the same Super Admin channel that received the underlying reports.
- AC2. Tapping "↩ Restore" reverses the auto-removal:
   - For `target_type = post`: status returns to `open`; the post is re-listed in feeds and the owner notified.
   - For `target_type = user`: `account_status = active`; the user can sign in again.
   - For `target_type = chat`: the chat is unhidden for both parties.
- AC3. Restore actions are idempotent and audit-logged.
- AC4. After restore, the corresponding `Report` rows are stamped `dismissed_no_violation`, which feeds into `FR-MOD-010`.

**Related.** Domain: `Post`, `User`, `Chat`, `Report`.

---

## FR-ADMIN-003 — Dismiss / escalate action on a system message

**Description.**
A system message can be dismissed or escalated by the Super Admin.

**Source.**
- PRD: `04_User_Flows.md` Flow 9.A.

**Acceptance Criteria.**
- AC1. "✓ Confirm removal" stamps the linked `Report` rows as `confirmed_violation` (no further action needed; the auto-removal stands).
- AC2. "🗑 Dismiss" stamps the `Report` rows as `dismissed_no_violation` and reverts an auto-removal if one was applied.
- AC3. "Permanent ban" (only on `target_type = user`) sets `account_status = banned` and prevents the user from re-registering for 90 days.
- AC4. Each action emits an audit event.

**Related.** Domain: `Report`, `User`, `AuditEvent`.

---

## FR-ADMIN-004 — Manual ban from user profile

**Description.**
While signed in as the Super Admin, the user-profile screen exposes a "Ban user" action.

**Source.**
- PRD: `02_Personas_Roles.md` §2.2.

**Acceptance Criteria.**
- AC1. The action is hidden for non-admin sessions (`User.is_super_admin = false`).
- AC2. Tapping it shows a modal asking for a reason (`spam`, `harassment`, `policy_violation`, `other` + free text); on confirm the target's `account_status = banned`.
- AC3. Ban is **permanent** in MVP (no scheduled unban). The user can appeal via the support thread; the admin manually flips status if accepted.
- AC4. Audit event recorded.

**Related.** Domain: `User`, `AuditEvent`.

---

## FR-ADMIN-005 — Manual delete from chat thread

**Description.**
While signed in as the Super Admin, an extra `⋮` action allows manual deletion of a specific post or message referenced in the system thread.

**Source.**
- PRD: `02_Personas_Roles.md` §2.2.

**Acceptance Criteria.**
- AC1. The action appears as an inline button on system messages that link to a post.
- AC2. Confirms with a modal; on confirm sets the target's status to `removed_admin` (post) or hard-deletes the chat message (message).
- AC3. Audit event recorded.

---

## FR-ADMIN-006 — Authorization checks

**Description.**
Admin actions are gated by a server-side check that verifies `User.is_super_admin = true`.

**Source.**
- (Internal: required for `NFR-SEC-002` — RLS-level enforcement.)
- Constraints: `R-MVP-Safety-3`.

**Acceptance Criteria.**
- AC1. The flag is **not** trusted from the client; every admin endpoint and every RLS policy revalidates it.
- AC2. *(Amended by FR-ADMIN-017, 2026-05-28.)* At most one **active** `super_admin` grant exists at any time, enforced by the partial unique index on `admin_role_grants` (`role='super_admin' AND revoked_at IS NULL`); any number of active `moderator` and `support` grants may coexist. The `super_admin` grant is still set by direct database operation only (no UI escalation per `CLAUDE.md` §7); `moderator` and `support` grants are managed via the `(admin)/admins` portal screen (FR-ADMIN-015 / FR-ADMIN-016).
- AC3. Attempts to perform admin actions without an active grant in any allowed role fail with `FORBIDDEN` (SQLSTATE 42501).

---

## FR-ADMIN-007 — Audit visibility for the admin

**Description.**
The Super Admin can read the audit log for any user via a Settings sub-page accessible only when `is_super_admin = true`.

**Source.**
- PRD: `02_Personas_Roles.md` §2.2.

**Acceptance Criteria.**
- AC1. The sub-page is hidden for non-admins.
- AC2. It shows the last 200 audit events of any user (lookup by ID or display name).
- AC3. Audit lines are read-only and the screen has no edit controls.

**Related.** Domain: `AuditEvent`.

---

## FR-ADMIN-008 — Database-level statistics access

**Description.**
The Super Admin retrieves global statistics directly via the database for product analytics.

**Source.**
- PRD: `02_Personas_Roles.md` §2.2.

**Acceptance Criteria.**
- AC1. No in-app UI for global statistics in MVP; queries are run via the backend admin SQL console (Supabase Studio or psql).
- AC2. Read-only queries are allowed against all tables; mutating queries require an explicit confirmation procedure (typing a free-text confirmation string per `CLAUDE.md` §7 hard-prohibitions).

---

## FR-ADMIN-009 — Manual delete from post screen

**Description.**
While signed in as the Super Admin, the post detail screen exposes an "Remove as admin" action inside the `⋮` overflow menu, separate from the report-channel flow in `FR-ADMIN-005`.

**Source.**
- This document, §10 of `docs/SSOT/archive/superpowers/specs/2026-05-10-admin-delete-post-and-post-menu-design.md`.

**Acceptance Criteria.**
- AC1. The action is hidden for non-admin sessions. Super Admin also sees it on **their own** posts (alongside owner delete), so moderation is never blocked by ownership.
- AC2. Confirms with a modal, then sets `Post.status = 'removed_admin'`. Hard delete is **not** performed.
- AC3. Authorization is re-checked server-side via `is_admin(auth.uid())` inside a `SECURITY DEFINER` RPC; client gating is convenience only.
- AC4. An `audit_events` row is written with `action = 'manual_remove_target'`, `actor_id`, `target_type = 'post'`, `target_id = postId`.
- AC5. The action is idempotent: re-issuing it on an already-removed post is a quiet no-op and does not write a second audit row.

**Related.** Domain: `Post.status`, `AuditEvent`.

---

## §10 Admin Portal — Foundation (A0)

A0 is the foundation layer that all other Admin Portal sub-projects (A1..A4) depend on. It introduces the RBAC data model with DB-enforced invariants, the `(admin)` Expo Router group with a permission-gated layout, and stub screens for every future admin function so the nav structure is complete from day one.

Design spec: `docs/SSOT/archive/superpowers/specs/2026-05-25-admin-portal-design.md`. Implementation plan: `docs/SSOT/archive/superpowers/plans/2026-05-25-admin-portal-a0-foundation.md`. Decision: `D-40` in `DECISIONS.md`.

---

## FR-ADMIN-010 — RBAC primitives

**Description.**
Ships the extensible RBAC store (`admin_role_grants`) and the canonical SQL predicates (`has_admin_role`, `admin_assert_role`) that future write paths re-check on the server. The role enum is intentionally wide so the PRD V2 role hierarchy (operator, org_admin, …) can be granted without a schema migration. `users.is_super_admin` stays in lockstep with `admin_role_grants` via bi-directional sync triggers so the ~10 existing `useIsSuperAdmin` / `is_admin()` call sites keep working unchanged during A0.

**Source.**
- Design spec `docs/SSOT/archive/superpowers/specs/2026-05-25-admin-portal-design.md` §3.4, §3.5.
- Implementation plan `docs/SSOT/archive/superpowers/plans/2026-05-25-admin-portal-a0-foundation.md`.

**Acceptance Criteria.**
- AC1. `admin_role_grants` table + indexes + RLS policies (admins read own + all if `super_admin`; writes via RPC only).
- AC2. `has_admin_role(uid, role)` and `admin_assert_role(uid, roles[])` SQL functions.
- AC3. Migration backfills `users.is_super_admin = true` rows into `admin_role_grants` as `role = 'super_admin'`.
- AC4. `users.is_super_admin` becomes a generated column derived from `admin_role_grants` (or a view) for back-compat with existing call sites; new code uses `has_admin_role`.
- AC5. `super_admin` partial unique index enforces single-row invariant at DB level (closes `TD-95`).

**Related.** Domain: `AdminRole`, `AdminPermission` matrix. Migrations: `0112_admin_role_grants_table.sql`, `0113_admin_role_functions.sql`, `0114_admin_role_grants_backfill.sql`, `0115_get_my_admin_roles_rpc.sql`.

---

## FR-ADMIN-011 — Portal scaffold

**Description.**
A new Expo Router group `(admin)` accessible only to users with an active admin role. The dashboard is a real screen showing role badges + KPI placeholders; every other admin route (reports, tasks, admins, users, posts, audit) ships as a `ComingSoon` stub so the nav structure is locked in from A0. `AdminGate` is screen-level UX (server RPCs re-check the actor). Settings exposes an "Admin Portal" row gated on `useAdminRoles().length > 0` (so moderator + support also see it in A2+).

**Source.**
- Design spec `docs/SSOT/archive/superpowers/specs/2026-05-25-admin-portal-design.md` §3.2, §3.3.
- Implementation plan `docs/SSOT/archive/superpowers/plans/2026-05-25-admin-portal-a0-foundation.md`.

**Acceptance Criteria.**
- AC1. Expo Router group `(admin)` exists with `AdminLayout` (drawer on web ≥ md, bottom-tabs on mobile).
- AC2. `<AdminGate>` HOC + `useAdminRoles()` hook implemented and tested.
- AC3. Settings exposes an "Admin Portal" row, visible only when the session has ≥1 active role.
- AC4. `/admin` renders a stub dashboard (welcome + role badge + nav).
- AC5. i18n namespace `admin` added to `apps/mobile/src/i18n/locales/he/modules/`.

**Related.** Domain: `AdminRole`, `AdminPermission`. Application: `IAdminRoleRepository`, `GetMyAdminRolesUseCase`. Mobile: `useAdminRoles`, `AdminGate`, `AdminNav`, `ComingSoon`, `(admin)/_layout`, `(admin)/index`.

---

> **Note:** FR-ADMIN-015..020 will be added in their respective sub-project PRs (A2 RBAC management; A3 Internal Tasks; A4 Content & Users management).

---

## §11 Admin Portal — Reports Dashboard (A1)

## FR-ADMIN-012 — Reports inbox

- AC1. `/admin/reports` lists open Reports grouped by target (post/user/chat), with filters (status, target_type, days, reporter, target).
- AC2. Each row shows: target preview, # reports, oldest report age, latest reporter, threshold progress (n/3).
- AC3. Search bar accepts target ID or reporter display name; powered by `audit_search` + `reports` query.
- AC4. Default sort: oldest unresolved first.

**Related.** Database: `reports_open_inbox(...)` RPC (migration 0120). Domain: `ReportInboxPage`, `ReportInboxCursor`, `ReportInboxRow`. Application: `IReportsRepository.listOpenReports`, `ListOpenReportsUseCase`. Infrastructure: `SupabaseReportsRepository`. Mobile: `useReportsInbox` (infinite query), `ReportRow`, `ReportFilters`, `(admin)/reports/index.tsx`.

---

## FR-ADMIN-013 — Case detail

- AC1. `/admin/reports/[caseId]` shows: target deep-link, reporter list with reasons, audit timeline, current target status.
- AC2. Inline actions per RBAC matrix: Confirm removal / Dismiss / Restore / Permanent ban / Manual remove / Open support thread.
- AC3. Restore action no longer cascades-dismisses reports across unrelated cases (closes `TD-94`); each case is dismissed independently.
- AC4. All actions emit `audit_events` rows; the timeline updates optimistically + reconciles on success.

**Related.** Database: `reports_case_detail(...)` RPC (migration 0121); `admin_restore_target` rewritten in migration 0119 (per-case dismiss). Migration 0118 widens `admin_dismiss_report` / `admin_remove_post` / `admin_confirm_report` from `is_admin()` to `admin_assert_role(['super_admin','moderator'])`. Domain: `ReportCaseDetail`, `ReportCaseReporter`, `ReportCaseTimelineEntry`. Application: `IReportsRepository.getCaseDetail`, `GetReportCaseDetailUseCase`. Mobile: `useReportCaseDetail`, `CaseActions`, `CaseReporterList`, `CaseAuditTimeline`, `(admin)/reports/[caseId].tsx`.

---

## FR-ADMIN-014 — Chat-flow coexistence & deprecation

- AC1. The existing `system` message + inline buttons in chat keep working through A1's lifetime.
- AC2. Actions taken in the Portal are reflected back into the chat thread (the `system` message updates its inline status: "Resolved by @moderator-x at …").
- AC3. After A1 ships behind a flag (`ADMIN_PORTAL_REPORTS=true`), the chat-flow buttons render in read-only mode and direct the admin to the Portal.
- AC4. Chat-flow buttons are removed in a follow-up PR after one stable week (logged in `BACKLOG.md`).

**Related.** Mobile: `useAdminPortalReportsFlag` (reads `EXPO_PUBLIC_ADMIN_PORTAL_REPORTS`); `ReportReceivedBubble` coexistence (read-only + deep-link into `/admin/reports/[caseId]` when flag is true). Implementation plan §A1.

---

> **Deprecation note (per FR-ADMIN-014):** the legacy chat-flow surface defined in **FR-ADMIN-003**, **FR-ADMIN-004**, **FR-ADMIN-005**, and **FR-ADMIN-009** is deprecated by FR-ADMIN-014; coexistence behind `EXPO_PUBLIC_ADMIN_PORTAL_REPORTS` flag. Read-only chat buttons deep-link to the Admin Portal when the flag is true; the moderation surface lives at `/admin/reports` (FR-ADMIN-012) and `/admin/reports/[caseId]` (FR-ADMIN-013).

---

## §12 Admin Portal — RBAC management (A2 → A2.1 V2 hierarchy)

A2 originally made `moderator` and `support` grants manageable from inside the portal so the team could expand without a Supabase shell session. **A2.1 (this slice)** widens the surface to the full PRD V2 role hierarchy (`PRD_V2_NOT_FOR_MVP/02_Personas_Roles.md` §2.1): `admin` (platform sub-super_admin), `moderator`, `support`, `operator`, `operators_manager`, `org_admin`, `org_manager`, `org_employee`, `volunteer_manager`, `org_volunteer`. `super_admin` escalation remains DB-only (per `CLAUDE.md` §7).

Org-scoped roles (`org_admin`, `org_manager`, `org_employee`, `volunteer_manager`, `org_volunteer`) require a non-null `scope_org_id` referencing the organisation the grant applies to; platform roles (`admin`, `moderator`, `support`, `operator`, `operators_manager`) require `scope_org_id` to be null. Authority to grant is constrained by the hierarchy: a granter may grant only roles in their own scope and below.

Migrations: `0143_admin_rbac_management.sql` (A2), `0173_admin_role_hierarchy_v2.sql` (A2.1 — adds `admin` role, `scope_org_id` column, authority helper `can_grant_role`, expanded `admin_grant_role` signature). Mobile route: `(admin)/admins`. Decision: no new D-* required — the role enum was established by A0 (D-40); A2.1 just widens it and adds scope.

---

## FR-ADMIN-015 — Admin list

**Description.**
`(admin)/admins` lists active grants grouped by role with last-seen timestamp, and (for `super_admin`) supports toggling on revoked grants for audit visibility.

**Acceptance Criteria.**
- AC1. `(admin)/admins` lists active admins grouped by role (`super_admin`, then `moderator`, then `support`) with `display_name`, `last_seen_at`, `granted_at`, and `granted_by_display_name`.
- AC2. `super_admin` may toggle "include revoked grants" — revoked rows render dimmed with the revocation timestamp instead of last-seen.
- AC3. `moderator` sees the list read-only (no `+ Grant` button, no `Revoke` button per row); `support` does not access the route at all (deny card rendered if a stale flag lands them there).

**Related.** RPC: `admin_list_admins(p_include_revoked boolean)` returns `(grant_id, user_id, display_name, avatar_url, role, granted_at, granted_by, granted_by_display_name, revoked_at, revoked_by, last_seen_at)`. Domain: `AdminGrant`. Application: `IAdminRoleRepository.listAdmins`, `ListAdminsUseCase`. Mobile: `useAdminsList`, `AdminRow`, `(admin)/admins/index.tsx`.

---

## FR-ADMIN-016 — Grant / revoke role (V2 hierarchy)

**Description.**
Any admin role with sufficient authority can grant roles in its own scope and below to any active user via display-name lookup, and can revoke any active grant under that same authority. Revoking the last active `super_admin` is blocked at both the RPC and DB-index levels. `super_admin` itself cannot be granted via this RPC (DB-only escalation; see `CLAUDE.md` §7).

**Authority matrix (`can_grant_role(granter, target_role, target_scope)`).**

| Granter has                       | Can grant                                                                                                       | Scope                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `super_admin`                     | any role **except** `super_admin`                                                                              | any (platform or any org) |
| `admin`                           | `admin`, `moderator`, `support`, `operator`, `operators_manager`, `org_admin`                                  | platform / any org      |
| `org_admin` *(scope = X)*         | `org_manager`, `operators_manager`, `volunteer_manager`, `org_employee`, `org_volunteer`, `operator`           | only org X             |
| `org_manager` *(scope = X)*       | `org_manager`, `operators_manager`, `volunteer_manager`, `org_employee`, `org_volunteer`, `operator` *(recursive within X)* | only org X             |
| `volunteer_manager` *(scope = X)* | `volunteer_manager`, `org_volunteer` *(recursive within X)*                                                    | only org X             |
| `operators_manager` *(scope = X)* | `operator`                                                                                                     | only org X             |
| any other                         | nothing                                                                                                         | —                      |

**Acceptance Criteria.**
- AC1. The grant modal performs a debounced lookup against `users` (`account_status='active'` + `display_name ILIKE '%q%'`, limit 8) and lists matches; selecting a match plus a role enables the submit button. For org-scoped roles the modal also surfaces an org picker; for platform roles the org picker is hidden.
- AC2. Submit calls `admin_grant_role(target_user_id, role, scope_org_id)`. The RPC rejects:
  - `invalid_role` — for `super_admin` or any role not in the V2 enum;
  - `invalid_scope` — for platform roles called with non-null scope, or org roles called with null scope;
  - `forbidden_grant` — when `can_grant_role(auth.uid(), role, scope_org_id) = false` (caller is not in the role's authority chain).
- AC3. Revoking the last active `super_admin` raises `cannot_revoke_last_super_admin` (SQLSTATE `P0001`) — the partial unique index on `admin_role_grants` ensures the invariant even if a future code path skipped the guard.
- AC4. `admin_revoke_role` runs the same authority check (`can_grant_role(caller, grant.role, grant.scope_org_id) = true`); otherwise raises `forbidden_revoke`.
- AC5. Each grant and revoke emits an `audit_events` row (`action='admin_role_grant'` or `'admin_role_revoke'`, `target_type='user'`, `metadata={role, grant_id, scope_org_id}`).
- AC6. Errors mapped to user-visible Hebrew strings: `forbidden`, `forbidden_grant`, `forbidden_revoke`, `target_not_found`, `target_not_active`, `role_already_active`, `invalid_role`, `invalid_scope`, `cannot_revoke_last_super_admin`, `grant_not_found`, `grant_already_revoked`, `invalid_input`, plus a generic `unknown` fallback.

**Related.** RPCs: `admin_grant_role(p_target_user_id uuid, p_role text, p_scope_org_id uuid default null) RETURNS uuid` and `admin_revoke_role(p_grant_id uuid) RETURNS void` (both `SECURITY DEFINER`, gated by `can_grant_role(auth.uid(), …)`). Helper: `can_grant_role(granter_uid uuid, target_role text, target_scope uuid) RETURNS boolean` and `has_admin_role(uid uuid, role_name text, scope uuid) RETURNS boolean` (3-arg overload). Application: `GrantAdminRoleUseCase`, `RevokeAdminRoleUseCase` (signatures widened). Mobile: `useAdminRoleMutations`, `GrantRoleModal` (org picker added).

---

## FR-ADMIN-017 — Single-super_admin invariant (replaces FR-ADMIN-006 AC2)

**Description.**
Originally `FR-ADMIN-006 AC2` read "only one row may carry `is_super_admin`". With A0's RBAC schema (`admin_role_grants` + partial unique index `role='super_admin' AND revoked_at IS NULL`), the invariant generalises to multiple roles cleanly. The amended wording is now in FR-ADMIN-006 AC2; this FR exists to record the change for traceability.

**Acceptance Criteria.**
- AC1. FR-ADMIN-006 AC2 reads: "at most one **active** `super_admin` grant; any number of active grants for `admin` / `moderator` / `support` / `operator` / `operators_manager` (platform-scoped), and per-`scope_org_id` for `org_admin` / `org_manager` / `org_employee` / `volunteer_manager` / `org_volunteer`."
- AC2. The partial unique index (`admin_role_grants_single_super_admin_uniq`, established in migration `0112` for FR-ADMIN-010 AC5) enforces AC1 at the DB level.
- AC3. `admin_revoke_role` adds an explicit "cannot revoke last super_admin" guard (FR-ADMIN-016 AC3) as defence in depth above the DB index — the index would otherwise let the row be revoked because revocation is an UPDATE that does not violate the partial unique index (the row leaves the partial-uniqueness set).

**Related.** Migration: `0112_admin_role_grants_table.sql` (index). Migration: `0143_admin_rbac_management.sql` (RPC guard).

---

## §13 Admin Portal — Internal Tasks tracker (A3)

A3 ships an internal-only task tracker for the admin team. Tasks live in `admin_tasks` + `admin_task_activities`; both tables are SELECT-only from the client and every write goes through a SECURITY DEFINER RPC. Visibility is strictly internal — `admin_tasks` are never joined to end-user surfaces.

Migrations: `0144_admin_tasks.sql` (tables + RLS + audit-action widen) and `0145_admin_task_rpcs.sql` (RPCs). Mobile route: `(admin)/tasks` + `(admin)/tasks/new` + `(admin)/tasks/[taskId]`. Notifications: `task_assigned` kind enqueued via the existing `notifications_outbox` (`enqueue_notification` helper from migration 0056).

---

## FR-ADMIN-018 — Tasks tracker

**Description.**
Internal admin tasks with title / description / priority / assignee / due date / labels + status FSM + append-only activity log + push notifications on assignment.

**Acceptance Criteria.**
- AC1. `(admin)/tasks` lists all tasks with chip filters: status, "only mine" (created or assigned), overdue. Default sort: status (open → in_progress → blocked → done → archived), then due-soon, then most recently created. Server-side pagination at 50 rows.
- AC2. `(admin)/tasks/new` creates a task with required `title` (≤ 200 chars), optional `description` (≤ 4000 chars), `priority` ∈ `{low, medium, high, urgent}` (default `medium`), optional assignee (must be an active admin grant — RPC-validated), optional `due_at`, and comma-separated labels.
- AC3. `(admin)/tasks/[taskId]` shows status + priority chips, title + description + creator/assignee/due metadata, valid-transition status buttons, comment input, and an append-only activity timeline rendering each `kind` of `admin_task_activities` row.
- AC4. Status FSM: `open ⇄ in_progress ⇄ blocked → done → archived`. `super_admin` can move any task; `moderator` and `support` can move tasks they created or are assigned to. `done → in_progress` is permitted (re-open); `archived` is terminal.
- AC5. Deletion is restricted to the task creator and `super_admin`; it is a hard delete and cascades the activity log.
- AC6. On task creation with an assignee, and on assignment changes, a `task_assigned` notification is enqueued into `notifications_outbox` (category `social`, dedupe `task_assigned:<task_id>:<assignee_id>`, route `/(admin)/tasks/[taskId]`). Self-assignment does not emit a notification.

**Related.** Tables: `admin_tasks`, `admin_task_activities`. RPCs: `admin_task_create / admin_task_update / admin_task_set_status / admin_task_assign / admin_task_add_comment / admin_task_delete / admin_task_list / admin_task_detail`. Domain: `AdminTask`, `AdminTaskActivity`, `AdminTaskStatus`, `AdminTaskPriority`, `AdminTaskError`, `isStatusTransitionAllowed`. Application: `IAdminTaskRepository` + eight `*AdminTask*UseCase` use cases. Mobile: `useAdminTasksList / useAdminTaskDetail`, `useAdminTaskMutations`, `TaskRow / TaskStatusChip / TaskPriorityChip / TaskActivityTimeline / AssigneePicker`. Notifications: `task_assigned` NotificationKind + `pushRouteAllowlist` handler + `notifications.taskAssignedTitle/Body` i18n keys in `dispatch-notification/i18n.json`.

---

## §14 Admin Portal — Content & Users management (A4)

A4 closes the Admin Portal roadmap. Three SECURITY DEFINER RPCs (`admin_search_users`, `admin_search_posts`, `admin_audit_search`) expose server-paginated search across the full user/post tables (including moderated rows hidden from regular RLS) plus a role-tiered audit viewer that replaces the FR-ADMIN-007 Settings sub-page.

Migration: `0149_admin_content_search.sql`. Mobile routes: `(admin)/users`, `(admin)/posts`, `(admin)/audit`.

---

## FR-ADMIN-019 — User & post search

**Description.**
`/admin/users` and `/admin/posts` provide server-paginated text search across users and posts including moderated rows (banned/suspended users, removed/expired posts) that the regular `users_select_active` and feed RLS hide from non-admin callers. Closes `TD-93` at the UX level — the underlying RLS policy gap remains intentional for non-admin sessions.

**Acceptance Criteria.**
- AC1. `/admin/users` accepts a free-text query (matches `display_name` or `share_handle` ILIKE) and a status chip filter (`active`, `pending_verification`, `banned`, `suspended_admin`, `suspended_for_false_reports`, `deleted`). Results show display name, handle, status badge with semantic colour, city, with the total count rendered above the list.
- AC2. `/admin/posts` accepts a free-text query (matches `title` or `description` ILIKE) and a status chip filter (`open`, `closed_delivered`, `deleted_no_recipient`, `removed_admin`, `expired`). Results render title, owner display name, and a status badge.
- AC3. Tapping a user row navigates to `/user/[handle]` when the row has a `share_handle`; tapping a post row navigates to `/post/[id]`. The "admin actions sidebar" referenced in the original design is deferred to a follow-up TD — current Admin Portal screens (Tasks / Reports / RBAC / Audit) cover the moderation workflows.

**Related.** RPCs: `admin_search_users(p_query, p_status, p_limit, p_offset)` and `admin_search_posts(p_query, p_status, p_limit, p_offset)`; both return rows with `total_count` for server-paginated UI. Domain: `AdminUserSearchResult`, `AdminPostSearchResult`, `AdminSearchPage<T>`, `AdminContentError`. Application: `IAdminContentRepository`, `AdminSearchUsersUseCase`, `AdminSearchPostsUseCase`. Mobile: `useAdminUserSearch / useAdminPostSearch`, `UserSearchRow / PostSearchRow`.

---

## FR-ADMIN-020 — RBAC-tiered audit viewer

**Description.**
`/admin/audit` provides a paginated audit-event search with role-tiered row-level visibility, replacing the FR-ADMIN-007 Settings sub-page on a per-role basis.

**Acceptance Criteria.**
- AC1. The page accepts target-user-id, actor-id, and action filters. Common actions are exposed as chip filters; arbitrary actions can be requested via the URL or future advanced filter UI.
- AC2. Visibility is row-filtered inside `admin_audit_search` per the matrix:
   - `super_admin` sees every row.
   - `moderator` sees rows where `actor_id = caller` OR `target_id = caller` (own actions + targets they handled).
   - `support` sees rows where `actor_id = caller` only.
- AC3. The legacy Settings sub-page from FR-ADMIN-007 stays in place for backward compatibility (it surfaces user-affecting events to the affected user — a different audience). Removing the admin-side Settings entry is a follow-up cleanup (TD candidate) — the new `/admin/audit` is the primary admin surface.

**Related.** RPC: `admin_audit_search(p_target_user_id, p_actor_id, p_action, p_limit, p_offset)` — SECURITY DEFINER, gated by `admin_assert_role` then row-filtered by RBAC. Domain: `AdminAuditRow`. Application: `AdminSearchAuditUseCase`. Mobile: `useAdminAuditSearch`, `AuditLogRow`.

---

## §15 Admin Portal — Survey results & feedback dashboard (A5)

---

## FR-ADMIN-021 — Survey results & free-feedback dashboard

**Description.**
`/admin/surveys` gives super_admin / moderator a read-only dashboard over the server-driven surveys (`FR-SETTINGS-015..017`) and the free-text feedback (`FR-SETTINGS-017`). It surfaces both aggregate statistics and the raw per-user answers so the team can read what users actually wrote, not just averages.

**Source.**
- Extends FR-ADMIN-008 (database-level statistics access) with a portal UI.
- Consumes data produced by FR-SETTINGS-015..017.

**Acceptance Criteria.**
- AC1. The screen has two tabs: **Surveys** and **Free feedback**. Access is gated by the new `surveys.view` permission (`super_admin`, `moderator`).
- AC2. The Surveys tab lists every published survey (`current_version > 0`) with respondent count, total responses, question count, and last-response date.
- AC3. Selecting a survey shows per-question statistics for its current version: response count, average rating, and the 1–7 rating distribution (bar chart).
- AC4. The same survey view lists every respondent with their per-question rating **and** free-text answer (or an explicit "no comment" marker), most-recent submission first.
- AC5. The Free feedback tab lists `user_feedback` rows (optional 1–7 rating + body) with the submitter's display name and date, newest first, paginated.
- AC6. All reads go through SECURITY DEFINER RPCs gated by `admin_assert_role(auth.uid(), ARRAY['super_admin','moderator'])`; no direct table reads bypass RLS for non-admins.

**Related.** RPCs (migration `0194_admin_survey_results.sql`): `admin_survey_overview()`, `admin_survey_results(p_slug)`, `admin_user_feedback_list(p_limit, p_offset)`. Domain: `AdminSurveyOverviewItem`, `AdminSurveyResults`, `AdminSurveyQuestionStat`, `AdminSurveyRespondent`, `AdminFeedbackEntry`, `surveys.view` permission. Application: `ISurveyAdminRepository` + `GetAdminSurveyOverviewUseCase` / `GetAdminSurveyResultsUseCase` / `ListUserFeedbackUseCase`. Infra: `SupabaseSurveyAdminRepository`. Mobile: `useAdminSurveys`, `(admin)/surveys`, `SurveyOverviewCard` / `QuestionStatCard` / `RespondentCard` / `FeedbackCard` / `SurveyResultsView`.

---

## §16 Admin Portal — Management hierarchy redesign (P3.A-Tree)

Rebuilds `(admin)/admins` around a per-user card + admin-detail screen, and (in later phases) an organisation hierarchy tree. Plan: `docs/SSOT/archive/superpowers/plans/2026-06-16-admin-management-tree-redesign.md`. Phase 1 (FR-ADMIN-022/023) is FE-only (no schema change); Phases 2–3 (FR-ADMIN-024..026) add the `organizations` entity, the direct-manager link, the collapsible tree, and the public About tree with field-level privacy — specified when they ship.

---

## FR-ADMIN-022 — Unified admin card + detail + profile cross-links

**Description.**
The admins list shows one card per *user* (not per grant). Each card carries all of the user's active roles as badges and opens an admin-detail screen; role-holders are cross-linked with their public profile in both directions.

**Acceptance Criteria.**
- AC1. `(admin)/admins` renders one card per user. A user holding several roles (e.g. `moderator` + `support`) appears once, with each active role as a badge — replacing the previous one-row-per-grant rendering that duplicated multi-role users. Folding is pure domain logic (`@kc/domain` `groupGrantsByUser` → `AdminPerson`).
- AC2. Section counts reflect **active** team members. Fully-revoked users render in a separate "מינויים שבוטלו" section shown only when the include-revoked toggle is on.
- AC3. Tapping a card opens `(admin)/admins/[userId]`, which lists every grant (active + revoked) with per-role **revoke** (gated by `admins.revoke_role`) and a button to the user's public profile (`/user/[userId]`, resolved via the route's `findById` fallback — no `share_handle` round-trip).
- AC4. A role-holder's public profile (`/user/[handle]`) shows a cross-link to their admin-detail card, visible only when the viewer holds `admins.view` and the target has ≥1 grant.
- AC5. All surfaces use `@kc/ui` design tokens (`makeUseStyles`, `radius`, `shadow`, RTL helpers) and are responsive — a centered max-width column at ≥ `tablet` (768px) — per `spec/14_responsive_desktop.md`.

**Related.** Domain: `AdminPerson`, `groupGrantsByUser`, `adminRoleRank`. Mobile: `AdminPersonCard`, `RoleBadge`, `useAdminPerson`, `(admin)/admins/index.tsx`, `(admin)/admins/[userId].tsx`, profile cross-link in `user/[handle]/index.tsx`.

---

## FR-ADMIN-023 — Include-revoked toggle & system-account clarity (bug fixes)

**Description.**
Fixes the two list defects the PM reported: the confusing include-revoked toggle and report-channel system accounts (`a1-reports-*`) appearing under `מנהל-על`.

**Acceptance Criteria.**
- AC1. The include-revoked toggle reliably switches the list (the query key carries `includeRevoked`); the default view is active-only.
- AC2. Because the single-active-super_admin invariant (FR-ADMIN-017) guarantees at most one active `super_admin`, the historical **revoked** `super_admin` grants on test accounts (`a1-reports-*`) no longer inflate the active super_admin section — they surface only under the "revoked" section when the toggle is on. This is presentation-layer (FE) only; cleaning up stray dev-DB grants is a follow-up (no schema change in Phase 1).

---

## FR-ADMIN-024 — Organisations entity

**Description.**
Introduces the `organizations` table so org-scoped roles reference a real entity. Karma Community is seeded as the single platform org (`is_platform = true`) and holds the platform-wide admin roles; platform-scoped grants (null `scope_org_id`) render under its tree.

**Acceptance Criteria.**
- AC1. `organizations` table exists (`org_id`, `name`, `slug`, `is_platform`, `created_at`) with public-read RLS; writes are DB/RPC-only. A partial unique index enforces at most one platform org.
- AC2. Karma Community is seeded as the platform org (fixed `org_id`). Any pre-existing `admin_role_grants.scope_org_id` without a matching org is backfilled as a placeholder org so the FK validates.
- AC3. The deferred FK `admin_role_grants.scope_org_id → organizations(org_id)` (migration 0173) is added and validated (`on delete restrict`), additively and backward-compatibly.

**Related.** Migration `0203_admin_org_hierarchy.sql`. Decision `D-60`.

---

## FR-ADMIN-025 — Direct-manager link + hierarchy tree

**Description.**
Adds a per-grant direct-manager edge and a collapsible org-hierarchy tree. A grant may report to a manager in the same org (or a platform manager); the tree shows `level` (depth from the root). Tree visibility is org-scoped (every member sees their own org's full tree; `super_admin` sees all / any org) and is independent of the action permissions.

**Acceptance Criteria.**
- AC1. `admin_role_grants.manager_grant_id` (self-FK, `on delete set null`) holds the direct-manager edge; a CHECK forbids self-management; `is_ancestor(p_ancestor, p_node)` resolves the chain.
- AC2. `admin_set_manager(p_grant_id, p_manager_grant_id)` is `SECURITY DEFINER`, gated by `can_grant_role` authority over the grant's role/scope, enforces same-org (or platform manager), rejects cycles (`manager_cycle`), and audit-logs `admin_set_manager`. Passing `null` clears the manager.
- AC3. `admin_org_tree(p_org_id default null)` returns an RBAC-filtered adjacency list (caller's own org subtree; `super_admin` all, or a single org). Levels are computed client-side (`buildOrgForest`, `super_admin` root = 0).
- AC4. `(admin)/admins` offers a list/tree view toggle; tree mode renders collapsible nodes with role + level badges. `super_admin` can switch orgs; scoped admins are pinned to their org.
- AC5. The admin-detail screen shows live direct-manager + subordinates per grant and an assign/change/clear-manager picker gated by the `admins.set_manager` permission (server re-checks scoped authority); the tree updates without a full reload.

**Related.** Migration `0203_admin_org_hierarchy.sql`. Domain: `OrgTree` (`buildOrgForest`, `OrgTreeNode`, `OrgTreeMember`), `OrgHierarchyError`, `admins.set_manager` permission. Application: `IOrgHierarchyRepository`, `GetOrgTreeUseCase`, `SetManagerUseCase`. Infrastructure: `SupabaseOrgHierarchyRepository`. Mobile: `useOrgTree`, `useSetManager`, `OrgTree` / `OrgTreeRow` / `LevelBadge` / `OrgSwitcher` / `ManagerPickerModal` / `GrantManagerSection`.

---

| Version | Date | Summary |
| ------- | ---- | ------- |
| 0.1 | 2026-05-05 | Initial draft from PRD §2.2 and Flow 9. |
| 0.2 | 2026-05-10 | Added FR-ADMIN-009 (manual delete from post screen). |
| 0.3 | 2026-05-12 | `FR-ADMIN-009 AC1` — Super Admin sees *Remove as admin* on own posts too; `FR-POST-008` alignment: admin may edit any open post (RLS `0049_admin_post_edit_rls.sql`). |
| 0.4 | 2026-05-25 | Added §10 Admin Portal — Foundation (A0). FR-ADMIN-010 (RBAC primitives) and FR-ADMIN-011 (Portal scaffold). Status header ✅ → 🟡. FR-ADMIN-012..020 reserved for A1..A4. |
| 0.5 | 2026-05-26 | Added §11 Admin Portal — Reports Dashboard (A1). FR-ADMIN-012/013/014. Closed cascade-dismiss sub-item of TD-94 (migration 0119). Widened admin_dismiss_report / admin_remove_post / admin_confirm_report from `is_admin()` to RBAC (migration 0118). Added deprecation note on FR-ADMIN-003/004/005/009 referencing FR-ADMIN-014. |
| 0.6 | 2026-05-28 | Added §12 Admin Portal — RBAC management (A2). FR-ADMIN-015 (admin list), FR-ADMIN-016 (grant/revoke), FR-ADMIN-017 (amends FR-ADMIN-006 AC2 to "at most one active super_admin; any number of moderator/support"). Migration `0143_admin_rbac_management.sql` ships `admin_grant_role` + `admin_revoke_role` + `admin_list_admins` (all gated by `admin_assert_role`). |
| 0.7 | 2026-05-28 | Added §13 Admin Portal — Internal Tasks tracker (A3). FR-ADMIN-018. Migrations `0144_admin_tasks.sql` (tables + RLS + audit-action widen v4 → v5 with `admin_task_create`/`admin_task_update`/`admin_task_delete`) and `0145_admin_task_rpcs.sql` (8 SECURITY DEFINER RPCs for create/update/set_status/assign/add_comment/delete/list/detail). New `notifications.task_assigned*` i18n keys + `task_assigned` NotificationKind + pushRouteAllowlist handler for `(admin)/tasks/[taskId]`. |
| 0.8 | 2026-05-28 | Added §14 Admin Portal — Content & Users management (A4). FR-ADMIN-019 (user + post search) and FR-ADMIN-020 (RBAC-tiered audit viewer). Migration `0149_admin_content_search.sql` ships `admin_search_users` (closes TD-93 at the UX layer), `admin_search_posts`, and `admin_audit_search` (super_admin sees all; moderator sees own + handled-target; support sees own only). Status header flipped 🟡 → ✅. |
| 0.9 | 2026-06-14 | Added §15 Admin Portal — Survey results & feedback dashboard (A5). FR-ADMIN-021 (`/admin/surveys`): aggregate per-question stats + per-user answers + free-feedback list, gated by new `surveys.view` permission. Migration `0194_admin_survey_results.sql` ships `admin_survey_overview` / `admin_survey_results` / `admin_user_feedback_list` (all SECURITY DEFINER + `admin_assert_role` super_admin\|moderator). Also redesigned the `(admin)/tasks` filter bar (chips no longer wrap vertically; centered max-width layout). |
| 0.10 | 2026-06-16 | Added §16 Admin Portal — Management hierarchy redesign (P3.A-Tree). FR-ADMIN-022 (unified per-user card + `(admin)/admins/[userId]` detail + profile cross-links; `AdminPerson` / `groupGrantsByUser` domain fold) and FR-ADMIN-023 (include-revoked toggle + `a1-reports-*` revoked-grant presentation fix). Phase 1 is FE-only — no schema change. FR-ADMIN-024..026 (organizations + direct-manager tree + public About tree) specified when Phases 2–3 ship. Plan: `docs/SSOT/archive/superpowers/plans/2026-06-16-admin-management-tree-redesign.md`. |
| 0.11 | 2026-06-16 | Phase 2 (P3.A-Tree.2) shipped. FR-ADMIN-024 (organisations entity + Karma Community platform org + `scope_org_id` FK) and FR-ADMIN-025 (per-grant `manager_grant_id` link, `is_ancestor`, `admin_set_manager` + `admin_org_tree` RPCs, collapsible tree with level badges, org-scoped visibility, assign-manager picker). Migration `0203_admin_org_hierarchy.sql`; decision `D-60` (per-grant manager edge). FR-ADMIN-026 (public About tree + field-level privacy) ships in Phase 3. |
