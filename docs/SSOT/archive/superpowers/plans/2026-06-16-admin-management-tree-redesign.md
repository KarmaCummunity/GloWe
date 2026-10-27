# Admin Management & Org Hierarchy — Redesign Plan

> **Status:** Phase 0 (this doc) — planning. Phases 1–3 sequenced below, each ships as its own PR to `dev`.
> **Owner:** FE lead (mobile + ui) with BE lane for migrations. **Domain:** `spec/12_super_admin.md` (FR-ADMIN-\*).
> **Date:** 2026-06-16. **Source request:** PM (Nave) — screenshots of `/admin/admins` ("צוות ניהול") + redesign brief.

---

## 1. Problem statement

The current `(admin)/admins` screen (FR-ADMIN-015/016, shipped in P3.A2 + P3.A-Redesign) is a **flat list grouped by role**. The PM raised six concrete problems:

1. **Switch bug** — the "כולל מבוטלים" (include-revoked) toggle behaviour is unclear / appears broken.
2. **System-account leak** — on DEV, the `מנהל-על` (super_admin) group lists ~8 rows named `a1-reports-…` (report-channel system accounts) instead of real admins.
3. **Duplicate cards** — a user with two roles (e.g. `moderator` + `support`) renders as **two separate rows**. The PM wants **one card per user** carrying all their roles.
4. **No add/remove affordance** — it is not obvious how to grant or revoke a role.
5. **No link to the user account** — a card does not navigate anywhere; there is no cross-link between an admin card and the user's public profile.
6. **No hierarchy** — there is no manager↔volunteer tree, no way to assign someone to their direct manager, and no notion of "level in the org".

### Product model (confirmed with PM, 2026-06-16)

- **Karma Community is itself an organisation** that uses the platform. The app's "צוות ניהול" is the management team of *that* org. It is an org like any other — it just holds **extra platform permissions** (e.g. remove posts) that other orgs' managers do not.
- **The `super_admin` is above all orgs** — the manager of the whole platform (tree level `0`).
- **Tree is built from an explicit direct-manager link** (`manager_id`), not inferred from role alone. **Level = depth from the root** (`super_admin` = 0, org admin = 1, sub-manager = 2, … volunteers are leaves). The level is shown on every node.
- **Tree visibility ≠ permissions.** Every member sees the **full management tree of their own org**; `super_admin` sees **all** org trees. What differs by role/level is the **set of allowed actions** and the **visibility of sensitive fields**, not whether the tree is shown.
- **Public "About" screen** shows the **full tree of all orgs** to everyone (even logged-out). Sensitive personal fields (e.g. address) are **gated by the management chain**: only people *above* a node in its chain see its sensitive fields; a random volunteer browsing into another org's manager card sees the public subset only.
- **Tree must be collapsible at every node** and comfortable to navigate on both mobile and desktop.

---

## 2. Key codebase findings (grounding the plan)

| Area | Current state | Implication |
|------|---------------|-------------|
| **Org entity** | **No `organizations` table.** `admin_role_grants.scope_org_id` is a nullable `uuid` with **no FK** (migration `0173` comment: "organizations table lands in a follow-up"). `org_applications` (migration `0168`) holds *applications to become an org*, not orgs. | Multi-org tree needs a real `organizations` table — Phase 2. |
| **Manager link** | None. Hierarchy exists only as `can_grant_role(...)` authority logic in `0173`. | Need new `manager_id` (self-FK on `admin_role_grants` or a dedicated edge) — Phase 2. |
| **Role store** | `admin_role_grants` (migration `0112` + `0173`): `grant_id, user_id, role, scope_org_id, granted_by, granted_at, revoked_at, revoked_by`. Partial-unique single-super_admin index. RLS: select-only from client, writes via SECURITY DEFINER RPC. | Extend, do not replace. |
| **Roles enum** | `super_admin, admin, moderator, support, operator, operators_manager, org_admin, org_manager, org_employee, volunteer_manager, org_volunteer` (`@kc/domain` `AdminRole`). | Tree spans all roles; UI today only renders 3. |
| **Permissions** | `PERMISSION_MATRIX` in `@kc/domain/admin/AdminPermission.ts` — **flat** (role → permissions), no level/scope awareness. `admins.view = [super_admin, moderator]`, `admins.grant_role/revoke_role = [super_admin]`. | Phase 2 adds scope/level-aware checks server-side; the flat matrix stays for platform-wide perms. |
| **List RPC** | `admin_list_admins(p_include_revoked)` (migration `0173`) returns one row **per grant** incl. `scope_org_id`, `last_seen_at` (from `devices`), `granted_by_display_name`. | The duplicate-card issue is a **client-side grouping choice** in `buildSections()`, not the RPC. Unification is FE-only (Phase 1). |
| **Admins screen** | `app/apps/mobile/app/(admin)/admins/index.tsx` — `buildSections()` groups by role → header + N rows. `Switch` for include-revoked. `GrantRoleModal` for grant. `AdminRow` renders name + last-seen + granted-by, optional revoke. | Rebuild around a per-user card; reuse hooks/RPCs. |
| **`a1-reports-…` leak** | Likely DEV seed: those report-channel users hold real `super_admin` grants in the dev DB (or are surfaced because `admin_list_admins` joins all grants). **To confirm in Phase 1** via `execute_sql` on the dev project before deciding fix (data cleanup vs. RPC filter). | Phase 1 investigation item. |
| **Profile screens** | Public profile: `app/apps/mobile/app/user/[handle].tsx`. Own profile tab: `app/(tabs)/profile`. | Phase 1 adds the admin-card ↔ profile cross-links here. |
| **About screen** | `app/about.tsx` → `src/features/about-landing/AboutLandingScreen.tsx`. Public route. | Phase 3 mounts the public org tree here (or a dedicated `/about/team` sub-route). |
| **Admin nav** | `(admin)` group already has `admins, audit, crm, money, org-approvals, posts, reports, tasks, time, users`. Responsive nav via `useBreakpoint` (P3.A-Redesign). | Reuse `AdminScreenHeader`, `@kc/ui` tokens, nav variants. |

---

## 3. New / amended FRs (spec deltas)

These land in `spec/12_super_admin.md` (and `spec/14_responsive_desktop.md` for the responsive AC), each in the phase that implements it:

- **FR-ADMIN-022** — *Unified admin card + profile cross-links.* One card per user (all roles as badges); card → admin-detail screen → public profile; public profile of any role-holder → its admin-detail screen. (Phase 1)
- **FR-ADMIN-023** — *Bug fixes.* Include-revoked toggle behaviour spec'd + system-account exclusion from the admins list. (Phase 1)
- **FR-ADMIN-024** — *Organisations entity.* `organizations` table + FK from `admin_role_grants.scope_org_id`; Karma Community seeded as the platform org. (Phase 2)
- **FR-ADMIN-025** — *Direct-manager link + hierarchy tree.* `manager_id` on grants; assign-manager RPC + UI; collapsible tree with level badges; org-scoped tree visibility (own org full tree; super_admin all). (Phase 2)
- **FR-ADMIN-026** — *Public org tree (About) + field-level privacy.* Public full multi-org tree; sensitive fields gated by management chain. (Phase 3)

Any contradiction surfaced during implementation pauses per `CLAUDE.md` §2 and is resolved with the PM before coding.

---

## 4. Phase 0 — this PR (planning only)

**Scope:** documentation only. No runtime code.

- This plan doc.
- `BACKLOG.md`: add `P3.A-Tree` umbrella row + three sub-rows (`P3.A-Tree.1/.2/.3`) as `⏳ Planned`, linked to this plan.
- No spec edits yet (FR text lands per-phase so the spec never describes unshipped behaviour).

**Exit:** PR merged to `dev`. Then Phase 1 starts.

---

## 5. Phase 1 — Bug fixes + unified card + profile links + responsive

**No schema change.** FE + i18n + a possible RPC tweak only if the `a1-reports` leak proves to be RPC-side.

### 5.1 Investigate the `a1-reports-…` leak (first task)
- Run read-only SQL on dev (`mcp__supabase__execute_sql`): `select user_id, role, scope_org_id from admin_role_grants g join users u using(user_id) where u.display_name ilike 'a1-reports-%';`
- **If they hold real grants** → DEV seed cleanup migration / manual revoke (dev project only, per §13 authority), and add a guard so system/test accounts are not grantable.
- **If they are surfaced by a join bug** → fix `admin_list_admins` to exclude system accounts.
- Document the root cause in the PR body.

### 5.2 Unified per-user card (replaces `buildSections` role grouping)
- New domain view-model `AdminPerson` (derived, not stored): `{ userId, displayName, avatarUrl, shareHandle, roles: AdminRole[], grants: AdminGrant[], lastSeenAt, isFullyRevoked }`. Pure function `groupGrantsByUser(grants): AdminPerson[]` in `@kc/domain` (+ unit tests: multi-role user, revoked-only user, ordering).
- `useAdminsList` stays; add a memoized selector to the screen producing `AdminPerson[]`.
- New `AdminPersonCard` component (replaces per-grant `AdminRow` in the list): avatar, name, **role badges** (all roles), last-seen, tap → admin-detail. Revoke moves to the detail screen (per-role) to keep the card clean. Keep `AdminRow` for the detail screen's per-grant list.
- Sorting/sectioning: optionally keep role sections but a user appears **once** under their highest role; or a flat sorted list with badges. Default: **flat list sorted by highest role then last-seen** (simpler, matches "one card"). Confirm visual in PR screenshots.

### 5.3 Admin-detail screen
- New route `(admin)/admins/[userId].tsx`: header (avatar, name, handle), **all roles** with per-role `grantedAt / grantedBy / revokedAt` and a per-role **revoke** action (RBAC-gated), a **"view public profile"** button → `/user/[handle]`. Placeholder section "מנהל ישיר" + "כפופים" rendered as *coming in Phase 2* (empty state), so the IA is stable.
- Data: reuse `admin_list_admins` output filtered to the user, or add a thin `admin_user_detail(p_user_id)` RPC if richer fields are needed (decide during build; prefer reuse).

### 5.4 Profile → admin-detail cross-link
- On `user/[handle]` (and own profile), if the viewed user has ≥1 admin grant **and** the viewer has `admins.view`, show a "כרטיс ניהול" link → `(admin)/admins/[userId]`. Needs a lightweight "does this user have admin grants" read (extend profile query or a cheap RPC `user_admin_roles(p_user_id)`).

### 5.5 Switch fix + grant affordance
- Audit the `includeRevoked` Switch: confirm RTL placement, label association, and that toggling actually refetches (it calls `useAdminsList(includeRevoked)` → key change → refetch; verify no stale memo). Replace with a clearer labelled control (e.g. segmented "פעילים / כולל מבוטלים") if the bug is perceptual. Document the exact defect found.
- Make `+ הוסף לתפקיד` (grant) visually prominent and ensure revoke is discoverable on the detail screen.

### 5.6 Responsive + design alignment
- Card + detail use `@kc/ui` `makeUseStyles` tokens, `AdminScreenHeader`, `shadow`, RTL helpers — match the rest of the app (not a bespoke admin look).
- Desktop (`useBreakpoint` ≥ 768): list becomes a responsive card grid / wider rows; detail uses a two-column layout. Mobile stays single-column. Satisfies `spec/14_responsive_desktop.md`.

### 5.7 Tests / gates
- Domain: `groupGrantsByUser` unit tests. Application: unchanged. Mobile: render tests for `AdminPersonCard` (multi-role badges, revoked styling) and the detail screen permission gating.
- `pnpm typecheck && pnpm test && pnpm lint` green from `app/`.

### 5.8 Phase 1 ACs (→ FR-ADMIN-022/022)
- AC1: each user appears **once** in the admins list with all roles as badges.
- AC2: tapping a card opens the admin-detail screen; from there a button opens the public profile.
- AC3: a role-holder's public profile shows a link back to their admin-detail (viewer must hold `admins.view`).
- AC4: include-revoked control toggles the list reliably; default shows active only.
- AC5: report-channel/system accounts no longer appear in the admins list (root cause documented).
- AC6: layout uses app design tokens and is responsive at ≥ 768px.

---

## 6. Phase 2 — Organisations + direct-manager + hierarchy tree

**Schema change (BE lane).** Migrations in `supabase/migrations/`, ship with their consumers.

### 6.1 Organisations entity (FR-ADMIN-024)
- `organizations` table: `org_id uuid pk`, `name`, `slug/handle`, `created_at`, `is_platform boolean` (Karma Community = true), plus minimal metadata. RLS: public read of non-sensitive fields; writes via RPC (super_admin / org_admin).
- Backfill: insert Karma Community as the platform org; set existing org-scoped grants' `scope_org_id` to it where appropriate.
- Add FK `admin_role_grants.scope_org_id → organizations(org_id)` (the FK deferred in `0173`).
- Optionally wire `org_applications.approved` → creates an `organizations` row (or leave to a follow-up; note in TECH_DEBT).

### 6.2 Direct-manager link (FR-ADMIN-025)
- Add `manager_grant_id uuid null references admin_role_grants(grant_id)` (or `manager_user_id` scoped per org) on `admin_role_grants`. Decide edge granularity: **per-grant manager** (a person can sit under different managers in different orgs) is the correct model given multi-org. Document the choice in `DECISIONS.md` (new `D-*`).
- Invariants: no cycles (a node cannot be its own ancestor — enforce in the assign RPC via recursive check); a manager must be in the **same org** (or be `super_admin` for the platform root); level = recursive depth from `super_admin`.
- RPC `admin_set_manager(p_grant_id, p_manager_grant_id)` (SECURITY DEFINER, authority-checked via `can_grant_role`/chain), audit-logged. RPC `admin_org_tree(p_org_id default null)` returning the tree (or adjacency list) with computed `level`, RBAC-filtered (caller's org subtree; super_admin all).
- Helper SQL: recursive CTE for subtree + ancestor checks; expose `is_ancestor(grant_a, grant_b)` for Phase 3 privacy gating.

### 6.3 Domain / application
- Domain: `OrgTreeNode { grant, person, level, children }`, pure `buildTree(adjacencyRows): OrgTreeNode[]` + cycle/level invariants + tests.
- Application: `IOrgHierarchyRepository` (`getOrgTree`, `setManager`), `GetOrgTreeUseCase`, `SetManagerUseCase`. Infra: `SupabaseOrgHierarchyRepository`.

### 6.4 Mobile
- `OrgTree` component: collapsible nodes (expand/collapse per node, persistent local state), **level badge** per node, role badges, indentation/connectors, RTL-aware, virtualised for large trees. Desktop: wider canvas; mobile: indented accordion.
- Admin-detail screen "מנהל ישיר" + "כפופים" sections become live; add an **assign-manager** picker (search within org) gated by authority.
- Org switcher for super_admin (choose which org's tree to view); org_admin and below are pinned to their org.

### 6.5 Permissions
- Server-side: every tree mutation re-checks authority via `can_grant_role` + chain membership. Client gating is convenience only.
- Tree **read** is allowed for any member within their org (full org tree) and super_admin globally — independent of the action permissions.

### 6.6 Phase 2 ACs (→ FR-ADMIN-024/024)
- AC1: `organizations` exists; Karma Community seeded; `scope_org_id` FK enforced.
- AC2: each grant can have a direct manager; cycles rejected; level computed correctly (super_admin=0).
- AC3: admins screen renders a collapsible tree with level badges; each node collapses independently.
- AC4: a member sees their org's full tree; super_admin can view any org; org_admin cannot view other orgs in the portal.
- AC5: assign/clear manager works with authority checks + audit; reflected in the tree without full reload.

---

## 7. Phase 3 — Public About tree + field-level privacy

### 7.1 Public tree (FR-ADMIN-026)
- Public route (logged-out allowed), e.g. `/about/team`, mounted from `AboutLandingScreen` or a dedicated screen. Renders the **full multi-org tree** (all orgs) using the same `OrgTree` component in a read-only public variant.
- Public read RPC `public_org_tree()` returning **non-sensitive** fields only (display name, role, org, level, avatar) — never addresses/contact for nodes the caller isn't above.

### 7.2 Field-level privacy
- Sensitive fields (address, phone, private contact) returned **only** when the caller `is_ancestor` of the target node (or is super_admin). Enforced **server-side** in the detail RPC, not just hidden in UI.
- Public admin-detail for a node shows the public subset; an authorised ancestor (or super_admin) sees the full set. The Phase 1 admin-detail screen gains a "public view" parity check.

### 7.3 Phase 3 ACs (→ FR-ADMIN-026)
- AC1: `/about/team` is reachable logged-out and shows the full tree of all orgs, collapsible, with level badges.
- AC2: a non-privileged viewer opening any node sees public fields only; addresses/contact are absent from the payload (not just hidden).
- AC3: an ancestor in the node's chain (or super_admin) sees the sensitive fields.
- AC4: privacy enforced server-side (verified by an integration test hitting the RPC as different callers).

---

## 8. Sequencing, ownership, risks

| Phase | PR | Lanes | Migrations | Risk |
|-------|----|-------|-----------|------|
| 0 | this | docs | none | none |
| 1 | next | FE (+1 BE if leak is RPC-side) | none | low — UI + read paths; leak fix may touch dev data |
| 2 | after 1 | BE + FE (contract commit for `IOrgHierarchyRepository`) | `organizations`, `scope_org_id` FK, `manager_grant_id`, RPCs | medium — schema + recursion; backfill must be backward-compatible (release guard) |
| 3 | after 2 | BE + FE | public/detail RPCs, privacy gating | medium — privacy correctness is security-sensitive; integration tests required |

- **Backward-compat:** all Phase 2/3 migrations additive; no destructive SQL (or `migration-safety: allow` with justification). Sync triggers for `users.is_super_admin` must keep working.
- **Parallel-agents:** BE owns `supabase/**` + `infrastructure-supabase/**`; FE owns `apps/mobile/**` + `ui/**`; shared `domain`/`application` contracts land as `(contract)` commits (`CLAUDE.md` §9).
- **File caps:** tree + detail screens must stay ≤ 300 lines / ≤ 3 indent levels — split into subcomponents early.

---

## 9. SSOT updates per phase (same change-set as code)

Each phase PR must: flip its `BACKLOG.md` row to ✅, add/extend the FR text in `spec/12_super_admin.md` (+ `14_responsive_desktop.md` for AC6), record any product/architecture fork in `DECISIONS.md` (manager-edge granularity → new `D-*`), and open/close `TECH_DEBT.md` items (FE `TD-100..149`, BE `TD-50..99`).
