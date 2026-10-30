# Autonomous agent loop — rules & checklist

Split: KC bot owns spec, project book and issues; Claude Code writes code from the queue.
Script: [`scripts/agent-loop/`](../../scripts/agent-loop/README.md).

## Guardrails (non-negotiable)
- kc-dev only; never prod credentials or prod DB.
- PRs into `dev` only; never merge to `main`; the loop never merges anything.
- No deletions of branches/issues/files outside task scope; no force-push (only exception: the `ci/testflight-run` trigger branch, pending approval).
- Max 3 fix attempts per task, then label `agent-blocked` and move on.
- Security findings never appear in public issues, PRs, commits or comments.

## Per-task checklist
- [ ] Failing test written first.
- [ ] ≥2 test types: unit / integration (DB) / Maestro mobile E2E (#1235) / web e2e / screenshot diff.
- [ ] typecheck, lint (incl. `lint:arch`, i18n), unit tests, repo-rule scripts green.
- [ ] Security: secret scan, dependency audit, SAST, RLS/storage policy for any new table/bucket, security-review agent PASS.
- [ ] Independent reviewer agent `APPROVE` (CLAUDE.md + spec, no dead/duplicated code).
- [ ] Spec / TECH_DEBT updated; `app/VERSION` PATCH bumped.
- [ ] PR to `dev`, CI green.

## Session policy
- Session = Claude 5-hour quota window. On the limit message the loop sleeps until reset and resumes.
- ≥1 TestFlight build per session, plus one at session end if `dev` moved (push to `ci/testflight-run`).
- Daily summary to Nave (PRs opened, blocked tasks, builds).
