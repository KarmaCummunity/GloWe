# Admin Portal — Design Spec

> **Status:** Draft, 2026-05-25
> **Owner:** Product (Naves) + agents
> **Mapped to spec:** `docs/SSOT/spec/12_super_admin.md` (FR-ADMIN-*) — adds FR-ADMIN-010..020, modifies FR-ADMIN-006
> **Decomposition:** A0 → A1..A4 (5 sub-projects, each ships as its own PR set)

---

## 1. Context & motivation

Today, all admin/moderation work in MVP-2 is funneled through the Super Admin's chat inbox. Reports arrive as `system` messages with inline buttons (`FR-ADMIN-001..005`); manual actions (ban, edit, delete) are bolted onto regular UI surfaces gated by `useIsSuperAdmin`. Stats and audit lookups live in Supabase Studio (`FR-ADMIN-008`). Only one user can carry `is_super_admin = true` (`FR-ADMIN-006 AC2`).

This worked as MVP scaffolding but doesn't scale to a growing community:

- **Single point of failure.** One human bottlenecks all moderation. There is no way to share load.
- **Discoverability.** Operational actions are scattered across chat, Settings, post overflow, profile screens.
- **Auditability.** Audit search is blocked by RLS (`TD-93`), restore actions can multi-sanction reporters (`TD-94`), and the single-admin invariant has no DB enforcement (`TD-95`).
- **Internal coordination.** The team has no in-app way to track its own operational work (verify org, follow up with a banned user, investigate a duplicate, etc.).

The Admin Portal replaces the chat-flow with a dedicated in-app surface, introduces a real RBAC, and adds internal task tracking. The chat flow stays alive during the transition and is deprecated only after parity is validated on A1.

---

## 2. Scope

**In:**

- A dedicated route group `(admin)` accessible only to users with an active admin role.
- RBAC across three roles (`super_admin`, `moderator`, `support`) with server-enforced permissions.
- A Reports Dashboard that replaces the chat-flow for moderation decisions.
- An internal Tasks tracker for the admin team.
- User/post browsing surfaces for admins (search, view-with-privacy-override).
- Audit log viewer with role-tiered visibility.
- Migration & deprecation path for the existing chat-based flow.

**Out (explicit non-goals for this design):**

- **Global statistics dashboard.** Stays in Supabase Studio. `FR-ADMIN-008` remains in force.
- **Generic DB table browser.** High security risk, low marginal value over Studio.
- **Org-admin / multi-tenant admin** (NGOs managing only their own content). Separate domain.
- **Donation reconciliation UI** (`FR-DONATE-*`).
- **Push notification config / templating UI.**
- **Bulk operations** (mass-ban, bulk-restore). Defer to TECH_DEBT until usage data shows need.

---

## 3. Architecture

### 3.1 Layering (CLAUDE.md §5)

```
packages/domain/admin/        AdminRole, AdminTask, ReportCase entities + invariants
packages/application/admin/   Use cases (one file per action) + repository ports (I*.ts)
packages/infrastructure-supabase/admin/  Supabase adapters (RPC + table reads)
apps/mobile/src/app/(admin)/  Expo Router screens (composition root)
packages/ui/                  Shared design tokens (no business rules)
```

All admin write paths go through `SECURITY DEFINER` RPCs that re-check the actor's role via `has_admin_role(auth.uid(), <role>)`. Client-side gating (`<AdminGate>`, `useHasAdminRole`) is convenience only.

### 3.2 Routing

Expo Router group `(admin)`:

```
/admin                        Dashboard home (KPIs visible to role, recent activity)
/admin/reports                Inbox
/admin/reports/[caseId]       Case detail
/admin/tasks                  Internal tasks list
/admin/tasks/[taskId]         Task detail
/admin/tasks/new              New task
/admin/admins                 Team list (super_admin only)
/admin/admins/[userId]        Team member detail (assign role, revoke)
/admin/users                  User search
/admin/users/[userId]         User detail (with privacy override)
/admin/posts                  Post search
/admin/posts/[postId]         Post detail (reuses public route + admin actions)
/admin/audit                  Audit log viewer
```

Entry points:
- Settings → "Admin Portal" row (visible only if user has any admin role).
- Deep-links from notifications (new report, task assigned, etc.) land directly in the relevant sub-route.

### 3.3 AdminGate

`AdminGate` is a screen-level wrapper that:

1. Reads the current session's admin roles via `useAdminRoles()` (TanStack Query, cached for session lifetime, invalidated on session change).
2. Optionally takes a `requiredRole` prop or a `permission` predicate.
3. On absent/insufficient role: renders a 404-style "not found" screen (no information leak about admin existence).
4. On present role: renders children.

Server-side, every RPC re-checks; the gate is purely UX. A tampered client cannot escalate.

### 3.4 Data model (new)

Migrations land sequentially starting at `0108`. Numbering may shift; specific numbers are assigned in the implementation plan.

**`admin_role_grants`**

| column | type | notes |
|---|---|---|
| `grant_id` | uuid PK | — |
| `user_id` | uuid → `users.user_id` | indexed |
| `role` | text | check: `'super_admin' \| 'moderator' \| 'support'` |
| `granted_by` | uuid → `users.user_id` | nullable (for seed) |
| `granted_at` | timestamptz | default `now()` |
| `revoked_at` | timestamptz | nullable; "active" = `revoked_at IS NULL` |
| `revoked_by` | uuid → `users.user_id` | nullable |

Constraints:
- Partial unique index `(user_id, role) WHERE revoked_at IS NULL` — a user can hold each role at most once active.
- Partial unique index `(role) WHERE role = 'super_admin' AND revoked_at IS NULL` — closes `TD-95` at DB level.

**`admin_tasks`**

| column | type | notes |
|---|---|---|
| `task_id` | uuid PK | — |
| `title` | text | not null, ≤ 200 chars |
| `description` | text | nullable |
| `status` | text | check: `'open' \| 'in_progress' \| 'blocked' \| 'done' \| 'archived'` |
| `priority` | text | check: `'low' \| 'medium' \| 'high' \| 'urgent'`, default `'medium'` |
| `assignee_id` | uuid → `users.user_id` | nullable; must be an active admin if non-null (RPC-validated) |
| `created_by` | uuid → `users.user_id` | not null |
| `due_at` | timestamptz | nullable |
| `labels` | text[] | default `'{}'` |
| `created_at` / `updated_at` | timestamptz | |

**`admin_task_activities`** — append-only activity log per task (comments + status changes + assignment changes).

| column | type | notes |
|---|---|---|
| `activity_id` | uuid PK | — |
| `task_id` | uuid → `admin_tasks.task_id` ON DELETE CASCADE | indexed |
| `actor_id` | uuid → `users.user_id` | |
| `kind` | text | `'comment' \| 'status_change' \| 'assignment_change' \| 'priority_change' \| 'due_change'` |
| `payload` | jsonb | shape depends on `kind` |
| `created_at` | timestamptz | |

No new audit table — extend the existing `audit_events` (used by `FR-ADMIN-003..005`, `FR-ADMIN-009`) with new `action` values: `admin_role_grant`, `admin_role_revoke`, `admin_task_create`, `admin_task_update`, `admin_task_delete`, `report_dismiss`, `report_confirm`, `report_escalate`. This keeps audit unified.

### 3.5 SECURITY DEFINER RPCs

All admin write paths are RPCs. Each one runs:

```sql
PERFORM admin_assert_role(auth.uid(), ARRAY['super_admin', 'moderator']);
```

`admin_assert_role(actor_id, allowed_roles)` raises `insufficient_privilege` on miss. `has_admin_role(actor_id, role)` is the boolean variant for RLS policies.

New RPCs (high-level — exact signatures in the implementation plan):

- `admin_grant_role(target_user_id, role)` / `admin_revoke_role(grant_id)`
- `admin_task_create / update / delete / assign / comment`
- `report_dismiss(report_id, reason)` / `report_confirm(report_id)` / `report_escalate(report_id, to_role)`
- `audit_search(target_user_id, action_filter, limit)` — replaces direct table read; fixes `TD-93`

Existing RPCs (`admin_remove_post`, `admin_edit_open_post`, `admin_restore_target`, `admin_ban_user`) gain an `allowed_roles` parameter to widen beyond `super_admin` once RBAC lands.

### 3.6 RBAC permission matrix

| Capability | `super_admin` | `moderator` | `support` |
|---|---|---|---|
| View Reports inbox | ✅ | ✅ | ✅ (read-only) |
| Confirm / Dismiss report | ✅ | ✅ | ❌ |
| Restore auto-removed target | ✅ | ✅ | ❌ |
| Permanent ban user | ✅ | ❌ | ❌ |
| Manual remove post | ✅ | ✅ | ❌ |
| Admin-edit post | ✅ | ✅ | ❌ |
| View Tasks list | ✅ | ✅ | ✅ |
| Create / assign / comment on Task | ✅ | ✅ | ✅ |
| Delete Task | ✅ | own only | ❌ |
| View Admins list | ✅ | ✅ (read-only) | ❌ |
| Grant / revoke admin role | ✅ | ❌ | ❌ |
| Search users / posts | ✅ | ✅ | ✅ |
| View profile with privacy override | ✅ | ✅ | ✅ |
| Audit log: own actions | ✅ | ✅ | ✅ |
| Audit log: any user | ✅ | own targets only | ❌ |
| Open support thread on a report | ✅ | ✅ | ✅ |

`super_admin` cannot demote itself if it would leave the system with zero `super_admin` rows (RPC-enforced + DB-enforced via the partial unique index plus a deferred check).

---

## 4. Sub-projects

Each sub-project below is a separate backlog row, a separate spec FR block, and (typically) a separate PR set. ACs are summarized here; the implementation plan refines them.

### A0 — Foundation **(blocks all others)**

**Goal:** ship the route group, the RBAC primitives, and the deprecation strategy of `is_super_admin`.

**FR-ADMIN-010 — RBAC primitives**
- AC1. `admin_role_grants` table + indexes + RLS policies (admins read own + all if `super_admin`; writes via RPC only).
- AC2. `has_admin_role(uid, role)` and `admin_assert_role(uid, roles[])` SQL functions.
- AC3. Migration backfills `users.is_super_admin = true` rows into `admin_role_grants` as `role = 'super_admin'`.
- AC4. `users.is_super_admin` becomes a generated column derived from `admin_role_grants` (or a view) for back-compat with existing call sites; new code uses `has_admin_role`.
- AC5. `super_admin` partial unique index enforces single-row invariant at DB level (closes `TD-95`).

**FR-ADMIN-011 — Portal scaffold**
- AC1. Expo Router group `(admin)` exists with `AdminLayout` (drawer on web ≥ md, bottom-tabs on mobile).
- AC2. `<AdminGate>` HOC + `useAdminRoles()` hook implemented and tested.
- AC3. Settings exposes an "Admin Portal" row, visible only when the session has ≥1 active role.
- AC4. `/admin` renders a stub dashboard (welcome + role badge + nav).
- AC5. i18n namespace `admin` added to `apps/mobile/src/i18n/locales/he/modules/`.

### A1 — Reports Dashboard

**Goal:** replace the chat-based moderation flow with a dedicated inbox + case detail.

**FR-ADMIN-012 — Reports inbox**
- AC1. `/admin/reports` lists open Reports grouped by target (post/user/chat), with filters (status, target_type, days, reporter, target).
- AC2. Each row shows: target preview, # reports, oldest report age, latest reporter, threshold progress (n/3).
- AC3. Search bar accepts target ID or reporter display name; powered by `audit_search` + `reports` query.
- AC4. Default sort: oldest unresolved first.

**FR-ADMIN-013 — Case detail**
- AC1. `/admin/reports/[caseId]` shows: target deep-link, reporter list with reasons, audit timeline, current target status.
- AC2. Inline actions per RBAC matrix: Confirm removal / Dismiss / Restore / Permanent ban / Manual remove / Open support thread.
- AC3. Restore action no longer cascades-dismisses reports across unrelated cases (closes `TD-94`); each case is dismissed independently.
- AC4. All actions emit `audit_events` rows; the timeline updates optimistically + reconciles on success.

**FR-ADMIN-014 — Chat-flow coexistence & deprecation**
- AC1. The existing `system` message + inline buttons in chat keep working through A1's lifetime.
- AC2. Actions taken in the Portal are reflected back into the chat thread (the `system` message updates its inline status: "Resolved by @moderator-x at …").
- AC3. After A1 ships behind a flag (`ADMIN_PORTAL_REPORTS=true`), the chat-flow buttons render in read-only mode and direct the admin to the Portal.
- AC4. Chat-flow buttons are removed in a follow-up PR after one stable week (logged in `BACKLOG.md`).

### A2 — Admin RBAC management

**Goal:** allow `super_admin` to grant/revoke admin roles and let new admins see the team.

**FR-ADMIN-015 — Admin list**
- AC1. `/admin/admins` lists active admins grouped by role with last-active timestamp.
- AC2. `super_admin` can sort, filter by role, and see revoked grants (toggle).
- AC3. `moderator` sees read-only list (names + roles); `support` does not access the route.

**FR-ADMIN-016 — Grant / revoke role**
- AC1. `super_admin` can grant `moderator` or `support` to any active user via lookup (by `display_name` or email).
- AC2. Granting cannot escalate to `super_admin` from the UI; that remains DB-only (per `CLAUDE.md` §7).
- AC3. Revoking the last active `super_admin` is blocked at RPC + DB level.
- AC4. Each grant/revoke emits an `audit_events` row.

**FR-ADMIN-017 — Update FR-ADMIN-006**
- The current `FR-ADMIN-006 AC2` ("only one row may carry `is_super_admin`") is amended in `12_super_admin.md` to: "at most one active `super_admin` grant; any number of active `moderator` and `support` grants."

### A3 — Internal Tasks

**Goal:** in-app tracking of operational work for the admin team. Tasks are internal-only — never visible to end users.

**FR-ADMIN-018 — Tasks tracker**
- AC1. `/admin/tasks` lists all tasks with filters: status, assignee (me / anyone), priority, label, overdue.
- AC2. `/admin/tasks/new` creates a task with required title, optional description, priority, assignee, due date, labels.
- AC3. `/admin/tasks/[taskId]` shows full state + activity timeline + a comment input.
- AC4. Status flow: `open` ⇄ `in_progress` ⇄ `blocked` → `done` → `archived`. Any role except `support`-only can move any task it's assigned to or created; `super_admin` can move any task.
- AC5. Deletion is restricted to task creator + `super_admin`; deletion is a hard delete (cascades the activity log).
- AC6. Notifications: when a task is assigned, the assignee gets a push + in-app notification linking to the task. Reusing `notifications_outbox` (per migration `0104`).

### A4 — Content & Users management

**Goal:** give admins safe surfaces to search and inspect content/users without leaving the Portal.

**FR-ADMIN-019 — User & post search**
- AC1. `/admin/users` and `/admin/posts` provide search with server-side pagination via dedicated RPCs (`admin_search_users`, `admin_search_posts`).
- AC2. Results show: id, display name (or post title), status, last activity. Soft-deleted / banned / removed rows are searchable and clearly marked (closes `TD-93` at UX level).
- AC3. Tapping a result opens the existing public route in admin mode (`?adminView=1`) which renders the public layout + an admin actions sidebar.

**FR-ADMIN-020 — Admin audit viewer (extends FR-ADMIN-007)**
- AC1. `/admin/audit` provides full audit search by target user, by actor, or by action, paginated.
- AC2. Visibility tiered per RBAC matrix (`super_admin` sees all; `moderator` sees own + handled-target events; `support` sees own only).
- AC3. Replaces the Settings sub-page from `FR-ADMIN-007`; the Settings sub-page is removed in the A4 PR.

---

## 5. Migration & deprecation strategy

The transition runs in three phases, each shipped behind a feature flag in `app_config` (or env, per existing patterns):

| Phase | Flag state | Behavior |
|---|---|---|
| **Phase 1 — Dual write** | `ADMIN_PORTAL_REPORTS=false` | Portal exists for `super_admin` only; chat-flow remains authoritative. Used to validate inbox parity. |
| **Phase 2 — Portal default** | `ADMIN_PORTAL_REPORTS=true` | All admin roles use the Portal. Chat-flow buttons render as read-only with a deep-link. |
| **Phase 3 — Chat-flow removed** | flag retired | The chat-flow code paths (`emit_admin_message` system buttons) are deleted. Existing system messages remain as audit trail. |

Each phase is its own PR/release. Phase 1 lands at the end of A1; Phase 2 lands after one week of parity; Phase 3 lands after two weeks of stability and is logged as a `TECH_DEBT.md` cleanup row.

---

## 6. Testing strategy

- **Domain** (`packages/domain/admin/`): unit tests for entity invariants (role uniqueness, status transitions, super_admin demotion rule).
- **Application** (`packages/application/admin/`): unit tests for each use case with mocked ports.
- **Infrastructure** (`packages/infrastructure-supabase/admin/`): integration tests against the dev project for each RPC, covering happy path + RLS denial + concurrent-edit cases.
- **Mobile** (`apps/mobile/`): component tests for `AdminGate`, screen-level smoke tests for each route (renders without crash, gates correctly).
- **End-to-end** (manual, per PR): the PM walks through one full report case in the Portal + one task lifecycle, in Hebrew RTL.

Per CLAUDE.md §5, every new domain/application file ships with `__tests__/` beside it.

---

## 7. SSOT deltas

| File | Change |
|---|---|
| `docs/SSOT/spec/12_super_admin.md` | Header status ✅ → 🟡. Add §11..§21 for FR-ADMIN-010..020. Amend FR-ADMIN-006 AC2 per FR-ADMIN-017. Amend FR-ADMIN-004, FR-ADMIN-005, FR-ADMIN-009 so that "admin" reads as "any role permitted by the RBAC matrix" (existing `is_super_admin` checks in RPCs are replaced by `admin_assert_role`). Add deprecation note on FR-ADMIN-001..005 referencing FR-ADMIN-014. |
| `docs/SSOT/BACKLOG.md` | Add 5 rows: P3.A0 (Foundation), P3.A1 (Reports), P3.A2 (RBAC), P3.A3 (Tasks), P3.A4 (Content). A1..A4 blocked by A0; A1 blocked by A2; A3..A4 blocked by A2. |
| `docs/SSOT/TECH_DEBT.md` | Close TD-93, TD-94, TD-95 against the relevant sub-projects when they ship. |
| `docs/SSOT/DECISIONS.md` | New entry `D-40`: "Replace in-chat moderation with dedicated Admin Portal + introduce RBAC." Rationale paragraph references this design. |

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Permission drift between client gate and server RPCs | Single source of truth for the matrix in `packages/domain/admin/permissions.ts`. Both `AdminGate` and a generated SQL migration consume the same matrix. |
| Two moderators acting on the same case simultaneously | Reports RPCs check status before mutating (`UPDATE … WHERE status = 'open'`); UI shows a "this case was resolved by X" banner on stale fetches. |
| Auditors lose the chat audit trail post-deprecation | Existing `system` messages stay in the DB. The Portal's audit viewer joins `audit_events` with chat history when relevant. |
| New admin invited but never accepts | Grant is immediate (no acceptance flow in MVP). Revocation removes the grant. Future: invite-and-confirm flow logged as TD. |
| Test coverage thin on RLS | Each RPC ships with an integration test that runs as a non-admin user and asserts `insufficient_privilege`. |

---

## 9. Open follow-ups (not blocking)

- **Bulk operations** — once usage data shows >5 ops/day on a single target type, add bulk-restore / bulk-confirm. Log as TD.
- **Saved searches** — users may want named filters on reports/audit/tasks. Defer.
- **Per-admin notification preferences** — assigning tasks should be configurable (push/in-app/email). Defer.
- **Analytics dashboard** — explicitly out of scope; revisit after A4.

---

## 10. Revision history

| Version | Date | Summary |
|---|---|---|
| 0.1 | 2026-05-25 | Initial draft. Defaults locked: 3 roles (super_admin/moderator/support); tasks internal-only; tiered audit access. |
