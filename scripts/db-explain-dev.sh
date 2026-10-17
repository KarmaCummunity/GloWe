#!/usr/bin/env bash
# Runs supabase/perf/explain/*.sql against the linked kc-dev project.
# Each query: READ ONLY transaction, authenticated role + seed-user JWT,
# one warm-up EXPLAIN ANALYZE, then the reported EXPLAIN (ANALYZE, BUFFERS).
# Always rolled back. Needs: PGURL_NOPASS (pooler URL without password) and
# PGPASSWORD in the environment. Prints plans + a timing summary only.
set -euo pipefail

dir="${1:-supabase/perf/explain}"
seed_email="${EXPLAIN_SEED_EMAIL:-user1@seed.kc.test}"
summary=()

run_psql() {
  psql "$PGURL_NOPASS" -X -q -v ON_ERROR_STOP=1 -P pager=off "$@"
}

echo "== diagnostics =="
printf 'begin read only;\n%s;\nrollback;\n' "$(cat "$dir/00_diagnostics.sql")" | run_psql -A -F ' | ' || echo "(diagnostics failed)"

for f in "$dir"/[1-9]*.sql; do
  name=$(basename "$f" .sql)
  q=$(cat "$f")
  sql="begin read only;
set local statement_timeout = '20s';
select set_config('request.jwt.claims',
  json_build_object('sub', (select id::text from auth.users where email = '$seed_email'),
                    'role', 'authenticated')::text, true) \\g /dev/null
set local role authenticated;
explain (analyze, costs off, timing off, summary off) $q \\g /dev/null
explain (analyze, buffers) $q;
rollback;"
  echo
  echo "== $name =="
  if out=$(printf '%s\n' "$sql" | run_psql -A -t 2>&1); then
    echo "$out"
    t=$(printf '%s\n' "$out" | sed -n 's/.*Execution Time: \([0-9.]*\) ms.*/\1/p' | tail -1)
    summary+=("$name ${t:-?} ms")
  else
    echo "$out"
    summary+=("$name ERROR")
  fi
done

echo
echo "== summary (execution time, warm) =="
printf '%s\n' "${summary[@]}"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  { echo '### kc-dev EXPLAIN ANALYZE (warm)'; echo '```'; printf '%s\n' "${summary[@]}"; echo '```'; } >> "$GITHUB_STEP_SUMMARY"
fi
