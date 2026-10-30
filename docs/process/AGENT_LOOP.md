# Autonomous agent loop — rules & checklist

Split: KC bot owns spec, project book and issues; Claude Code writes code from the queue.
Primary runner: **Claude Code Scheduled task** (Anthropic cloud, Max subscription), hourly, ≤15 runs/day.
Prompt: [`scripts/agent-loop/prompts/scheduled-task.md`](../../scripts/agent-loop/prompts/scheduled-task.md).
Local fallback: [`scripts/agent-loop/run-loop.sh`](../../scripts/agent-loop/README.md).

## Run model
- Each run = fresh repo clone, no local files. Needed secrets live in GitHub Actions secrets or the cloud environment's env vars, never in the repo.
- One `agent-queue` issue per run (skip `agent-blocked`), branch `agent/<n>-<slug>`, PR to `dev`.
- End of every run: short Hebrew summary comment on the pinned tracking issue #1257 (label `agent-log`).

## Guardrails (non-negotiable)
- kc-dev only; never prod credentials or prod DB.
- PRs into `dev` only; never merge; never `main`.
- No deletions, no force-push.
- Max 3 fix attempts per task, then label `agent-blocked` and move on.
- Security findings never appear in public issues, PRs, commits or comments (label `agent-blocked`, vague note only).

## Per-task checklist
- [ ] Failing test first; ≥2-3 tests of ≥2 types (unit / integration / Maestro E2E #1235 / web e2e).
- [ ] typecheck, lint (incl. `lint:arch`, i18n), unit tests, repo-rule scripts green.
- [ ] Security: secret scan, dependency audit, RLS/storage policy for new tables/buckets, security self-review.
- [ ] No needless code; spec / TECH_DEBT updated; `app/VERSION` PATCH bumped.
- [ ] PR to `dev`, CI green.

## TestFlight policy
- ≥1 build per 5-hour window: if no "TestFlight iOS" run in the last 5h and `dev` CI is green, `gh workflow run testflight-ios.yml --ref dev`.
