# GloWe Admin Portal — Comprehensive Test Plan

> **Status:** 🟡 Design (2026-06-29) — companion to
> `docs/SSOT/archive/superpowers/specs/2026-06-29-glowe-admin-portal-design.md`.
> **Scope:** FR-GLOWE-017..022. Covers unit, DB-regression, and end-to-end layers.

## 1. Philosophy & layers

The GloWe admin portal spans three layers, each tested where the risk lives:

| Layer | What lives there | Test type | Runner |
|-------|------------------|-----------|--------|
| **Backend (RPC + RLS)** | Authority gates, state transitions, audit | DB regression | pgTAP-style `supabase/tests/*.sql` |
| **Pure JS logic** | Mappers, guards, count/format helpers extracted from `app.js` | Unit | `vitest` |
| **Frontend journeys** | Reviewer flows in the browser | End-to-end | Playwright (`tests/e2e/`) |

**Security boundary = the RPC.** Every privileged action is gated server-side by
`admin_assert_role`; the highest-value tests are the DB regression tests proving non-reviewers
are blocked (`42501`) and reviewers succeed. Client gating is UX only and is covered by E2E.

**Risk note (R3 from the design):** `glowe-web` is vanilla JS with no harness today. To make logic
unit-testable, extract pure functions (no DOM, no network) into a `app/apps/glowe-web/js/admin/`
module set (e.g. `reviewQueue.js`, `dashboardCounts.js`, `memberStatus.js`) that `vitest` can import.
DOM wiring stays thin and is covered by E2E instead.

## 2. DB regression tests (`supabase/tests/*.sql`)

Pattern mirrors the existing `supabase/tests/0206_glowe_org_approval.sql`: seed actors, assert each
gate and transition, roll back. New files per migration slice:

### 2.1 `glowe_admin_remove_content` (FR-GLOWE-020)
- T1 — non-reviewer (anon + plain authenticated) → `42501` on remove and on dismiss.
- T2 — reviewer (`moderator`) removes a `glowe_post` → `status = 'removed'`, report → `actioned`,
  `reviewed_by`/`reviewed_at` stamped.
- T3 — reviewer removes a `glowe_opportunity` (after `status` column added) → excluded from the
  public-listing predicate.
- T4 — proactive remove (no `p_report_id`) succeeds and is idempotent (second call is a no-op, not
  an error).
- T5 — unknown target id → `P0002`; bad `p_type` → `22023`.
- T6 — removed content no longer returned by the public read path.

### 2.2 `glowe_admin_dashboard_counts` (FR-GLOWE-018)
- T1 — reviewer-gated (`42501` for non-reviewers).
- T2 — returns the five counts; values match hand-seeded fixtures (pending orgs, open reports,
  active members+orgs, upcoming opportunities, open wishes).
- T3 — counts exclude `removed`/`rejected` rows correctly.

### 2.3 Member block/unblock (FR-GLOWE-021)
- T1 — reviewer suspends a GloWe individual → reversible state set; unsuspend restores.
- T2 — block of an approved org → org drops to view-only (cannot create content) and is restorable.
- T3 — non-reviewer blocked (`42501`). Audit row written (reuse `audit_events`
  `suspend_user`/`unsuspend_user`).

### 2.4 `featured` toggle (FR-GLOWE-022)
- T1 — reviewer toggles `glowe_opportunities.featured`; non-reviewer blocked.
- T2 — client (`authenticated`) cannot set `featured` directly via PATCH (RLS/guard), only via RPC.

### 2.5 Regression guard for the existing approval RPCs (FR-GLOWE-019)
- Re-confirm `0206` coverage still holds after the portal relocation (no behavioural change to
  `glowe_set_org_approval` / `glowe_list_pending_orgs`).

## 3. Unit tests (`vitest`)

Beside each extracted pure module, in `app/apps/glowe-web/js/admin/__tests__/` (add a minimal
`vitest` config to the `@kc/glowe-web` workspace). Run: `pnpm --filter @kc/glowe-web test`.

### 3.1 `reviewQueue` (FR-GLOWE-019/020)
- Maps a raw `glowe_reports` / pending-org row to the view-model the UI renders (labels, target
  link, reason text).
- Sorts oldest-first; groups by status; filters `open` for the queue.
- Renders the rejection note when an org is `rejected`.

### 3.2 `dashboardCounts` (FR-GLOWE-018)
- Folds the dashboard RPC payload into card view-models; zero-state ("0") renders without error.
- Deep-link target per card is correct.

### 3.3 `memberStatus` (FR-GLOWE-021)
- Pure status machine: `active → blocked → active`; org `approved → blocked → approved`.
- Block reason required for orgs; optional for individuals.

### 3.4 `accessGate` (FR-GLOWE-017)
- Given a session/role payload, returns visible-nav vs redirect. Reviewer sees the portal;
  non-reviewer is redirected. (Pure decision function; DOM redirect itself is E2E.)

### 3.5 i18n keys (FR-GLOWE-017, bilingual He/En)
- Every admin string key present in both `en` and `he` dictionaries; no missing-key fallbacks for
  portal copy (snapshot of key sets).

## 4. End-to-end tests (Playwright, `tests/e2e/journeys/`)

The current E2E harness targets the KC mobile-web app. Add a GloWe target: a Playwright project
whose `baseURL` is the GloWe build (`/glowe`), with a reviewer auth fixture
(reuse `tests/e2e/journeys/auth.setup.ts` + `lib/supabaseSession.ts`, seeded with a
`super_admin`/`moderator` session). Use `data-testid` hooks on portal elements.

### 4.1 `glowe-admin-access.spec.ts` (FR-GLOWE-017)
- Reviewer navigates to `/glowe` admin → portal shell + sidebar render.
- Non-reviewer (plain GloWe member) hitting the admin URL → redirected to GloWe home, no portal.

### 4.2 `glowe-admin-dashboard.spec.ts` (FR-GLOWE-018)
- Dashboard renders five metric cards; each shows a number (or 0) and deep-links to its section.

### 4.3 `glowe-admin-org-verify.spec.ts` (FR-GLOWE-019)
- Seed a pending org → it appears in Organisations queue with submitted details.
- Approve → leaves the queue; org gains publish ability (verified).
- Reject with a note → leaves the queue; note persisted and shown.

### 4.4 `glowe-admin-moderation.spec.ts` (FR-GLOWE-020)
- Seed a reported post → appears in Content queue.
- Remove content → leaves the queue; target no longer visible in public listing.
- Dismiss a report → report closes; target still visible.
- Proactive remove from a target with no report.

### 4.5 `glowe-admin-members.spec.ts` (FR-GLOWE-021)
- Search a member → block (reversible) → member can no longer create content → unblock → restored.

### 4.6 `glowe-admin-curation.spec.ts` (FR-GLOWE-022)
- Toggle `featured` on an opportunity → it surfaces in the featured ordering on the public board.

### 4.7 Bilingual smoke (FR-GLOWE-017)
- Switch interface He ↔ En in the portal → nav + dashboard cards re-render in the chosen language
  and direction (RTL for He), no half-translated state.

## 5. Coverage matrix (FR → layers)

| FR | DB | Unit | E2E |
|----|----|------|-----|
| 017 Shell + RBAC gate | — (RPC gates per-action) | accessGate, i18n | access.spec, bilingual |
| 018 Dashboard | dashboard_counts | dashboardCounts | dashboard.spec |
| 019 Org verify | reuse 0206 + regression guard | reviewQueue | org-verify.spec |
| 020 Moderation | remove_content | reviewQueue | moderation.spec |
| 021 Members | block/unblock | memberStatus | members.spec |
| 022 Curation | featured toggle | — | curation.spec |

Every FR has at least one DB **or** E2E test that exercises the real authority gate, plus unit
coverage for any non-trivial pure logic.

## 6. CI integration

- **DB tests** run in the existing Supabase test job (the `supabase/tests/*.sql` runner).
- **Unit tests** join the monorepo `pnpm test` (turbo) via the new `@kc/glowe-web` vitest config.
- **E2E** runs in the Playwright workflow against a deployed/preview GloWe build; the GloWe project
  is added alongside the KC project. Reviewer session seeded from secrets, never committed.
- Gates: all three green before merge to `dev` (per CLAUDE.md §6 pre-push gates).

## 7. Manual / exploratory checklist (pre-merge)

- [ ] Reviewer on phone width: sidebar collapses, RTL correct in Hebrew.
- [ ] Non-reviewer cannot see or reach any admin URL (verified in a real browser, not just unit).
- [ ] Approving/rejecting an org reflects immediately in the public Organisations directory.
- [ ] Removed content disappears from every public surface (board, search, profile).
- [ ] Blocked member sees the view-only notice on every create entry point.
- [ ] No Supabase/backend implementation detail leaks into the admin UI (per FR-GLOWE-004 AC1 ethos).

## 8. Definition of done (testing)

A GloWe admin portal slice is "done" only when: its DB regression file passes, its extracted logic
has unit tests (happy + ≥1 boundary), its E2E journey passes, the coverage-matrix row is satisfied,
and `pnpm typecheck && pnpm test && pnpm lint` are green.
