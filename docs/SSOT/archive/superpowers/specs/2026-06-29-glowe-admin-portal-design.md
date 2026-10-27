# GloWe Admin Portal — Design

> **Status:** 🟡 Design (brainstormed 2026-06-29) — awaiting PM review before plan.
> **Prefix:** `FR-GLOWE-017..022` (new). Supersedes the admin-surface ACs of `FR-GLOWE-003 AC4` and `FR-GLOWE-015 AC4`.
> **Related:** `docs/SSOT/spec/17_glowe_frontend.md`, `docs/SSOT/spec/12_super_admin.md` (KC admin portal infra), `DECISIONS.md` D-61 (GloWe-on-KC convergence).
> **Companion:** `docs/SSOT/archive/superpowers/specs/2026-06-29-glowe-admin-portal-test-plan.md` (unit + DB + E2E test plan).

## 1. Essence (why)

GloWe and KC are **two projects of the same organisation**. KC provides the shared
infrastructure — one Supabase project, one `auth.users` identity, one RBAC + audit
backbone. KC already has a heavily-invested admin portal (`apps/mobile/app/(admin)/`):
RBAC role grants, an `organizations` entity with a manager hierarchy, an audit log, and
moderation RPCs.

GloWe today has only a **thin admin surface** (`apps/glowe-web/pages/admin.html`) that does
org approval and a planned reports stub. The goal: give GloWe a **proper, tailored admin
portal** that **reuses KC's backend infrastructure** (RBAC, audit, org model, RPCs) but ships
its **own GloWe-branded frontend** scoped to GloWe's governance jobs — not a clone of KC's
internal-ops portal.

## 2. The org model (locked)

```
Level 0 — The organisation (Karma Community)        ← organizations row, is_platform = true
          two projects:  KC (mobile app)  |  GloWe (glowe-web)   ← PRODUCT dimension (a filter, not an org node)
              │
              ▼
Level 1 — Registered organisations (NGOs) under the platform   ← organizations rows (non-platform)
              with org_admin / org_manager / org_employee scoped roles (already in schema, migration 0173)
```

- **KC ↔ GloWe is a *product* axis**, orthogonal to the org tree. The GloWe admin portal is a
  product-scoped frontend; it does not introduce a new tenant concept.
- **Registered organisations are the existing org tree.** The org-scoped roles
  (`org_admin`, `org_manager`, `org_employee`) and the `organizations` table already exist
  (`0173`, `0203`) and give us Level-1 separation almost for free — used later for the
  org-self-service portal (out of MVP scope, §10).

## 3. Architecture decision — reuse infra, new frontend

| Layer | Decision | Detail |
|-------|----------|--------|
| **DB / RBAC / audit** | **Reuse** | `admin_role_grants`, `organizations`, `has_admin_role` / `admin_assert_role`, `audit_events`, KC's `suspend_user` / `unsuspend_user` flow. |
| **Existing GloWe RPCs** | **Reuse** | `glowe_set_org_approval`, `glowe_list_pending_orgs` (migration `0206`). |
| **New backend** | **Add** | GloWe-specific RPCs: dashboard counts, content removal (`glowe_admin_remove_content`, per FR-GLOWE-015), member block/unblock, `featured` toggle. Each `SECURITY DEFINER` + `admin_assert_role`. |
| **Frontend** | **Build new** | A dedicated **GloWe admin portal inside `apps/glowe-web`** (vanilla JS/HTML/CSS, GloWe-branded), mirroring KC's portal IA quality. Replaces the thin `admin.html`. |
| **KC `(admin)` RN screens** | **Do not reuse** | They are RN/expo-router, KC-branded, and carry KC-internal-ops sections. |
| **`packages/application` TS use-cases** | **Do not reuse** | `glowe-web` is intentionally outside the TS clean-arch packages (FR-GLOWE-001 AC6). The correct reuse boundary for `glowe-web` is the Supabase RPC layer. |

**Rationale.** "Infrastructure" = the backend plumbing (RBAC, audit, org model, RPCs), which is
the real investment and is already shared at the Supabase level (`glowe-web` consumes it today
for org approval). Building a separate React app to reuse the TS use-cases would fragment
GloWe's single vanilla frontend and violate YAGNI. Logged as **D-62** (see §9).

## 4. Who is the GloWe admin — Job-to-be-Done

> When **harmful, low-quality, or unverified content/actors appear in GloWe**, the reviewer wants
> to **verify serious organisations, keep the community clean, and see GloWe's health at a glance**,
> so they can **protect trust without becoming a bottleneck**.

Reviewers are KC platform roles **`super_admin` / `moderator`** (the set already gating the GloWe
approval RPCs). No new role is introduced for MVP. Authority is server-enforced via
`admin_assert_role` — never client-trusted.

## 5. Scope — in / out

**In (MVP):**
- **Dashboard** — health at a glance (the 5 metrics, §6.1).
- **Verify organisations** — the existing approve/reject flow, **moved into the new portal**.
- **Content moderation** — *reactive*: a reports queue + remove/dismiss.
- **Member management** — reversible block/unblock of individuals and organisations.
- **Curation** — toggle `featured` on opportunities (the GloWe-specific editorial job).

**Out (deliberately excluded — "tailored ≠ clone"):**
- KC-internal team-ops: `tasks`, `CRM`, `time` (timesheets), `money` (finance ledger),
  `surveys`. These are KC-company operations, irrelevant to GloWe community governance.
- **Approve-before-publish** for content. Decided **reactive** (the *organisation* is the gate;
  content is moderated after the fact). Avoids a single-reviewer bottleneck.
- **Audit viewer** in the GloWe portal — backend keeps auditing (per-row `org_reviewed_*` +
  reuse of `audit_events`), but a GloWe-facing audit screen is **Phase 2** (PM: "not urgent").
- **RSVP / applications oversight** — Phase 2 (PM: "future feature").
- **Org self-service portal** (org_admin sees only their slice) — far-future (§10).
- **Outbound email** — see §8.

## 6. Information architecture

A left sidebar (RTL-aware) mirroring KC's portal pattern, scoped to GloWe jobs:

```
GloWe Admin
├── Dashboard      (לוח בקרה)      — metric cards + quick links
├── Organisations  (אישור ארגונים) — pending review queue + approve/reject
├── Content        (תוכן)          — reports queue + remove/dismiss + featured toggle
└── Members        (חברים)         — search + block/unblock
```

### 6.1 Dashboard metrics (v1 — all five)
1. Organisations pending approval (`glowe_list_pending_orgs` count).
2. Open content reports (`glowe_reports.status = 'open'`).
3. Active members + organisations.
4. Upcoming events/opportunities.
5. Open needs/wishes.

Each card deep-links into its section. Counts come from one batched dashboard RPC
(`glowe_admin_dashboard_counts`) to keep the home screen a single round-trip.

### 6.2 Access gate
The portal route is gated client-side (visible only when the session passes a reviewer check)
**and** server-side (every RPC calls `admin_assert_role`). Client gating is UX only; the RPC
gate is the security boundary. A non-reviewer hitting any URL is redirected to the GloWe home.

## 7. Content governance model (reactive)

- **Report** (already specced, FR-GLOWE-015 AC1–AC3): any logged-in user reports a content card
  → `glowe_reports`. Duplicate-guarded.
- **Review** (this design): the portal's **Content** section lists open reports
  (`glowe_reports`), each linking to the target, with **Dismiss** and **Remove content**.
- **Remove**: `glowe_admin_remove_content(p_type, p_id, p_report_id)` sets the target's
  `status = 'removed'` (requires a `status` column on `glowe_opportunities`) and marks the report
  `actioned`. Removed content drops from all public listings.
- **Proactive removal**: the same Remove action is reachable from any content target directly
  (no report required) — satisfies "proactive too" without an approve-before-publish gate.
- **Curation**: a `featured` toggle on opportunities (column already exists) — the quality lever
  that replaces a publish gate.

## 8. Member management & email

- **Block = reversible.** Maps to KC's existing **`suspend_user` / `unsuspend_user`** (reversible)
  rather than permanent `ban_user`. Individuals and org owners alike. An org additionally drops to
  view-only (loses publish) on block.
  - *Open design item:* the `glowe_profiles.approval_status` enum (`not_required|pending|approved|rejected`)
    has no reversible "blocked" state and the approval RPC only allows `pending → decided`.
    Blocking an approved org needs either a new status or a separate block flag + an unblock path.
    Resolved during planning; flagged here so it is not missed.
- **Rejection reason / email (PM decision "ד"):** for now, **no outbound email**. The rejection
  reason is stored (`org_review_note`) and shown in-app to the org. The code path exposes a single
  **`notifyOrgDecision()` seam** (no-op today) so a real email provider can be wired later without
  touching call sites. A tech-debt row is logged for the outbound-email infrastructure.

## 9. New decisions to record (`DECISIONS.md`)

- **D-62 — GloWe admin portal: reuse KC backend infra, ship a new GloWe-branded vanilla frontend.**
  Rationale + alternative-rejected in §3.
- **D-63 — Reactive content governance for GloWe.** The organisation is the trust gate; content is
  moderated after publish (reports + proactive remove) + `featured` curation. No approve-before-publish.

## 10. Phasing

- **Phase 1 (MVP, this design):** portal shell + RBAC gate; Dashboard; Organisations (moved from
  `admin.html`); Content (reports + remove/dismiss + featured); Members (block/unblock). Bilingual
  He/En. Full test coverage per the companion test plan.
- **Phase 2 (post-MVP):** GloWe-facing audit viewer; RSVP/applications oversight; richer analytics.
- **Far-future:** org self-service portal — `org_admin` sees only their org's slice, reusing the
  same RBAC-filtered components (design-for-the-horizon: Phase-1 queries are written org-scope-aware
  so the later org portal reuses them).

## 11. New FR IDs (to add to `spec/17_glowe_frontend.md` on implementation)

| FR | Title |
|----|-------|
| FR-GLOWE-017 | Admin portal shell, navigation & RBAC gate |
| FR-GLOWE-018 | Admin dashboard (5 health metrics) |
| FR-GLOWE-019 | Organisation verification (relocated from `admin.html`; supersedes FR-GLOWE-003 AC4) |
| FR-GLOWE-020 | Content moderation — reports queue + remove/dismiss + proactive remove (supersedes FR-GLOWE-015 AC4–AC5) |
| FR-GLOWE-021 | Member management — reversible block/unblock |
| FR-GLOWE-022 | Curation — `featured` toggle on opportunities |

## 12. Risks & open items

- **R1 — Block semantics for orgs** (§8 open item): needs a reversible status. Resolve in plan.
- **R2 — `glowe_opportunities.status`** column does not exist yet (FR-GLOWE-015 AC5 noted this);
  the remove RPC depends on it. Migration in the same slice.
- **R3 — `glowe-web` is vanilla JS** with no test harness today. The test plan must stand up an
  E2E target for the GloWe portal (Playwright) plus DB-level pgTAP for the new RPCs; unit-level JS
  logic should be extracted into small pure helpers that can be unit-tested.
- **R4 — Scope creep**: PM has frozen GloWe MVP features. This portal **consolidates** existing
  planned admin surface (FR-GLOWE-003/015) rather than adding new product features — keep it that way.

## 13. Next step

On PM approval of this design + the companion test plan, invoke the writing-plans skill to produce
the phased implementation plan (`docs/SSOT/archive/superpowers/plans/`).
