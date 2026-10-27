# Documentation SSOT Cleanup — Design

| Field | Value |
| ----- | ----- |
| **Status** | ✅ Approved (2026-07-22) |
| **Date** | 2026-07-22 |
| **Mapped to spec** | N/A (meta / tooling) |
| **Decisions locked** | GLOWE-only active scope; archive-only (no deletes); aggressive backlog trim; Quick Start in `CLAUDE.md` + thin `docs/README.md` pointer |
| **PM open items resolved** | P1.7/P1.8 **keep active**; P3.A-Tree.3 **pause**; KC-mobile-only open rows **pause** (see plan classification table) |

## Problem

The repo has **172 `.md` files**. New agents face:

1. **Stale references** — `SRS.md`, `CODE_QUALITY.md` cited in archive docs, audit follow-ups, and some tool rules but never authored at active paths.
2. **Noise** — `BACKLOG.md` is ~240 lines; ~140 rows are `✅ Done`; KC mobile work mixed with active GLOWE work.
3. **No entry map** — agents must infer read order from a 380-line `CLAUDE.md`.
4. **Contradictions** — `AGENTS.md` says KC mobile UI is out of scope; `BACKLOG.md` still lists KC mobile items as `🟡` / `⏳`.
5. **Unmarked historical trees** — `docs/SSOT/archive/superpowers/`, `PRD_V2_NOT_FOR_MVP/`, `docs/SSOT/archive/` look equally authoritative.

## Goals

| Goal | Success metric |
| ---- | -------------- |
| Minimal agent read path | New agent can start from `CLAUDE.md` §Quick Start in &lt; 2 minutes |
| Truth alignment | Zero broken SSOT pointers in active docs |
| Less noise | Active `BACKLOG.md` contains only `⏳` / `🟡` rows (~40–50 lines target) |
| Preserve history | All content archived, nothing deleted from git |

## Non-goals

- Rewriting feature specs (`docs/SSOT/spec/*.md` content)
- Merging `superpowers` design docs into domain specs
- Changing product scope beyond documenting GLOWE-only as the active frontend

---

## Approach comparison

| Approach | Summary | Pros | Cons |
| -------- | ------- | ---- | ---- |
| **1 — Labels only** | Add `HISTORICAL` banners; no moves | Lowest effort | Agents still index stale files; noise remains |
| **2 — Archive + trim (recommended)** | Move historical trees; trim backlog; fix pointers; Quick Start | Big noise reduction; one SSOT path | One-time migration PR; link updates |
| **3 — Full consolidation** | Merge superpowers into spec files; delete archive structure | Single tree | High drift risk; huge diff; violates archive-only |

**Recommendation:** **Approach 2**.

---

## Design

### 1. Agent entry path

#### 1.1 `CLAUDE.md` — new `## Quick Start (read this first)` section

Insert immediately after the APP VERSION banner (~40 lines):

1. **Product focus** — GLOWE web (`app/apps/glowe-web/**`) is the active MVP; KC mobile UI is paused (link `AGENTS.md`).
2. **Read order** — `BACKLOG.md` (open items only) → relevant `docs/SSOT/spec/{domain}.md` → scan `TECH_DEBT.md` for the area → check `DECISIONS.md` before structural changes.
3. **Do not use for implementation** — `docs/SSOT/archive/**`, `PRD_V2_NOT_FOR_MVP/**`, `docs/SSOT/archive/superpowers/**` (unless explicitly linked from an open backlog row or active spec).
4. **Pre-push gates** — from `app/`: `pnpm typecheck && pnpm test && pnpm lint`.
5. **Version** — bump `app/VERSION` PATCH on every PR to `dev`.

Existing sections below remain unchanged (git workflow, autonomous loop, parallel agents, etc.).

#### 1.2 `docs/README.md` (new, ~15 lines)

Human browsing map only — **not** a second SSOT:

```markdown
# Documentation map

**Agents:** start at [`CLAUDE.md`](../CLAUDE.md) §Quick Start.

| Active | Purpose |
|--------|---------|
| `SSOT/spec/` | Feature requirements (FR-*) |
| `SSOT/BACKLOG.md` | Open work queue |
| `SSOT/TECH_DEBT.md` | Active debt register |
| `SSOT/DECISIONS.md` | Architecture decisions |
| `SSOT/ENVIRONMENTS.md`, `OPERATOR_RUNBOOK.md`, `TESTING.md`, `RELEASE_CHECKLIST.md` | Ops |

| Historical (do not implement from) | Purpose |
|------------------------------------|---------|
| `SSOT/archive/` | Superseded SRS, backlog history, paused KC mobile |
| `superpowers/` | Past design docs and implementation plans |
| `../../PRD_V2_NOT_FOR_MVP/` | Post-MVP product vision |
```

#### 1.3 Update `CLAUDE.md` §1 spec-files table

Add missing active specs and fix numbering note:

| File | FR prefix |
| ---- | --------- |
| `14_karma.md` | FR-KARMA-* |
| `14_responsive_desktop.md` | FR-RESP-* |
| `17_glowe_frontend.md` | FR-GLOWE-* |
| `18_translation.md` | FR-TRANSLATE-* |

Note: two `14_*` files are intentional legacy numbering; do not renumber (breaks links).

---

### 2. Backlog restructure

#### 2.1 Active `docs/SSOT/BACKLOG.md`

**Keep only rows with status `⏳` or `🟡`.**

Sections after trim (reordered by priority):

| Section | Contents |
| ------- | -------- |
| **GLOWE** | Open GLOWE frontend items (e.g. `GLOWE.B`, `GLOWE.C`, `GLOWE.GUEST-B`) |
| **TRANSLATE** | Open translation items (e.g. `TRANSLATE-P3`) |
| **Shared backend / infra** | Open items that serve GLOWE or shared KC backend (migrations, Edge Functions, CI, E2E) |
| **P1 / P3 (shared)** | Open cross-cutting items still valid (e.g. `P1.7` public research if still `🟡`) |

**Move to archive (paused KC mobile):**

- All P0, P2 KC-mobile UI rows (`P2.23` visual unification, `P2.24` web Google sign-in, `RESP-*`, etc.)
- V2.1 / V3.0 rides UI rows (backend may stay in shared infra if open and GLOWE-relevant)
- Admin portal KC-mobile rows (`P3.A-Tree.3` etc.) unless GLOWE admin depends on them
- PERF-* rows targeting KC mobile (`PERF-4`, `PERF-5` if KC-only)

**Rule:** if an open row is KC-mobile-UI-only → move to `archive/BACKLOG-kc-mobile-paused.md` with status `⏸️ Paused (KC mobile out of scope per AGENTS.md)`.

#### 2.2 `docs/SSOT/archive/BACKLOG-history.md` (new)

All `✅ Done` rows from current `BACKLOG.md`, preserved verbatim (including GLOWE completed work). Header:

```markdown
# Backlog history (completed)

> **Historical.** For audit and traceability only. Do not pick work from this file.
> Active queue: [`../BACKLOG.md`](../BACKLOG.md).
```

#### 2.3 `docs/SSOT/archive/BACKLOG-kc-mobile-paused.md` (new)

All paused `⏳` / `🟡` KC-mobile-UI rows with `⏸️ Paused` status and link to `AGENTS.md`.

#### 2.4 Sprint Protocol

Update step 1: "Pick the highest `⏳` item in **active** `BACKLOG.md` (not archive files)."

---

### 3. Archive layout

```
docs/SSOT/archive/
├── README.md                          # NEW — index of what lives here and why
├── BACKLOG-history.md                 # NEW — all ✅ Done rows
├── BACKLOG-kc-mobile-paused.md        # NEW — paused KC mobile open items
├── SRS/                               # existing
├── PRD_MVP_CORE_SSOT/                 # existing
├── AUDIT_2026-05-10_full_codebase_review.md  # existing (if present)
└── superpowers/                       # MOVED from docs/SSOT/archive/superpowers/
    ├── specs/
    ├── plans/
    └── audits/
```

#### 3.1 `docs/SSOT/archive/README.md`

Sections:

- **What this is** — superseded or historical material; never implement from here unless a live backlog row links in.
- **Active SSOT** — pointer back to `CLAUDE.md` §Quick Start.
- **Contents index** — SRS, PRD archive, backlog history, paused KC mobile, superpowers designs, audit reports.
- **`CODE_QUALITY.md` note** — "Never authored. Architecture rules live in `CLAUDE.md` §5–§8 (`DECISIONS.md` D-*)."

#### 3.2 Move `docs/SSOT/archive/superpowers/` → `docs/SSOT/archive/superpowers/`

- `git mv` preserves history.
- Add `docs/SSOT/archive/superpowers/README.md` stub (3 lines): "Moved to `docs/SSOT/archive/superpowers/`."

#### 3.3 `PRD_V2_NOT_FOR_MVP/`

- **Keep at repo root** (referenced by `CONTRIBUTING.md`, rides spec, decisions).
- Add top-of-file banner to `PRD_V2_NOT_FOR_MVP/00_Index.md`:

  ```markdown
  > **NOT MVP — historical product vision.** Active requirements: `docs/SSOT/spec/`. Do not implement from this tree unless PM explicitly reopens scope.
  ```

#### 3.4 `docs/SSOT/archive/audit/`

- Move to `docs/SSOT/archive/audit/` (same archive-only policy).
- Leave stub `docs/SSOT/archive/audit/README.md` pointing to archive.

---

### 4. Truth fixes (active docs only)

| File | Change |
| ---- | ------ |
| `CLAUDE.md` | Quick Start + complete spec table |
| `AGENTS.md` | Add one line: "Paused KC mobile backlog: `docs/SSOT/archive/BACKLOG-kc-mobile-paused.md`" |
| `docs/SSOT/TECH_DEBT.md` | Replace megapixel "Last Updated" cell with `2026-07-22 (docs cleanup — see archive/BACKLOG-history for prior changelog prose)` |
| `docs/SSOT/AUDIT_2026-05-10_FOLLOWUP.md` | Move to archive; close TD-43/TD-44 notes as resolved in archive README |
| `docs/SSOT/DECISIONS.md` | No content change; already notes CODE_QUALITY absence |
| `.cursor/rules/*.mdc` | Already point to `CLAUDE.md` — no change |
| `CONTRIBUTING.md` | Add pointer to `docs/README.md` for doc map |

**Do not edit** user-level Cursor rules (outside repo). Note in archive README that external rules referencing `SRS.md` / `CODE_QUALITY.md` are stale.

---

### 5. KC mobile spec files

`docs/SSOT/spec/01_auth` through `14_responsive_desktop`, `15_rides`, etc. **stay active** — shared backend and GLOWE still depend on many FRs (auth, chat, translation, moderation).

Add a one-line header to KC-mobile-only specs (`14_responsive_desktop.md`):

```markdown
> **KC mobile UI — paused.** Backend/shared contracts may still apply to GLOWE. Active GLOWE spec: `17_glowe_frontend.md`.
```

Do **not** archive spec files (they remain the contract for backend behavior).

---

### 6. Implementation phases

| Phase | Scope | Est. files |
| ----- | ----- | ---------- |
| **P1 — Entry path** | `CLAUDE.md` Quick Start, `docs/README.md`, spec table fix | 2–3 |
| **P2 — Backlog trim** | Split backlog into active + 2 archive files | 3 |
| **P3 — Archive moves** | `superpowers/` move, audit move, archive README, stubs | ~50 moves |
| **P4 — Truth pass** | TECH_DEBT header, PRD banner, spec pause banners, link sweep | ~10 |
| **P5 — Verify** | Grep for broken relative links to `docs/SSOT/archive/superpowers/`; update inbound links in BACKLOG, DECISIONS, specs | — |

Single PR to `dev` preferred (atomic doc truth). Bump `app/VERSION` PATCH per policy.

---

### 7. Link update strategy

After `git mv docs/superpowers → docs/SSOT/archive/superpowers`:

1. `rg 'docs/SSOT/archive/superpowers/'` — update to `docs/SSOT/archive/superpowers/` in **active** files only.
2. Leave historical archive files pointing to old paths OR batch-update for consistency (prefer update for grep cleanliness).
3. `rg 'SRS\.md|CODE_QUALITY'` in active paths — replace with `CLAUDE.md` §5 or archive README note.

---

### 8. Testing / acceptance

| AC | Check |
| -- | ----- |
| AC1 | `CLAUDE.md` opens with Quick Start; ≤ 50 lines before §1 Required reading |
| AC2 | Active `BACKLOG.md` has zero `✅` rows |
| AC3 | `archive/BACKLOG-history.md` contains all former `✅` rows |
| AC4 | `docs/SSOT/archive/superpowers/README.md` stub resolves; no broken links in active BACKLOG |
| AC5 | `docs/README.md` exists; `docs/AGENTS.md` still points to `CLAUDE.md` |
| AC6 | `rg 'docs/SSOT/archive/superpowers/' docs/SSOT/BACKLOG.md docs/SSOT/spec/` returns only updated paths or zero |
| AC7 | New agent smoke test: "pick next task" reads only GLOWE/shared open items |

---

### 9. Risks

| Risk | Mitigation |
| ---- | ---------- |
| Broken links after superpowers move | P5 link sweep; stubs at old paths |
| Agents still read archived SRS | Quick Start explicit "do not use" list |
| Open KC infra rows misclassified | PM review of paused vs active list before merge |
| Autonomous loop picks from old backlog | Update Sprint Protocol + loop prompt in CLAUDE.md §13 step 1 to say "active BACKLOG only" |

---

## Open items for PM — resolved (2026-07-22)

1. **Paused list** — see implementation plan classification table (KC-mobile UI → pause; shared backend/infra/GLOWE → active).
2. **P1.7 / P1.8** — keep in active backlog (web research route).
3. **P3.A-Tree.3** — pause (KC mobile `/about/team`; GLOWE admin is separate).
