# Open-Source Contributor Strategy for GLOWE — Design

**Status:** Approved by PM (2026-07-12). Amended same day with merge-gate,
security-tooling, local-DB, and a formal **CLA** document (PM 2026-07-12).
Ready for implementation.

## Context

The KarmaCommunity/GloWe repo is public but has no README, LICENSE, CONTRIBUTING.md,
SECURITY.md, or issue templates. `AGENTS.md` already directs internal agents that
GLOWE (`app/apps/glowe-web/**`) is the sole active product and the KC mobile
frontend (`app/apps/mobile/**`) is paused — but that framing is invisible to
anyone outside the current agent/PM loop.

The PM wants to open the repo to volunteer programmers worldwide: they can read
the code and submit PRs, but may not copy the code for private/commercial reuse.
The PM retains sole merge authority on `main` and `dev`.

## Goals

1. Make the GLOWE-only focus and KC-paused status obvious to a first-time visitor.
2. Give external contributors everything they need to set up, build, and open a
   PR without needing the internal agent-process context in `CLAUDE.md`.
3. Protect the project's IP: contributions welcome, code reuse outside the
   project is not licensed.
4. Harden the repo/CI against a stranger's first PR without adding friction for
   contributors after their first accepted PR.
5. Keep merge control on `main`/`dev` with the PM (`@navesarussi`) exclusively.
6. External contributors develop against a **local** Supabase stack (Docker) with
   fictional seed data — never against shared hosted DB credentials.
7. Every PR into `dev` must pass the automated test/quality gates; `main` is
   reachable only from `dev` and only after the full release-check set is green.

## Non-goals

- No repo split between KC and GLOWE — framing/documentation change only, not an
  architecture change (except the additive local-dev Docker/seed work in §8).
- No CLA **signing bot** / DCO bot automation (flagged as a future upgrade). A
  formal `CLA.md` document **is** in scope; acceptance is by opening a PR
  (checkbox in the PR template + statement in `CONTRIBUTING.md`).
- No change to `CODEOWNERS` or collaborator roles (decided in a prior session:
  leave the 5 existing admin-role collaborators as-is).
- No change to branch protection's `required_approving_review_count: 0` — kept
  as documented below.
- No requirement that external contributors obtain SonarCloud / Snyk /
  CodeRabbit / GitGuardian accounts — those run as CI/org integrations against
  PRs; contributors only need Docker + pnpm locally.

## Design

### 1. `README.md` (new, root)

English, written for a first-time visitor with zero context. Sections, in order:

1. **Status banner** (bold, top of file): KC mobile app development is paused;
   all active development targets GLOWE (`app/apps/glowe-web/`); the two share
   the KC Supabase backend.
2. **What GLOWE is** — one paragraph, plain language.
3. **Quickstart** — clone, `pnpm install`, env setup pointer (`app/.env.example`),
   command to run GLOWE web locally. Full detail deferred to `CONTRIBUTING.md`.
4. **Repo map** — short annotated tree: `app/apps/glowe-web` (active),
   `app/apps/mobile` (KC, paused), `supabase/` (shared backend),
   `docs/SSOT/` (internal specs — link, not required reading for a first PR).
5. **License** — one line + link to `LICENSE`.
6. **Contributing** — one line + link to `CONTRIBUTING.md`.
7. **Security** — one line + link to `SECURITY.md`.

### 2. `LICENSE` (new, root) — All Rights Reserved (contribution-visibility only)

Must be a **source-available / no-reuse** notice (not MIT/Apache/GPL). Exact
intent:

1. Title line: `Copyright (c) 2026 KarmaCommunity. All rights reserved.`
2. Visibility: source is published for transparency and to enable contributions
   to **this** repository only.
3. No grant: no license to copy, modify, redistribute, sublicense, commercially
   reuse, or create derivative works **outside** contributing via pull requests
   to this repository.
4. Contributions: inbound contributions are governed by `CLA.md` (and the
   contribution process in `CONTRIBUTING.md`).
5. Trademarks: KarmaCommunity / GLOWE names and marks are not licensed.
6. Disclaimer: software provided "AS IS", no warranties.

Do **not** use an OSI open-source license text. Do **not** imply SPDX
`MIT`/`Apache-2.0`.

### 2b. `CLA.md` (new, root) — Contributor License Agreement

Formal Individual (and short Entity) CLA. Not lawyer-certified; project-owned
template adapted from common OSS CLA structure for an All-Rights-Reserved host
project.

Required terms:

1. **Acceptance:** By opening a pull request (or checking the CLA box in the PR
   template), the contributor agrees to this CLA.
2. **Copyright license:** Contributor grants KarmaCommunity a perpetual,
   worldwide, royalty-free, irrevocable, non-exclusive license to use,
   reproduce, prepare derivative works of, publicly display/perform, sublicense,
   and distribute the contribution, and to relicense the contribution as part of
   the project under any terms KarmaCommunity chooses (including proprietary).
3. **Patent license:** Contributor grants a patent license for claims necessarily
   infringed by their contribution alone or in combination with the project.
4. **Original work / right to submit:** Contributor represents they are legally
   entitled to grant the above; if employer rights apply, they have permission
   or use the Entity CLA section.
5. **Attribution:** Contributor retains copyright in their contribution;
   KarmaCommunity will preserve reasonable authorship credit (e.g. git history).
6. **No obligation:** KarmaCommunity is not obligated to use any contribution.
7. **Entity CLA:** short second section for contributions made on behalf of an
   employer/organization.

Wire into:

- `CONTRIBUTING.md` § Contributor Terms → link to `CLA.md` (do not duplicate the
  full legal text).
- `.github/PULL_REQUEST_TEMPLATE.md` → required checkbox:
  `I agree to the [Contributor License Agreement](../CLA.md)`.
- `README.md` → Contributing line may mention CLA.

### 3. `CONTRIBUTING.md` (new, root)

Written for an external contributor, not an internal agent. Sections:

1. **Scope** — GLOWE contributions welcome; KC-frontend PRs will be redirected/
   closed (link `AGENTS.md`'s standing directive so the reason is traceable).
2. **Contributor Terms** — short pointer: opening a PR means you agree to
   `CLA.md`; do not paste the full CLA here.
3. **Dev setup** — Docker + `supabase start` (local stack), `pnpm install`,
   env vars pointing at **local** keys from `supabase status` (reference
   `app/.env.example` with a local override section), explicit warning never to
   commit real secrets/credentials and never to point local `.env` at hosted
   `dev`/`prod` projects. How to run GLOWE web locally, how to seed fictional
   data (`pnpm`/`node` script), how to run
   `pnpm typecheck && pnpm test && pnpm lint` from `app/`.
4. **Branch & PR flow** — fork the repo, branch, PR against `dev` (never
   `main`), wait for `@navesarussi` review and merge. State explicitly that
   contributors do not have push access and all merges are maintainer-controlled.
   Document: **tests + required CI checks must be green to merge into `dev`**;
   **`main` accepts only PRs whose head is `dev`**, after the full release gate
   set (see §6).
5. **Commit/PR conventions** — simplified excerpt of `CLAUDE.md` §6: Conventional
   Commits format, and what the required "Mapped to spec" PR-body line means for
   an external contributor (`N/A` is an acceptable, common answer for most
   external PRs that aren't tied to a tracked `FR-*`).
6. **Code style / merge bar** — passing lint/typecheck/test (and the rest of the
   required status checks on `dev`) is the acceptance bar; point to existing
   scripts. New security scanners (Snyk / GitGuardian / etc.) join the bar when
   wired as required checks (§7).
7. **Who reviews** — `@navesarussi` is sole merge authority on `main`/`dev`
   (matches existing root `CODEOWNERS` entry, unchanged). CodeRabbit (when
   enabled) posts non-blocking review comments; it does not merge.

### 4. Governance & security docs (new, root + `.github/`)

- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1 boilerplate, enforcement
  contact `karmacommunity2.0@gmail.com` (matches the project's existing
  no-outbound-automation convention — reports arrive manually, nothing automated
  sends mail).
- `SECURITY.md` — responsible disclosure instructions: prefer GitHub's private
  vulnerability reporting (to be enabled, see §5) with `karmacommunity2.0@gmail.com`
  as the fallback contact; explicit ask not to open public issues for
  unpatched vulnerabilities.
- `.github/ISSUE_TEMPLATE/bug_report.md` and
  `.github/ISSUE_TEMPLATE/feature_request.md` — lightweight structured templates
  (currently only `.github/PULL_REQUEST_TEMPLATE.md` exists).

### 5. GitHub repo settings changes

- **Actions → Fork pull request workflows**: require approval for first-time
  contributors (already-approved PM decision). Applied via `gh api` /
  repo settings UI (whichever the API supports — investigate exact endpoint
  during implementation; documented as a manual step in the PR/runbook if the
  API doesn't expose it).
- **Enable GitHub Discussions** (PM decision: GitHub-only comms for now, no
  external Discord/Slack).
- **Enable private vulnerability reporting** (supports `SECURITY.md`).
- **No change** to branch protection's `required_approving_review_count: 0` on
  `main`/`dev`. Rationale documented inline in `CONTRIBUTING.md`/design: external
  contributors have no write access, so the GitHub merge button is unavailable
  to them regardless of required-review count — only collaborators with write/
  admin access (currently the existing 5) can merge, and per `CLAUDE.md` §6
  every non-hotfix change already requires a PR. Tightening this could also
  interfere with the autonomous-loop mode in `CLAUDE.md` §13, which assumes
  zero-review agent operation on `dev`. Flagged as a future decision, not made
  here.
- **No change** to `CODEOWNERS` or collaborator roles (prior-session decision,
  reaffirmed).

### 6. Merge gates (tests & release path) — amendment 2026-07-12

**Policy (PM):**

1. **Into `dev`:** a PR may merge only when all **required status checks** are
   green. Unit tests and integration tests are part of that bar (today:
   `typecheck · test · lint` in `CI — frontend`, plus backend SQL probes /
   contract / SonarCloud quality gate — see
   [`docs/SSOT/ENVIRONMENTS.md`](../../SSOT/ENVIRONMENTS.md) "Dev merge gates").
2. **Into `main`:** only via a PR whose **head branch is `dev`** (already
   enforced by `CI — main release guard` / `release PR source is dev`), and
   only after the full **main** required-check set is green (see
   [`docs/SSOT/RELEASE_CHECKLIST.md`](../../SSOT/RELEASE_CHECKLIST.md)
   "Merge gates").

**Implementation work for this amendment:**

- Document the policy clearly in `README.md` (one sentence) and
  `CONTRIBUTING.md` (short "Merge bar" subsection) so external contributors see
  it without reading `CLAUDE.md`.
- Audit branch-protection required checks on `dev` and `main` against the SSOT
  tables; add any missing check that the PM listed in §7 once that tool is
  wired.
- Do **not** loosen existing gates. SonarCloud is already a required check on
  `dev`/`main` even though it is missing from the ENVIRONMENTS table — fix the
  SSOT table drift in the same PR that lands the docs.

### 7. Security & quality tooling matrix — amendment 2026-07-12

PM-requested scanners. Inventory against current repo state (2026-07-12):

| # | Tool | Current state | Target for contributor-open |
| - | ---- | ------------- | --------------------------- |
| 1 | **SonarCloud** (SonarQube SaaS) | ✅ Wired (`.github/workflows/ci-sonar.yml`); required status check `SonarCloud quality gate` on `dev`/`main`. Docs: `docs/dev/SONAR.md`. | Keep required. Mention in CONTRIBUTING merge bar. Fix ENVIRONMENTS SSOT table to list it. |
| 2 | **Snyk** | ❌ Not present. | Add CI workflow (or Snyk GitHub App) scanning `app/pnpm-lock.yaml` + Docker base images on PRs to `dev`/`main`. Start as **non-blocking** comment/check; promote to required after first clean baseline. Needs org `SNYK_TOKEN` secret. |
| 3 | **CodeRabbit** | ❌ Not present. | Install CodeRabbit GitHub App on `KarmaCummunity/GloWe` (org admin UI). Reviews PRs with AI comments; **non-merging**, does not replace `@navesarussi`. Optional `.coderabbit.yaml` for GLOWE-path focus. |
| 4 | **GitHub Dependabot** | 🟡 Config exists (`.github/dependabot.yml` → weekly npm + monthly Actions on `dev`). **Dependabot security updates** repo setting is currently **disabled**. | Enable Dependabot security updates via repo settings API/UI. Keep version updates as-is. |
| 5 | **GitGuardian** | ❌ Not present. | Add GitGuardian GitHub App **or** `ggshield` CI job on PRs. Prefer App for push-time scanning. Needs org install + token if CI-based. |
| 6 | **Secret Scanning** | ✅ Enabled + push protection enabled on the public repo. Validity checks / non-provider patterns still off. | Keep. Document in `SECURITY.md`. Optionally enable validity checks. |
| 7 | **Automated tests** (unit + integration) | ✅ Required: Vitest unit suite via `typecheck · test · lint`; backend integration via `apply migrations · rls · types · sql probes`; E2E GloWe journeys required on `main` release PRs. | Keep. CONTRIBUTING must tell contributors how to run the local subset before opening a PR. |

**Ordering:** docs + settings (§1–§5) first; then Dependabot security updates +
Secret Scanning documentation (zero new vendors); then Snyk / GitGuardian /
CodeRabbit (each needs an org-admin credential or App install — flag as
**[blocked: needs PM org-admin action]** in BACKLOG/project cards until the
token/App is available).

### 8. Local-first contributor database (Docker + fictional seed) — amendment 2026-07-12

**Problem:** Opening the repo to strangers must not leak hosted `dev`/`prod`
data or service-role keys. Today `app/.env.example` points at a hosted Supabase
URL pattern, `supabase/seed.sql` only seeds cities, and the rich GloWe dataset
lives in `scripts/seed-glowe-dev.mjs` which targets the **hosted** DEV project
(service role — correctly prod-ref-guarded, but still not safe to hand to
external contributors).

**Design:**

1. **Local stack via Supabase CLI + Docker** (Supabase local already uses Docker
   under the hood — no separate bespoke compose unless the CLI path proves
   insufficient). Document in `CONTRIBUTING.md`:
   - Install Docker Desktop + Supabase CLI.
   - From repo root: `supabase start` → `supabase db reset` (applies migrations +
     `seed.sql`).
   - Copy local API URL + anon key from `supabase status` into `app/.env.local`
     (gitignored). Never commit service-role keys.
2. **Fictional local seed** — extend local seeding so a contributor gets a usable
   GLOWE sandbox after `db reset`:
   - Prefer a **local-only** SQL seed file (e.g. `supabase/seed-glowe-local.sql`
     included from `seed.sql` or loaded by a small `scripts/seed-glowe-local.mjs`
     that talks to `http://127.0.0.1:54321` only and refuses any non-local URL).
   - Reuse the persona/content shape from `scripts/seed-glowe-dev.mjs` where
     practical, but with clearly fake names/emails (`local-*@example.test`) and
     **no** dependency on hosted service-role secrets.
   - Idempotent; safe to re-run; never touches hosted projects.
3. **Smart Docker packaging (optional nicety, same epic):** a thin
   `docker compose` (or documented one-liner script `scripts/dev-up.sh`) that
   wraps `supabase start` + prints the env snippet + runs the local seed, so
   first-time setup is one command. Prefer wrapping the official Supabase local
   stack over reinventing Postgres/GoTrue/Storage containers.
4. **CONTRIBUTING hard rule:** external contributors must not request or use
   hosted DEV/PROD credentials. Maintainer-only workflows
   (`seed-glowe-dev.yml`, etc.) stay internal.

**Out of scope for v1 of this epic:** running the full Playwright GloWe E2E
suite against every contributor's laptop (E2E stays on CI against the maintained
dev deploy). Local bar = unit/integration + manual GLOWE click-through on
localhost.

## Verification

- `README.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
  render correctly on GitHub (markdown lint / preview).
- Issue templates appear correctly in GitHub's "New issue" chooser.
- Actions fork-PR-approval setting and Discussions/private-vuln-reporting
  toggles verified via `gh api` read-back after enabling.
- Branch-protection required checks on `dev`/`main` still include
  `typecheck · test · lint` (and SonarCloud); `ci-main-guard` still enforces
  `dev` → `main`.
- Local path: fresh clone → Docker → `supabase start` → seed → GLOWE web serves
  fictional data with zero hosted credentials.
- Tooling matrix (§7): each row either verified-already-on or tracked as a
  project card with clear owner (agent vs PM org-admin).
- Docs/governance PRs map to spec as `N/A` (`CLAUDE.md` §4). Local-seed / CI
  wiring PRs that change runtime contributor tooling still use `N/A` unless an
  `FR-*` is touched; update `BACKLOG.md` INFRA rows for those tasks.

## Risk / rollout

- **Docs + repo settings:** low risk — additive.
- **Fork-PR-approval gate:** friction only for first-time external contributors.
- **Snyk / GitGuardian / CodeRabbit:** medium process risk — need org-admin
  installs and a quiet baseline period before making checks required, otherwise
  agent/autonomous-loop PRs on `dev` can stall.
- **Local Docker + seed:** medium contributor-UX risk if Docker/Supabase CLI
  versions drift; mitigate with pinned CLI version in CONTRIBUTING and a
  smoke script. Zero risk to hosted data if the local seed hard-refuses
  non-localhost URLs.
