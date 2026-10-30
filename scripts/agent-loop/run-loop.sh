#!/usr/bin/env bash
# KC autonomous Claude Code dev loop. Spec: docs/process/AGENT_LOOP.md
# Picks issues labeled $QUEUE_LABEL (default agent-queue) by priority:P0..P3,
# implements via headless `claude -p`, runs gates + security + reviewer, opens PR to dev.
# NEVER merges, never touches main/prod, never force-pushes or deletes.
set -uo pipefail

REPO="${KC_REPO:-KarmaCummunity/KC}"
BASE="${KC_BASE:-dev}"
QUEUE_LABEL="${QUEUE_LABEL:-agent-queue}"     # NOT `agent-ready` (that label triggers auto-merge)
BLOCKED_LABEL="${BLOCKED_LABEL:-agent-blocked}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-3}"
SESSION_HOURS="${SESSION_HOURS:-5}"
ROOT="$(git rev-parse --show-toplevel)"
HERE="$ROOT/scripts/agent-loop"
LOG_DIR="${LOG_DIR:-$HOME/.kc-agent-loop/logs}"
STATE_DIR="${STATE_DIR:-$HOME/.kc-agent-loop/state}"
# TODO-verify: flag names against `claude --help` for the installed CLI version.
CLAUDE_FLAGS=(--output-format text --max-turns "${CLAUDE_MAX_TURNS:-80}" --permission-mode acceptEdits
  --allowedTools "Read,Edit,Write,Glob,Grep,Bash(pnpm:*),Bash(npx:*),Bash(node:*),Bash(git status:*),Bash(git diff:*),Bash(git add:*),Bash(git commit:*)")
# TODO-verify: exact usage-limit message text. Current guess covers known variants.
LIMIT_RE='(usage limit reached|limit reached\|[0-9]+|5-hour limit|rate.?limit|Claude AI usage limit|resets (at )?[0-9])'

mkdir -p "$LOG_DIR" "$STATE_DIR"
LOG="$LOG_DIR/loop-$(date +%Y%m%d).log"
log() { echo "[$(date '+%F %T %Z')] $*" | tee -a "$LOG"; }

# Env: load .env.local (never committed) for dev-only keys. Refuse prod.
[ -f "$ROOT/.env.local" ] && { set -a; . "$ROOT/.env.local"; set +a; }
if env | grep -qiE '^[A-Z_]*(SUPABASE_URL|PROJECT_REF)[A-Z_]*=.*prod'; then
  log "ABORT: env looks like prod. kc-dev only."; exit 1; fi
command -v claude >/dev/null && command -v gh >/dev/null || { log "need claude + gh"; exit 1; }

# ---------- quota handling ----------
sleep_until_reset() {
  local out="$1" secs=""
  # TODO-verify: some versions print "...|<epoch>"; others "resets 3pm". Try epoch first.
  local epoch; epoch="$(grep -oE 'limit reached\|[0-9]{10}' <<<"$out" | grep -oE '[0-9]{10}' | head -1)"
  if [ -n "$epoch" ]; then secs=$(( epoch - $(date +%s) + 60 )); fi
  [ -z "$secs" ] || [ "$secs" -le 0 ] && secs="${QUOTA_FALLBACK_SLEEP:-1800}"
  log "Quota limit hit; sleeping ${secs}s then resuming."
  maybe_testflight end   # session ended: ship if new merges
  sleep "$secs"
  SESSION_START=$(date +%s); BUILT_THIS_SESSION=0
}

run_claude() { # $1 prompt-file-content, $2 log file. Returns 2 on quota.
  local out rc
  out="$(claude -p "$1" "${CLAUDE_FLAGS[@]}" 2>&1)"; rc=$?
  echo "$out" >> "$2"
  if grep -qiE "$LIMIT_RE" <<<"$out"; then sleep_until_reset "$out"; return 2; fi
  LAST_OUT="$out"; return $rc
}

# ---------- TestFlight policy ----------
SESSION_START=$(date +%s); BUILT_THIS_SESSION=0
maybe_testflight() { # $1 = tick|end
  local last_sha new_sha; last_sha="$(cat "$STATE_DIR/last_tf_sha" 2>/dev/null)"
  git fetch -q origin "$BASE"; new_sha="$(git rev-parse "origin/$BASE")"
  [ "$new_sha" = "$last_sha" ] && return 0
  local elapsed=$(( $(date +%s) - SESSION_START ))
  if [ "$1" = end ] || { [ "$BUILT_THIS_SESSION" = 0 ] && [ $elapsed -ge $(( SESSION_HOURS*3600 - 1800 )) ]; }; then
    log "Triggering TestFlight at $new_sha (push to ci/testflight-run)"
    # Updates a CI trigger branch only; never main/dev. Non-fast-forward is expected -> uses --force-with-lease ONLY on this trigger branch.
    # TODO-verify with Nave: acceptable, or switch to `gh workflow run testflight-ios.yml --ref dev`.
    git push -q origin "$new_sha:refs/heads/ci/testflight-run" --force-with-lease=ci/testflight-run 2>>"$LOG" \
      || gh workflow run testflight-ios.yml -R "$REPO" --ref "$BASE" >>"$LOG" 2>&1
    echo "$new_sha" > "$STATE_DIR/last_tf_sha"; BUILT_THIS_SESSION=1
  fi
}

# ---------- gates ----------
run_gates() { # writes $1 with failures; returns nonzero on failure
  local f="$1"; : > "$f"
  ( cd "$ROOT/app" && pnpm typecheck ) >>"$f" 2>&1 || { echo "GATE typecheck FAILED" >>"$f"; return 1; }
  ( cd "$ROOT/app" && pnpm lint ) >>"$f" 2>&1 || { echo "GATE lint/arch FAILED" >>"$f"; return 1; }
  ( cd "$ROOT/app" && pnpm test ) >>"$f" 2>&1 || { echo "GATE unit FAILED" >>"$f"; return 1; }
  ( cd "$ROOT/app" && pnpm test:scripts && pnpm check:backend-guards ) >>"$f" 2>&1 || { echo "GATE repo-rules FAILED" >>"$f"; return 1; }
  # TODO-verify: integration (DB vs kc-dev/local supabase) script name — tracked in quality-gates issue.
  [ -x "$HERE/gates/integration.sh" ] && { "$HERE/gates/integration.sh" >>"$f" 2>&1 || { echo "GATE integration FAILED" >>"$f"; return 1; }; }
  # Maestro mobile E2E (#1235) once flows exist.
  if command -v maestro >/dev/null && [ -d "$ROOT/app/apps/mobile/.maestro" ]; then
    maestro test "$ROOT/app/apps/mobile/.maestro" >>"$f" 2>&1 || { echo "GATE maestro FAILED" >>"$f"; return 1; }; fi
  # Security (local, findings stay local)
  command -v gitleaks >/dev/null && { gitleaks detect --no-banner --log-opts "origin/$BASE..HEAD" >>"$f" 2>&1 || { echo "GATE secrets FAILED" >>"$f"; return 1; }; }
  command -v semgrep >/dev/null && { semgrep scan --config auto --error --quiet $(git diff --name-only "origin/$BASE"...HEAD -- '*.ts' '*.tsx' '*.sql' | tr '\n' ' ') >>"$f" 2>&1 || { echo "GATE sast FAILED" >>"$f"; return 1; }; }
  ( cd "$ROOT/app" && pnpm audit --prod --audit-level high ) >>"$f" 2>&1 || echo "WARN dependency audit (see docs exceptions)" >>"$f"
  # At least 2 test types touched
  local types=0
  git diff --name-only "origin/$BASE"...HEAD | grep -qE '\.test\.(ts|tsx|mjs)$' && types=$((types+1))
  git diff --name-only "origin/$BASE"...HEAD | grep -qE '(integration|\.int\.test)' && types=$((types+1))
  git diff --name-only "origin/$BASE"...HEAD | grep -qE '\.maestro/.*\.ya?ml$' && types=$((types+1))
  git diff --name-only "origin/$BASE"...HEAD | grep -qE 'tests/e2e/' && types=$((types+1))
  if git diff --name-only "origin/$BASE"...HEAD | grep -qvE '^(docs/|.*\.md$)' && [ $types -lt 2 ]; then
    echo "GATE test-types FAILED: need >=2 test types (unit/integration/maestro/e2e), got $types" >>"$f"; return 1; fi
  return 0
}

# ---------- main loop ----------
log "Loop start (repo=$REPO base=$BASE queue=$QUEUE_LABEL)"
while :; do
  maybe_testflight tick
  ISSUE=""
  for p in P0 P1 P2 P3; do
    ISSUE="$(gh issue list -R "$REPO" --state open --label "$QUEUE_LABEL" --label "priority:$p" \
      --search "-label:$BLOCKED_LABEL no:assignee" --json number --jq 'sort_by(.number)|.[0].number // empty')"
    [ -n "$ISSUE" ] && break
  done
  if [ -z "$ISSUE" ]; then log "Queue empty; sleeping 15m"; sleep 900; continue; fi

  TITLE="$(gh issue view "$ISSUE" -R "$REPO" --json title --jq .title)"
  BODY="$(gh issue view "$ISSUE" -R "$REPO" --json body --jq .body)"
  BR="agent/issue-$ISSUE"
  ILOG="$LOG_DIR/issue-$ISSUE-$(date +%s).log"
  log "Picked #$ISSUE: $TITLE"
  gh issue edit "$ISSUE" -R "$REPO" --add-assignee @me >/dev/null 2>&1
  git fetch -q origin "$BASE" && git checkout -q -B "$BR" "origin/$BASE"

  PROMPT="$(cat "$HERE/prompts/task.md")
ISSUE #$ISSUE: $TITLE
$BODY"
  run_claude "$PROMPT" "$ILOG"; rc=$?
  [ $rc = 2 ] && { gh issue edit "$ISSUE" -R "$REPO" --remove-assignee @me >/dev/null 2>&1; continue; }

  ok=0
  for a in $(seq 1 "$MAX_ATTEMPTS"); do
    GF="$STATE_DIR/gates-$ISSUE.txt"
    if run_gates "$GF"; then ok=1; break; fi
    log "#$ISSUE gates failed (attempt $a/$MAX_ATTEMPTS)"
    [ "$a" = "$MAX_ATTEMPTS" ] && break
    run_claude "Gates failed. Fix only what is needed. Failure tail:
$(tail -c 6000 "$GF")" "$ILOG"; [ $? = 2 ] && { a=$((a-1)); }
  done

  if [ $ok = 1 ]; then
    DIFF="$(git diff "origin/$BASE"...HEAD | head -c 120000)"
    run_claude "$(cat "$HERE/prompts/security.md")
$DIFF" "$ILOG"; SEC="$LAST_OUT"
    # Security findings stay in local logs only.
    if ! grep -q 'SECURITY: PASS' <<<"$SEC"; then ok=0; log "#$ISSUE security review did not pass (details in local log only)"; fi
  fi
  if [ $ok = 1 ]; then
    run_claude "$(cat "$HERE/prompts/reviewer.md")
ISSUE #$ISSUE: $TITLE
$DIFF" "$ILOG"; REV="$LAST_OUT"
    grep -q 'REVIEW: APPROVE' <<<"$REV" || { ok=0; log "#$ISSUE reviewer requested changes"; }
  fi

  if [ $ok = 1 ]; then
    ( cd "$ROOT" && node scripts/bump-app-version.mjs >/dev/null 2>&1 && git add app/VERSION && git commit -qm "chore: bump app version" ) || true
    git push -q -u origin "$BR"
    URL="$(gh pr create -R "$REPO" --base "$BASE" --head "$BR" --title "$TITLE (#$ISSUE)" \
      --body "Closes #$ISSUE

Automated by scripts/agent-loop. Gates passed; independent reviewer approved; security review passed (details kept private).
Mapped to spec: see issue." 2>>"$LOG")"
    log "#$ISSUE PR opened: $URL"
    echo "$(date +%F) #$ISSUE PR $URL" >> "$STATE_DIR/daily.txt"
  else
    gh issue edit "$ISSUE" -R "$REPO" --add-label "$BLOCKED_LABEL" --remove-assignee @me >/dev/null 2>&1
    gh issue comment "$ISSUE" -R "$REPO" --body "Agent loop: blocked after $MAX_ATTEMPTS attempts (gates/review). Needs human look." >/dev/null 2>&1
    echo "$(date +%F) #$ISSUE BLOCKED" >> "$STATE_DIR/daily.txt"
    git checkout -q "$BASE" 2>/dev/null || true
  fi
done
