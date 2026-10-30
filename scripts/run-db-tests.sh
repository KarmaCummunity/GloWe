#!/usr/bin/env bash
# Runs every DB test against the LOCAL Supabase stack (G44). Used by CI — backend and
# by agents locally, so both run exactly the same suite in the same order:
#   1. install the shared harness (supabase/tests/_harness/*.sql, lexical order)
#   2. per-migration regression tests (supabase/tests/*.sql)
#   3. per-world lifecycle flow tests (supabase/tests/flows/*.sql)
#
# Usage: scripts/run-db-tests.sh [file.sql ...]   (no args = the full suite)
# Env:   PGHOST (default 127.0.0.1), PGPORT (default 54322), PGPASSWORD (default postgres)
set -euo pipefail
shopt -s nullglob

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly TESTS_DIR="$ROOT/supabase/tests"
export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-54322}"
export PGPASSWORD="${PGPASSWORD:-postgres}"

# The harness creates a schema and the tests write rows: refuse anything but a local stack.
case "$PGHOST" in
  127.0.0.1 | localhost | ::1) ;;
  *)
    echo "run-db-tests: refusing to run against non-local host '$PGHOST'" >&2
    exit 2
    ;;
esac

run_sql() {
  psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f "$1"
}

echo "── Installing test harness ──"
for f in "$TESTS_DIR"/_harness/*.sql; do
  run_sql "$f"
done

if (($# > 0)); then
  files=("$@")
else
  files=("$TESTS_DIR"/*.sql "$TESTS_DIR"/flows/*.sql)
fi

for f in "${files[@]}"; do
  echo "── Running ${f#"$ROOT"/} ──"
  run_sql "$f"
done

echo "✓ ${#files[@]} DB test file(s) passed"
