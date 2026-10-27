# Open-Source GLOWE Contributor Strategy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public MVP-2 repo safe and usable for external GLOWE contributors: docs + IP framing, merge-gate clarity, security tooling, and a local Docker/Supabase stack with fictional seed data.

**Architecture:** Additive docs/governance first; then repo-settings toggles; then local-dev Docker/seed (hard-refuses hosted URLs); then vendor CI/Apps (Snyk, CodeRabbit, GitGuardian) behind org-admin credentials. No KC/GLOWE repo split. No change to `CODEOWNERS` or `required_approving_review_count: 0`.

**Tech Stack:** Markdown governance files, GitHub Settings API / Apps, Supabase CLI + Docker, existing Vitest/CI, optional Snyk + GitGuardian + CodeRabbit integrations.

**Design SSOT:** `docs/SSOT/archive/superpowers/specs/2026-07-12-open-source-glowe-contributor-strategy-design.md`

---

## File map

| Path | Responsibility |
| ---- | -------------- |
| `README.md` | First-visit framing (GLOWE active, KC paused) |
| `LICENSE` | All-rights-reserved / contribution-only visibility (not OSI) |
| `CLA.md` | Formal Individual + Entity Contributor License Agreement |
| `CONTRIBUTING.md` | External contributor setup, terms, merge bar |
| `.github/PULL_REQUEST_TEMPLATE.md` | Add required CLA checkbox |
| `CODE_OF_CONDUCT.md` | Contributor Covenant v2.1 |
| `SECURITY.md` | Private disclosure |
| `.github/ISSUE_TEMPLATE/*.md` | Bug + feature templates |
| `docs/SSOT/ENVIRONMENTS.md` | Add missing SonarCloud row to required-checks table |
| `docs/SSOT/BACKLOG.md` | INFRA rows for this epic |
| `app/.env.example` | Local Supabase section + hosted warning |
| `supabase/seed-glowe-local.sql` or `scripts/seed-glowe-local.mjs` | Fictional local GLOWE data |
| `scripts/dev-up.sh` | One-command local bring-up wrapper |
| `.github/workflows/ci-snyk.yml` (later) | Dependency/image scan |
| `.coderabbit.yaml` (later) | Optional review focus |

---

### Task 1: Root governance docs (README, LICENSE, CLA, CONTRIBUTING, CoC, SECURITY)

**Files:**
- Create: `README.md`, `LICENSE`, `CLA.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
- Modify: `docs/SSOT/BACKLOG.md` (add INFRA-OSS-* rows, flip first to 🟡)
- Modify: `.github/PULL_REQUEST_TEMPLATE.md` (add required CLA checkbox)

- [ ] **Step 1: Add BACKLOG tracking rows**

Under `## INFRA — Tooling & Environment` in `docs/SSOT/BACKLOG.md`, append:

```markdown
| INFRA-OSS-1 | **Open-source contributor docs pack** — root README/LICENSE/CLA/CONTRIBUTING/CoC/SECURITY + issue templates; GLOWE-only framing | infra | 🟡 In progress | `docs/SSOT/archive/superpowers/specs/2026-07-12-open-source-glowe-contributor-strategy-design.md` |
| INFRA-OSS-2 | **GitHub settings for external contributors** — fork-PR approval, Discussions, private vulnerability reporting | infra | ⏳ Planned | same design §5 |
| INFRA-OSS-3 | **Local Docker Supabase + fictional GLOWE seed** — contributor-safe local stack; refuse hosted URLs | infra | ⏳ Planned | same design §8 |
| INFRA-OSS-4 | **Snyk PR scan** — workflow or App; non-blocking then required | infra | ⏳ Planned [blocked: needs SNYK_TOKEN / org App] | same design §7 |
| INFRA-OSS-5 | **CodeRabbit App** — AI review comments; non-merging | infra | ⏳ Planned [blocked: needs org-admin App install] | same design §7 |
| INFRA-OSS-6 | **GitGuardian** — secret leak detection App or ggshield CI | infra | ⏳ Planned [blocked: needs org-admin App / token] | same design §7 |
| INFRA-OSS-7 | **Dependabot security updates + Secret Scanning docs** — enable security updates; document already-on secret scanning | infra | ⏳ Planned | same design §7 |
```

- [ ] **Step 2: Write adapted `LICENSE` (All Rights Reserved — not OSI)**

Must match design §2. Use exactly this content (or equivalent that preserves every bullet):

```text
Copyright (c) 2026 KarmaCommunity. All rights reserved.

NOTICE — SOURCE-AVAILABLE FOR CONTRIBUTION ONLY

This repository's source code is made visible for transparency and to enable
contributions to this repository via pull requests. Except as expressly granted
in CLA.md for inbound contributions, no license is granted under copyright,
patent, or otherwise.

Without a separate written license from KarmaCommunity, you may not copy,
modify, redistribute, sublicense, sell, commercially reuse, or create derivative
works of this software outside the process of contributing to this repository.

KarmaCommunity, GLOWE, and related names and logos are trademarks of their
respective owners and are not licensed under this notice.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM,
OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Inbound contributions are governed by CLA.md and CONTRIBUTING.md.
```

Verify: file must **not** contain the words `MIT`, `Apache`, `GPL`, or `SPDX`.

- [ ] **Step 3: Write `CLA.md` (Individual + Entity)**

Create a formal Contributor License Agreement covering design §2b terms:
acceptance by PR, copyright license (incl. relicense), patent license, originality/
entitlement, attribution, no obligation to use, and a short Entity CLA section.
English only. Title: `KarmaCommunity Contributor License Agreement (CLA)`.
Version/date line: `Version 1.0 — 2026-07-12`.

- [ ] **Step 4: Write `README.md`**

Follow design §1 section order exactly:
1. Bold status banner (KC mobile paused; GLOWE active at `app/apps/glowe-web/`; shared Supabase backend).
2. One plain-language paragraph: what GLOWE is (global social-impact / volunteering / org collaboration web app).
3. Quickstart: clone → Docker + `supabase start` (pointer) → `cd app && pnpm install` → copy env from local `supabase status` → `pnpm --filter @kc/glowe-web dev`. Detail in CONTRIBUTING.
4. Repo map tree (glowe-web active, mobile paused, supabase shared, docs/SSOT internal).
5. License / Contributing (mention CLA) / Security one-liners with links.
6. One sentence: PRs target `dev`; required CI (including tests) must be green; `main` only from `dev`.

- [ ] **Step 5: Write `CONTRIBUTING.md`**

Follow design §3 (amended): Scope, Contributor Terms (**link to `CLA.md`**, do not paste full CLA), Dev setup (local-only), Branch & PR flow (`dev` only), Commit/PR conventions (Conventional Commits + Mapped to spec `N/A` OK), Merge bar (list current required checks + note new scanners when added), Who reviews (`@navesarussi`).

Include this hard rule verbatim:

```markdown
## Local data only

External contributors **must** run Supabase locally (Docker). Do not request
or commit hosted `dev`/`prod` URLs, anon keys, or service-role keys.
```

- [ ] **Step 6: Write `CODE_OF_CONDUCT.md`**

Use [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) boilerplate. Enforcement contact: `karmacommunity2.0@gmail.com`.

- [ ] **Step 7: Write `SECURITY.md`**

```markdown
# Security Policy

## Reporting a vulnerability

Please **do not** open a public GitHub issue for unpatched vulnerabilities.

1. Prefer GitHub **Private vulnerability reporting** on this repository.
2. Fallback: email `karmacommunity2.0@gmail.com` with steps to reproduce.

We will acknowledge receipt and coordinate a fix before any public disclosure.
```

- [ ] **Step 8: Update `.github/PULL_REQUEST_TEMPLATE.md`**

Add near the top (after Summary is fine) a required checkbox:

```markdown
## Contributor License Agreement

- [ ] I have read and agree to the [Contributor License Agreement](../CLA.md).
```

Preserve existing "Mapped to spec" requirements in the template.

- [ ] **Step 9: Commit**

```bash
git add README.md LICENSE CLA.md CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md docs/SSOT/BACKLOG.md .github/PULL_REQUEST_TEMPLATE.md
git commit -m "$(cat <<'EOF'
docs(ssot): add GLOWE contributor governance pack with LICENSE and CLA

Mapped to spec: N/A. Source-available All-Rights-Reserved LICENSE plus
formal CLA so volunteers can contribute without a reuse license grant.
EOF
)"
```

---

### Task 2: Issue templates + SSOT required-check drift fix

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`
- Modify: `docs/SSOT/ENVIRONMENTS.md` (add SonarCloud row to Dev merge gates table)
- Modify: `docs/SSOT/RELEASE_CHECKLIST.md` if SonarCloud missing from main table

- [ ] **Step 1: Add bug template**

```markdown
---
name: Bug report
about: Something broken in GLOWE (or shared backend)
title: "[bug] "
labels: bug
---

## What happened
## Steps to reproduce
## Expected
## Environment (browser / OS / local vs deployed)
## Screenshots / logs (no secrets)
```

- [ ] **Step 2: Add feature template**

```markdown
---
name: Feature request
about: Propose a GLOWE improvement
title: "[feat] "
labels: enhancement
---

## Problem
## Proposed solution
## Scope note
GLOWE frontend (`app/apps/glowe-web`) is in scope. KC mobile frontend PRs are out of scope (see AGENTS.md).
```

- [ ] **Step 3: Fix ENVIRONMENTS required-checks table**

Add row under Dev merge gates:

```markdown
| SonarCloud | CI — SonarCloud | `SonarCloud quality gate` |
```

Mirror on `RELEASE_CHECKLIST.md` main table if absent. Re-run:

```bash
node scripts/check-required-checks-drift.mjs
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add .github/ISSUE_TEMPLATE docs/SSOT/ENVIRONMENTS.md docs/SSOT/RELEASE_CHECKLIST.md
git commit -m "$(cat <<'EOF'
docs(ci): add issue templates and list SonarCloud in merge-gate SSOT

Mapped to spec: N/A.
EOF
)"
```

---

### Task 3: GitHub repo settings (Discussions, private vuln reporting, fork-PR approval, Dependabot security)

**Files:** none required (API/UI). Document outcomes in PR body / OPERATOR_RUNBOOK if a step is manual-only.

- [ ] **Step 1: Enable Discussions**

```bash
gh api -X PATCH repos/KarmaCummunity/GloWe -f has_discussions=true
gh api repos/KarmaCummunity/GloWe --jq .has_discussions
```

Expected: `true`.

- [ ] **Step 2: Enable private vulnerability reporting**

```bash
gh api -X PUT repos/KarmaCummunity/GloWe/private-vulnerability-reporting
# read-back:
gh api repos/KarmaCummunity/GloWe/private-vulnerability-reporting --jq .enabled
```

Expected: `true` (endpoint may 404 on older API — if so, document Settings → Security → Advisories UI path).

- [ ] **Step 3: Fork PR workflow approval for first-time contributors**

Investigate:

```bash
gh api repos/KarmaCummunity/GloWe/actions/permissions/workflow --jq .
```

Set `default_workflow_permissions` / fork approval via the supported Actions permissions endpoint, or document manual path: **Settings → Actions → General → Fork pull request workflows from outside collaborators → Require approval for first-time contributors**.

- [ ] **Step 4: Enable Dependabot security updates**

```bash
gh api -X PUT repos/KarmaCummunity/GloWe/vulnerability-alerts
gh api -X PUT repos/KarmaCummunity/GloWe/automated-security-fixes
```

Read-back:

```bash
gh api repos/KarmaCummunity/GloWe --jq .security_and_analysis
```

Expect `dependabot_security_updates.status` = `enabled`. Secret scanning should remain `enabled` with push protection.

- [ ] **Step 5: Flip BACKLOG** `INFRA-OSS-2` + `INFRA-OSS-7` → ✅; commit doc note if runbook updated.

- [ ] **Step 6: Open/merge PR to `dev`** with Mapped to spec: N/A (settings may be out-of-band; still record in BACKLOG).

---

### Task 4: Local Supabase + fictional GLOWE seed

**Files:**
- Create: `scripts/seed-glowe-local.mjs` (preferred over raw SQL for auth users)
- Create: `scripts/dev-up.sh`
- Modify: `app/.env.example` (local section)
- Modify: `CONTRIBUTING.md` / `README.md` if paths differ
- Modify: `docs/SSOT/BACKLOG.md` (`INFRA-OSS-3`)

- [ ] **Step 1: Write URL guard helper tests**

Create `scripts/__tests__/seed-glowe-local-guard.test.mjs` (or colocate assert in script and test via `node --test`):

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLocalSupabaseUrl } from '../seed-glowe-local.mjs';

test('accepts localhost', () => {
  assert.doesNotThrow(() => assertLocalSupabaseUrl('http://127.0.0.1:54321'));
});

test('rejects hosted supabase', () => {
  assert.throws(() => assertLocalSupabaseUrl('https://roeefqpdbftlndzsvhfj.supabase.co'));
});
```

- [ ] **Step 2: Implement `scripts/seed-glowe-local.mjs`**

- Export `assertLocalSupabaseUrl(url)` — allow only `127.0.0.1` / `localhost` hosts.
- Read `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from env (local values from `supabase status`).
- Exit non-zero on missing env or non-local URL.
- Seed a small fictional set: 2 orgs (1 pending), 3 individuals, a few wishes/opportunities/community posts — reuse shapes from `scripts/seed-glowe-dev.mjs` but with `@example.test` emails and deterministic UUIDs.
- Idempotent upserts.

- [ ] **Step 3: Implement `scripts/dev-up.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
command -v docker >/dev/null || { echo "Docker required"; exit 1; }
command -v supabase >/dev/null || { echo "Supabase CLI required"; exit 1; }
supabase start
supabase db reset
# parse status into env for seed — print snippet for app/.env.local
eval "$(supabase status -o env)"
export SUPABASE_URL="$API_URL"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
node scripts/seed-glowe-local.mjs
cat <<EOF
Local stack ready. Create app/.env.local with:
EXPO_PUBLIC_SUPABASE_URL=$API_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
Then: cd app && pnpm install && pnpm --filter @kc/glowe-web dev
EOF
```

(Adjust env var names to match actual `supabase status -o env` output.)

- [ ] **Step 4: Update `app/.env.example`**

Add a clearly marked LOCAL section and a warning that the hosted URL placeholders are for maintainers only.

- [ ] **Step 5: Manual verify**

```bash
./scripts/dev-up.sh
cd app && pnpm --filter @kc/glowe-web dev
# browser: localhost:4321 shows seeded orgs/wishes
```

- [ ] **Step 6: Commit + PR to `dev`**

```bash
git commit -m "$(cat <<'EOF'
feat(infra): add local Docker Supabase bring-up and fictional GLOWE seed

Mapped to spec: N/A. Keeps external contributors off hosted databases.
EOF
)"
```

Flip `INFRA-OSS-3` → ✅.

---

### Task 5: Snyk (blocked until token)

**Files:**
- Create: `.github/workflows/ci-snyk.yml` (after `SNYK_TOKEN` exists)

- [ ] **Step 1:** Confirm PM created Snyk org + `SNYK_TOKEN` repo/org secret.
- [ ] **Step 2:** Add workflow using `snyk/actions/node` against `app/` on PRs to `dev`/`main`; job name stable for future required-check promotion.
- [ ] **Step 3:** Leave **non-required** for first 1–2 weeks; then add to branch protection + ENVIRONMENTS table.
- [ ] **Step 4:** Flip `INFRA-OSS-4` → ✅ (or leave blocked note).

---

### Task 6: CodeRabbit (blocked until App install)

- [ ] **Step 1:** PM installs CodeRabbit GitHub App on `KarmaCummunity/GloWe`.
- [ ] **Step 2:** Optional `.coderabbit.yaml` with path filters prioritizing `app/apps/glowe-web/**`.
- [ ] **Step 3:** Verify a draft PR receives a CodeRabbit comment.
- [ ] **Step 4:** Flip `INFRA-OSS-5` → ✅.

---

### Task 7: GitGuardian (blocked until App/token)

- [ ] **Step 1:** PM installs GitGuardian App **or** provides `GITGUARDIAN_API_KEY`.
- [ ] **Step 2:** If CI: add workflow running `ggshield secret scan ci` on PRs.
- [ ] **Step 3:** Confirm secret scanning push protection remains enabled (already on).
- [ ] **Step 4:** Flip `INFRA-OSS-6` → ✅.

---

### Task 8: Ship PR + project hygiene

- [ ] **Step 1:** From `app/`: `pnpm typecheck && pnpm test && pnpm lint` if any JS seed script is imported by the monorepo test runner; otherwise N/A for pure docs.
- [ ] **Step 2:** PR to `dev` with Mapped to spec: N/A; auto-squash merge after green checks.
- [ ] **Step 3:** Ensure GitHub Project [GloWe](https://github.com/orgs/KarmaCummunity/projects/2) cards match BACKLOG statuses.
- [ ] **Step 4:** Flip `INFRA-OSS-1` → ✅ when docs landed.

---

## Spec coverage checklist

| Design section | Plan task |
| -------------- | --------- |
| §1 README | Task 1 |
| §2 LICENSE | Task 1 |
| §3 CONTRIBUTING | Task 1 (+ Task 4 updates) |
| §4 CoC / SECURITY / issue templates | Tasks 1–2 |
| §5 GitHub settings | Task 3 |
| §6 Merge gates | Tasks 1–2 (docs + SSOT), already enforced in CI |
| §7 Tooling matrix | Tasks 3, 5–7 |
| §8 Local Docker + seed | Task 4 |

## Placeholder / ambiguity scan

- No TBD left for docs content.
- Snyk / CodeRabbit / GitGuardian explicitly **blocked on PM org-admin** — do not invent tokens.
- `supabase status -o env` variable names must be confirmed at implementation time against the pinned CLI version.
