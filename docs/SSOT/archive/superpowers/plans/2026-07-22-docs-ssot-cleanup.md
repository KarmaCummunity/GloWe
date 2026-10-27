# Documentation SSOT Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make docs maximally true and minimally noisy for a new agent — Quick Start entry path, active-only backlog, historical material archived (never deleted).

**Architecture:** Approach 2 from the design: keep one SSOT (`CLAUDE.md` + `docs/SSOT/{spec,BACKLOG,TECH_DEBT,DECISIONS}`), move historical trees under `docs/SSOT/archive/`, stub old paths, fix inbound links. No feature code changes.

**Tech Stack:** Markdown only; `git mv` for history-preserving moves; `rg` for link sweep; `node scripts/bump-app-version.mjs` for PATCH bump.

**Design:** `docs/SSOT/archive/superpowers/specs/2026-07-22-docs-ssot-cleanup-design.md` (will live at `docs/SSOT/archive/superpowers/specs/...` after Task 4).

## Global Constraints

- **Archive-only** — never `git rm` content; only move + stub.
- **GLOWE-only active frontend** — KC mobile UI rows → paused archive; shared backend/infra may stay active.
- **Aggressive backlog trim** — active `BACKLOG.md` has **zero** `✅` rows.
- **No speculative renames** of `14_karma.md` / `14_responsive_desktop.md` (legacy dual numbering stays).
- **Bump** `app/VERSION` PATCH in the same PR to `dev`.
- **Mapped to spec:** N/A (docs/tooling). Refactor logged: NA.

### Open-row classification (locked)

**ACTIVE** (remain in `docs/SSOT/BACKLOG.md`):

| ID | Why active |
|----|------------|
| P1.7, P1.8 | Web public research |
| GLOWE.B, GLOWE.C, GLOWE.GUEST-B | GLOWE frontend |
| TRANSLATE-P3 | Shared translation infra |
| INFRA-QA-W1..W5, W7 | Shared QA / monitoring |
| INFRA-OSS-4, INFRA-OSS-6 | Shared security tooling |
| PERF-4, PERF-5 | Shared storage / chat backend (GLOWE uses KC chats) |
| P3.1, P3.3 | Deferred product — keep under Deferred section |

**PAUSED** → `docs/SSOT/archive/BACKLOG-kc-mobile-paused.md` (status → `⏸️ Paused (KC mobile out of scope per AGENTS.md)`):

| IDs |
|-----|
| P2.23, P2.24, P2.25, P2.26, P2.30, P2.34 |
| RESP-001, RESP-004, RESP-005, RESP-006 |
| V3.0.0 .. V3.0.12 (entire rides V3 umbrella) |
| P3.2, P3.A-Tree, P3.A-Tree.3 |
| INFRA-QA-W6 (Maestro native) |

**HISTORY** → `docs/SSOT/archive/BACKLOG-history.md`: every current `✅ Done` row, verbatim.

---

### Task 1: Entry path — Quick Start + docs map + spec table

**Files:**
- Modify: `CLAUDE.md` (insert Quick Start after APP VERSION banner; expand §1 spec table; update §4 / §10 / §13 to say “active BACKLOG only”)
- Create: `docs/README.md`
- Modify: `AGENTS.md` (one paused-backlog pointer line)
- Modify: `CONTRIBUTING.md` (pointer to `docs/README.md`)

**Interfaces:**
- Consumes: design §1.1–1.3
- Produces: Quick Start section title exactly `## Quick Start (read this first)`; `docs/README.md` exists

- [ ] **Step 1: Insert Quick Start into `CLAUDE.md`**

Immediately after the APP VERSION section (after line 13 / before `## 1. Required reading`), insert:

```markdown
## Quick Start (read this first)

1. **Product focus.** GLOWE web (`app/apps/glowe-web/**`) is the active MVP. KC mobile UI (`app/apps/mobile/**`) is paused — see [`AGENTS.md`](./AGENTS.md).
2. **Read order.**
   1. [`docs/SSOT/BACKLOG.md`](./docs/SSOT/BACKLOG.md) — **open items only** (`⏳` / `🟡`)
   2. Relevant [`docs/SSOT/spec/{domain}.md`](./docs/SSOT/spec/)
   3. Scan [`docs/SSOT/TECH_DEBT.md`](./docs/SSOT/TECH_DEBT.md) for the area you touch
   4. Check [`docs/SSOT/DECISIONS.md`](./docs/SSOT/DECISIONS.md) before structural changes
3. **Do not implement from.** `docs/SSOT/archive/**`, `PRD_V2_NOT_FOR_MVP/**`, and design/plan trees under `docs/SSOT/archive/superpowers/**` — unless an **open** backlog row or active spec links there.
4. **Pre-push gates** (from `app/`): `pnpm typecheck && pnpm test && pnpm lint`
5. **Version.** Bump `app/VERSION` PATCH on every PR into `dev` (see banner above).

Doc map for humans: [`docs/README.md`](./docs/README.md).
```

- [ ] **Step 2: Expand the §1 spec-files tree**

Replace the tree under `### Spec files (domain-per-file)` with:

```
docs/SSOT/spec/
├── 01_auth_and_onboarding.md     FR-AUTH-*
├── 02_profile_and_privacy.md     FR-PROFILE-*
├── 03_following.md               FR-FOLLOW-*
├── 04_posts.md                   FR-POST-*
├── 05_closure_and_reopen.md      FR-CLOSURE-*
├── 06_feed_and_search.md         FR-FEED-*
├── 07_chat.md                    FR-CHAT-*
├── 08_moderation.md              FR-MOD-*
├── 09_notifications.md           FR-NOTIF-*
├── 10_statistics.md              FR-STATS-*
├── 11_settings.md                FR-SETTINGS-*
├── 12_super_admin.md             FR-ADMIN-*
├── 13_donations.md               FR-DONATE-*
├── 14_karma.md                   FR-KARMA-*
├── 14_responsive_desktop.md      FR-RESP-*   (KC mobile UI — paused)
├── 15_rides.md                   FR-RIDE-*
├── 16_public_research.md         FR-RESEARCH-*
├── 17_glowe_frontend.md          FR-GLOWE-*
└── 18_translation.md             FR-TRANSLATE-*
```

Add one note under the tree: `Note: dual \`14_*\` filenames are intentional legacy numbering — do not renumber.`

- [ ] **Step 3: Point §4 / §10 / §13 at active backlog only**

In §4 “Before you start”, §10 “How to pick the next task”, and §13 iteration step 1, change wording so agents pick from **active** `docs/SSOT/BACKLOG.md` only — never from `docs/SSOT/archive/BACKLOG-*.md`.

Example for §10:

```markdown
If no task was assigned: open `docs/SSOT/BACKLOG.md` (active open items only — not `archive/`) and pick the highest-priority `⏳ Planned` item. Move it to `🟡 In progress` before you start coding.
```

- [ ] **Step 4: Create `docs/README.md`**

```markdown
# Documentation map

**Agents:** start at [`CLAUDE.md`](../CLAUDE.md) §Quick Start. That file is the single source of truth for process rules.

| Active | Purpose |
|--------|---------|
| [`SSOT/spec/`](./SSOT/spec/) | Feature requirements (FR-*) |
| [`SSOT/BACKLOG.md`](./SSOT/BACKLOG.md) | Open work queue (`⏳` / `🟡` only) |
| [`SSOT/TECH_DEBT.md`](./SSOT/TECH_DEBT.md) | Active debt register |
| [`SSOT/DECISIONS.md`](./SSOT/DECISIONS.md) | Architecture decisions (D-*) |
| [`SSOT/ENVIRONMENTS.md`](./SSOT/ENVIRONMENTS.md), [`OPERATOR_RUNBOOK.md`](./SSOT/OPERATOR_RUNBOOK.md), [`TESTING.md`](./SSOT/TESTING.md), [`RELEASE_CHECKLIST.md`](./SSOT/RELEASE_CHECKLIST.md) | Ops |

| Historical (do not implement from) | Purpose |
|------------------------------------|---------|
| [`SSOT/archive/`](./SSOT/archive/) | Superseded SRS, backlog history, paused KC mobile, past designs |
| [`../PRD_V2_NOT_FOR_MVP/`](../PRD_V2_NOT_FOR_MVP/) | Post-MVP product vision |
```

- [ ] **Step 5: Update `AGENTS.md` and `CONTRIBUTING.md`**

Append under the Active product focus section in `AGENTS.md`:

```markdown
Paused KC mobile backlog (do not pick unless PM reopens): [`docs/SSOT/archive/BACKLOG-kc-mobile-paused.md`](./docs/SSOT/archive/BACKLOG-kc-mobile-paused.md).
```

In `CONTRIBUTING.md` Scope (or after intro), add:

```markdown
Documentation map for maintainers/agents: [`docs/README.md`](docs/README.md). Process rules: [`CLAUDE.md`](CLAUDE.md).
```

- [ ] **Step 6: Verify Quick Start placement**

Run:

```bash
rg -n "^## Quick Start|^## 1\. Required reading" CLAUDE.md
```

Expected: Quick Start line number < Required reading line number; gap ≤ 50 lines of content between them.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md docs/README.md AGENTS.md CONTRIBUTING.md
git commit -m "$(cat <<'EOF'
docs(ssot): add agent Quick Start and docs map

Front-load the minimal read path for new agents and point humans at docs/README.md.
EOF
)"
```

---

### Task 2: Split backlog — history + pause + active-only

**Files:**
- Create: `docs/SSOT/archive/BACKLOG-history.md`
- Create: `docs/SSOT/archive/BACKLOG-kc-mobile-paused.md`
- Modify: `docs/SSOT/BACKLOG.md` (rewrite to open items only)

**Interfaces:**
- Consumes: classification table in Global Constraints
- Produces: active `BACKLOG.md` with zero `✅` rows; history file with all former Done rows; paused file with KC-mobile open rows

- [ ] **Step 1: Snapshot current backlog**

```bash
cp docs/SSOT/BACKLOG.md /tmp/BACKLOG-before-docs-cleanup.md
wc -l docs/SSOT/BACKLOG.md
```

- [ ] **Step 2: Create `docs/SSOT/archive/BACKLOG-history.md`**

Header + every table row from the snapshot whose Status cell contains `✅` (preserve section headings for those rows). Header:

```markdown
# Backlog history (completed)

> **Historical.** For audit and traceability only. Do not pick work from this file.
> Active queue: [`../BACKLOG.md`](../BACKLOG.md).

Extracted from `BACKLOG.md` on 2026-07-22 during docs SSOT cleanup.
```

Paste all `✅` rows under their original section headings (P0, P1, P2, GLOWE, P3, INFRA, TRANSLATE, etc.).

- [ ] **Step 3: Create `docs/SSOT/archive/BACKLOG-kc-mobile-paused.md`**

```markdown
# KC mobile backlog — paused

> **Paused.** KC mobile UI (`app/apps/mobile/**`) is out of scope per [`AGENTS.md`](../../../AGENTS.md).
> Do not implement these rows unless a PM message explicitly re-opens KC frontend work.
> Active queue: [`../BACKLOG.md`](../BACKLOG.md).

Status values below were rewritten to `⏸️ Paused (KC mobile out of scope per AGENTS.md)` on 2026-07-22.
```

Copy the paused IDs from the classification table (full original row text), rewriting the Status column to `⏸️ Paused (KC mobile out of scope per AGENTS.md)`.

- [ ] **Step 4: Rewrite active `docs/SSOT/BACKLOG.md`**

Target structure (open rows only; keep original row text except status already open):

```markdown
# Karma Community MVP — Backlog

> **Purpose:** Priority-ordered **open** task queue (`⏳` / `🟡` only).
> Agents pick the highest-priority `⏳` item. Update status when starting (⏳→🟡) or completing (🟡→✅).
> Completed work: [`archive/BACKLOG-history.md`](./archive/BACKLOG-history.md).
> Paused KC mobile: [`archive/BACKLOG-kc-mobile-paused.md`](./archive/BACKLOG-kc-mobile-paused.md).

---

## GLOWE — Active frontend

| ID | Task | Owner | Status | Spec |
|----|------|-------|--------|------|
| GLOWE.B | … | … | ⏳ Planned | … |
| GLOWE.C | … | … | ⏳ Planned | … |
| GLOWE.GUEST-B | … | … | ⏳ Planned [blocked…] | … |

## TRANSLATE — Shared infra

| ID | … |
| TRANSLATE-P3 | … | ⏳ Planned | … |

## Shared — Research / Infra / Perf

| ID | … |
| P1.7 | … | 🟡 … | … |
| P1.8 | … | 🟡 … | … |
| INFRA-QA-W1 | … | 🟡 … | … |
| INFRA-QA-W2 | … | ⏳ Planned | … |
| INFRA-QA-W3 | … | ⏳ Planned | … |
| INFRA-QA-W4 | … | ⏳ Planned | … |
| INFRA-QA-W5 | … | ⏳ Planned | … |
| INFRA-QA-W7 | … | ⏳ Planned | … |
| INFRA-OSS-4 | … | 🟡 … | … |
| INFRA-OSS-6 | … | 🟡 … | … |
| PERF-4 | … | 🟡 … | … |
| PERF-5 | … | 🟡 … | … |

## Deferred (post-MVP, still tracked)

| ID | … |
| P3.1 | … | ⏳ Deferred (EXEC-9) | … |
| P3.3 | … | ⏳ Deferred | … |

## Sprint Protocol

1. Pick the highest `⏳` item in **this file** (not `archive/`)
2. Read its linked `spec/` file
3. Move status to 🟡
4. Implement
5. Move status to ✅ **and** append/move the row to `archive/BACKLOG-history.md` (keep active file free of Done rows)
6. Update spec file status if all ACs complete
```

Use the **full original task cell text** from `/tmp/BACKLOG-before-docs-cleanup.md` for each kept ID — do not shorten descriptions.

Also update any `docs/SSOT/archive/superpowers/` links inside those kept rows to `docs/SSOT/archive/superpowers/` **after** Task 4, or write them as `docs/SSOT/archive/superpowers/...` now (preferred — Task 4 moves the tree).

- [ ] **Step 5: Acceptance checks**

```bash
# AC2: zero Done rows in active backlog
rg -n '✅' docs/SSOT/BACKLOG.md
# Expected: no matches (or only in prose that is not a Status cell — prefer zero)

# AC3: history has Done rows
rg -c '✅' docs/SSOT/archive/BACKLOG-history.md
# Expected: count ≥ 100

# Paused file has Paused status
rg -c '⏸️ Paused' docs/SSOT/archive/BACKLOG-kc-mobile-paused.md
# Expected: count equals number of paused rows (~25+)
```

- [ ] **Step 6: Commit**

```bash
git add docs/SSOT/BACKLOG.md docs/SSOT/archive/BACKLOG-history.md docs/SSOT/archive/BACKLOG-kc-mobile-paused.md
git commit -m "$(cat <<'EOF'
docs(ssot): trim BACKLOG to open items only

Move completed rows to archive history and pause KC mobile UI work per AGENTS.md.
EOF
)"
```

---

### Task 3: Archive index + PRD / TECH_DEBT / follow-up moves

**Files:**
- Create: `docs/SSOT/archive/README.md`
- Modify: `docs/SSOT/TECH_DEBT.md` (shrink Last Updated cell)
- Modify: `PRD_V2_NOT_FOR_MVP/00_Index.md` (banner)
- Move: `docs/SSOT/AUDIT_2026-05-10_FOLLOWUP.md` → `docs/SSOT/archive/AUDIT_2026-05-10_FOLLOWUP.md`
- Modify: `docs/SSOT/spec/14_responsive_desktop.md` (pause banner)

**Interfaces:**
- Consumes: design §3.1, §3.3, §4, §5
- Produces: archive README as the index for historical material

- [ ] **Step 1: Write `docs/SSOT/archive/README.md`**

```markdown
# SSOT archive

> **Historical / superseded.** Do not implement from this tree unless an **open** row in [`../BACKLOG.md`](../BACKLOG.md) or an active `spec/` file links here.
> Agent entry: [`../../../CLAUDE.md`](../../../CLAUDE.md) §Quick Start.

## Contents

| Path | What |
|------|------|
| [`BACKLOG-history.md`](./BACKLOG-history.md) | All completed backlog rows |
| [`BACKLOG-kc-mobile-paused.md`](./BACKLOG-kc-mobile-paused.md) | Paused KC mobile UI work |
| [`SRS/`](./SRS/) + [`SRS.md`](./SRS.md) | Pre-domain-spec monolithic SRS |
| [`PRD_MVP_CORE_SSOT/`](./PRD_MVP_CORE_SSOT/) | Early PRD archive |
| [`superpowers/`](./superpowers/) | Past design docs + implementation plans |
| [`audit/`](./audit/) | Point-in-time audit reports |
| [`AUDIT_2026-05-10_FOLLOWUP.md`](./AUDIT_2026-05-10_FOLLOWUP.md) | Follow-up tracker (historical) |

## Missing docs note

- **`CODE_QUALITY.md`** was never authored. Architecture + quality rules live in [`CLAUDE.md`](../../../CLAUDE.md) §5–§8. Historical references in archived SRS are stale.
- **`SRS.md` as active SSOT** is superseded by `docs/SSOT/spec/*.md`. External agent rules that still cite `docs/SSOT/SRS.md` / `CODE_QUALITY.md` are outdated — follow `CLAUDE.md`.

## TD-43 / TD-44

Stale `SRS.md` Last-Updated and missing `CODE_QUALITY.md` references are resolved by this archive policy (docs cleanup 2026-07-22). Do not re-open as active TECH_DEBT unless the missing files are intentionally re-created.
```

- [ ] **Step 2: Shrink `TECH_DEBT.md` Last Updated cell**

Replace the giant `| **Last Updated** | … |` value with:

```markdown
| **Last Updated** | 2026-07-22 (docs SSOT cleanup — prior narrative changelog retired; see `archive/BACKLOG-history.md` + git history) |
```

- [ ] **Step 3: Banner on `PRD_V2_NOT_FOR_MVP/00_Index.md`**

Insert **above** the existing `<div dir="rtl"…>` (or as the first lines if HTML wrapper must wrap everything — prefer English banner outside the RTL div):

```markdown
> **NOT MVP — historical product vision.** Active requirements live in `docs/SSOT/spec/`. Do not implement from this tree unless PM explicitly reopens scope.

```

- [ ] **Step 4: Move audit follow-up**

```bash
git mv docs/SSOT/AUDIT_2026-05-10_FOLLOWUP.md docs/SSOT/archive/AUDIT_2026-05-10_FOLLOWUP.md
```

- [ ] **Step 5: Pause banner on `14_responsive_desktop.md`**

After the title line, insert:

```markdown
> **KC mobile UI — paused.** Backend/shared contracts may still apply to GLOWE. Active GLOWE spec: [`17_glowe_frontend.md`](./17_glowe_frontend.md). Paused backlog: [`../archive/BACKLOG-kc-mobile-paused.md`](../archive/BACKLOG-kc-mobile-paused.md).
```

Also update its Design doc path to `docs/SSOT/archive/superpowers/specs/2026-05-22-responsive-desktop-design.md` (after Task 4, or write the final path now).

- [ ] **Step 6: Commit**

```bash
git add docs/SSOT/archive/README.md docs/SSOT/TECH_DEBT.md PRD_V2_NOT_FOR_MVP/00_Index.md docs/SSOT/archive/AUDIT_2026-05-10_FOLLOWUP.md docs/SSOT/spec/14_responsive_desktop.md
git commit -m "$(cat <<'EOF'
docs(ssot): archive index, PRD banner, shrink TECH_DEBT header

Clarify historical trees and retire the megabyte Last Updated cell.
EOF
)"
```

---

### Task 4: Move `superpowers/` and `audit/` into archive

**Files:**
- Move: `docs/SSOT/archive/superpowers/**` → `docs/SSOT/archive/superpowers/**`
- Move: `docs/SSOT/archive/audit/**` → `docs/SSOT/archive/audit/**`
- Create: `docs/SSOT/archive/superpowers/README.md` (stub)
- Create: `docs/SSOT/archive/audit/README.md` (stub)

**Interfaces:**
- Consumes: design §3.2, §3.4
- Produces: stubs at old paths; content under archive

- [ ] **Step 1: Move trees with git**

```bash
mkdir -p docs/SSOT/archive
git mv docs/superpowers docs/SSOT/archive/superpowers
git mv docs/SSOT/audit docs/SSOT/archive/audit
```

- [ ] **Step 2: Create stubs at old paths**

`docs/SSOT/archive/superpowers/README.md`:

```markdown
# Moved

This tree moved to [`../SSOT/archive/superpowers/`](../SSOT/archive/superpowers/).

Designs and plans are **historical**. Active requirements: [`../SSOT/spec/`](../SSOT/spec/). Agent entry: [`../../CLAUDE.md`](../../CLAUDE.md) §Quick Start.
```

`docs/SSOT/archive/audit/README.md`:

```markdown
# Moved

Audit reports moved to [`../archive/audit/`](../archive/audit/).
```

- [ ] **Step 3: Commit the move**

```bash
git add docs/SSOT/archive/superpowers/README.md docs/SSOT/archive/audit/README.md
git add -u docs/superpowers docs/SSOT/audit docs/SSOT/archive/superpowers docs/SSOT/archive/audit
git commit -m "$(cat <<'EOF'
docs(ssot): move superpowers and audit trees into archive

Preserve history via git mv; leave stubs at the old paths.
EOF
)"
```

---

### Task 5: Link sweep + version bump + verify

**Files:**
- Modify: any **active** file still pointing at `docs/SSOT/archive/superpowers/` or `docs/SSOT/archive/audit/` (especially `BACKLOG.md`, `DECISIONS.md`, `OPERATOR_RUNBOOK.md`, `spec/*.md`, `AGENTS.md`, `CLAUDE.md` §12 map, `docs/README.md`)
- Prefer also updating links inside `docs/SSOT/archive/**` for grep cleanliness (design §7)
- Modify: `app/VERSION` + `app/apps/glowe-web/js/glowe-version.js` (PATCH bump)

**Interfaces:**
- Consumes: Task 4 new paths
- Produces: AC1–AC7 green

- [ ] **Step 1: Find stale paths**

```bash
rg -n 'docs/SSOT/archive/superpowers/' --glob '*.md' -g '!docs/SSOT/archive/**' -g '!docs/SSOT/archive/superpowers/README.md'
rg -n 'docs/SSOT/archive/audit/' --glob '*.md' -g '!docs/SSOT/archive/**' -g '!docs/SSOT/archive/audit/README.md'
rg -n 'SRS\.md|CODE_QUALITY' docs/SSOT/BACKLOG.md docs/SSOT/TECH_DEBT.md CLAUDE.md AGENTS.md docs/README.md docs/SSOT/spec
```

- [ ] **Step 2: Rewrite active links**

Replace `docs/SSOT/archive/superpowers/` → `docs/SSOT/archive/superpowers/` in every active hit from Step 1.

Replace `docs/SSOT/archive/audit/` → `docs/SSOT/archive/audit/` similarly.

If `CLAUDE.md` §12 “Repo structure map” still lists `docs/SSOT/archive/superpowers/plans/` as implementation plans, update to:

```markdown
| Implementation plans | `docs/SSOT/archive/superpowers/plans/` (historical) + new plans land there until SSOT says otherwise |
| Design specs | `docs/SSOT/archive/superpowers/specs/` (historical) |
```

Optional batch for archive cleanliness:

```bash
# macOS sed — review diff before commit
rg -l 'docs/SSOT/archive/superpowers/' docs/SSOT/archive | while read f; do
  sed -i '' 's|docs/SSOT/archive/superpowers/|docs/SSOT/archive/superpowers/|g' "$f"
done
```

- [ ] **Step 3: Acceptance checklist (design §8)**

| AC | Command / check | Expected |
|----|-----------------|----------|
| AC1 | `rg -n '^## Quick Start\|^## 1\. Required' CLAUDE.md` | Quick Start before §1; ≤50 lines between |
| AC2 | `rg '✅' docs/SSOT/BACKLOG.md` | zero Status Done rows |
| AC3 | `test -f docs/SSOT/archive/BACKLOG-history.md && rg -c '✅' docs/SSOT/archive/BACKLOG-history.md` | ≥100 |
| AC4 | `test -f docs/SSOT/archive/superpowers/README.md && test -d docs/SSOT/archive/superpowers` | both true |
| AC5 | `test -f docs/README.md && head -5 docs/AGENTS.md` | pointer to CLAUDE.md |
| AC6 | `rg 'docs/SSOT/archive/superpowers/' docs/SSOT/BACKLOG.md docs/SSOT/spec \|\| true` | no stale hits (only archive paths) |
| AC7 | Read active BACKLOG — only GLOWE/shared/deferred IDs from classification table | no RESP-*/V3.0.*/P2.23 etc. |

- [ ] **Step 4: Bump app version PATCH**

```bash
node scripts/bump-app-version.mjs
# or manually: app/VERSION 1.0.12 → 1.0.13 and mirror glowe-version.js
cat app/VERSION
```

Expected: `1.0.13` (or next PATCH if already bumped).

- [ ] **Step 5: Final commit**

```bash
git add -A
git status
git commit -m "$(cat <<'EOF'
docs(ssot): fix archive links and bump app version

Complete docs SSOT cleanup link sweep after moving superpowers/audit.
EOF
)"
```

- [ ] **Step 6: Open PR to `dev` (when asked)**

```bash
git push -u origin HEAD
gh pr create --base dev --title "docs(ssot): agent Quick Start + archive cleanup" --body "$(cat <<'EOF'
## Summary
Reduce agent doc noise: Quick Start in CLAUDE.md, active-only BACKLOG, archive superpowers/audit/history, pause KC mobile UI backlog.

## Mapped to spec
- N/A — docs/tooling meta cleanup (`docs/SSOT/archive/superpowers/specs/2026-07-22-docs-ssot-cleanup-design.md`)

## Changes
- CLAUDE.md Quick Start + full spec table
- BACKLOG split: active / history / KC-mobile paused
- Move `docs/superpowers` + `docs/SSOT/audit` → archive with stubs
- TECH_DEBT header shrink, PRD banner, docs/README.md map
- PATCH bump `app/VERSION`

## Tests
- Manual acceptance AC1–AC7 (see plan Task 5)
- `pnpm typecheck` / `pnpm test` / `pnpm lint` — N/A for docs-only (run if version bump script touches JS)

## SSOT updated
- [x] BACKLOG.md trimmed
- [x] archive README + history + paused
- [x] TECH_DEBT.md header
- [ ] spec domain status headers — N/A (no FR AC change)

## Risk / rollout notes
Low risk. Link stubs at old paths. No DB / runtime behavior change.
EOF
)"
```

---

## Self-review (plan vs design)

| Design section | Task coverage |
|----------------|---------------|
| §1 Entry path | Task 1 |
| §2 Backlog restructure | Task 2 |
| §3 Archive layout | Tasks 3–4 |
| §4 Truth fixes | Tasks 1, 3, 5 |
| §5 KC mobile specs banner | Task 3 Step 5 |
| §6 Phases P1–P5 | Tasks 1–5 |
| §7 Link strategy | Task 5 |
| §8 Acceptance | Task 5 Step 3 |
| §9 Risks / loop wording | Task 1 Step 3 |

No placeholders left. Classification table locks PM open items.
