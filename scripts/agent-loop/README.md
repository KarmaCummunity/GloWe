# KC agent loop (Claude Code)

**Primary:** Claude Code Scheduled task (cloud). Paste [`prompts/scheduled-task.md`](prompts/scheduled-task.md) into `/schedule` (or claude.ai/code/routines), hourly. Hourly Hebrew log: issue #1257.

**Below: optional local fallback** (`run-loop.sh`).

Runs Claude Code headless on queued GitHub issues, one at a time, with gates, security review,
independent reviewer, PR to `dev`, TestFlight per session, and auto-resume after the quota resets.
Rules: [`docs/process/AGENT_LOOP.md`](../../docs/process/AGENT_LOOP.md).

## Setup (macOS)
1. `npm i -g @anthropic-ai/claude-code` then `claude` once to log in (subscription). <!-- TODO-verify install cmd -->
2. `brew install gh gitleaks semgrep` and `gh auth login` (token scoped to KarmaCummunity/KC).
3. Maestro (optional until #1235): `curl -Ls "https://get.maestro.mobile.dev" | bash`.
4. Put dev-only keys in `.env.local` at repo root (git-ignored, never committed). kc-dev only.
5. Queue an issue: labels `agent-queue` + `priority:P0..P3`. Do **not** use `agent-ready` (it triggers auto-merge).

## Start
```bash
nohup scripts/agent-loop/run-loop.sh > ~/.kc-agent-loop/nohup.out 2>&1 &
```
launchd (survives reboots): create `~/Library/LaunchAgents/org.karmacommunity.agentloop.plist` with
`ProgramArguments` = `/bin/bash -lc "cd ~/KC && scripts/agent-loop/run-loop.sh"`, `KeepAlive` true,
then `launchctl load ~/Library/LaunchAgents/org.karmacommunity.agentloop.plist`.
Prevent sleep: `caffeinate -s` while running.

## Env knobs
`QUEUE_LABEL`, `MAX_ATTEMPTS` (3), `SESSION_HOURS` (5), `CLAUDE_MAX_TURNS`, `QUOTA_FALLBACK_SLEEP` (1800s).
Logs: `~/.kc-agent-loop/logs`. Summary: `scripts/agent-loop/daily-summary.sh`.
