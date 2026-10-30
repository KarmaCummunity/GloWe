#!/usr/bin/env bash
# Prints today's loop summary (PRs opened / blocked). Delivery channel to Nave: TODO (see epic).
S="${STATE_DIR:-$HOME/.kc-agent-loop/state}/daily.txt"
d="${1:-$(date +%F)}"; echo "KC agent loop — $d"; grep "^$d" "$S" 2>/dev/null || echo "no activity"
