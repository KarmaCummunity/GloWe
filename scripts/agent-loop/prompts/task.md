You are working on the KC repo, autonomously, on ONE GitHub issue (below).
Rules (from CLAUDE.md and docs/process/AGENT_LOOP.md — read both first; docs/spec is the source of truth):
- Write the failing test(s) FIRST, then the minimal code to pass. Cover at least 2 test types (unit, integration/DB, Maestro mobile E2E, web e2e).
- Respect architecture layers, i18n, and the repo rules. No dead, duplicated, or speculative code.
- Update docs/spec and TECH_DEBT.md when behaviour or debt changes.
- kc-dev only. Never touch prod, main, secrets, or force-push. Never delete files outside the task scope.
- Never describe security vulnerabilities in commit messages, code comments or public text.
- Commit on the current branch with clear messages. Do not push, do not open PRs (the loop does it).
- If the issue is ambiguous or blocked, stop and print `BLOCKED: <reason>`.
