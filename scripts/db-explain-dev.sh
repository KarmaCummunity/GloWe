#!/usr/bin/env bash
# Runs supabase/perf/explain/*.sql against the linked kc-dev project.
#
# Each query runs as the `authenticated` role with the seed user's JWT, gets one
# warm-up EXPLAIN ANALYZE, then the reported EXPLAIN (ANALYZE, BUFFERS).
#
#   baseline   READ ONLY transaction, rolled back.
#   candidate  only when the repo has migrations newer than the last one applied
#              on kc-dev: those migrations are applied inside the transaction
#              (their own begin/commit stripped), the query is explained, and the
#              whole transaction is rolled back. Nothing persists.
#
# Needs PGURL_NOPASS (pooler URL without password) and PGPASSWORD. Prints plans
# and a timing summary only.
set -euo pipefail

dir="${1:-supabase/perf/explain}"
mig_dir="${MIGRATIONS_DIR:-supabase/migrations}"
seed_email="${EXPLAIN_SEED_EMAIL:-user1@seed.kc.test}"
summary=()

run_psql() {
  psql "$PGURL_NOPASS" -X -q -v ON_ERROR_STOP=1 -P pager=off "$@"
}

echo "== diagnostics =="
printf 'begin read only;\n%s;\nrollback;\n' "$(cat "$dir/00_diagnostics.sql")" | run_psql -A -F ' | ' || echo "(diagnostics failed)"

last_applied=$(printf 'select coalesce(max(version), %s) from supabase_migrations.schema_migrations;\n' "'0'" | run_psql -A -t)
echo "last migration applied on kc-dev: $last_applied"
candidate=""
for m in "$mig_dir"/*.sql; do
  v=$(basename "$m" | cut -d_ -f1)
  if [[ "$v" > "$last_applied" ]]; then
    echo "candidate migration: $(basename "$m")"
    candidate+=$'\n'"$(sed -E '/^[[:space:]]*(begin|commit)[[:space:]]*;[[:space:]]*$/Id' "$m")"
  fi
done

explain_one() { # $1 mode (baseline|candidate) $2 query
  local mode=$1 q=$2 prelude="begin read only;"
  if [ "$mode" = candidate ]; then
    prelude="begin;
set local statement_timeout = '60s';
set local lock_timeout = '5s';
$candidate"
  fi
  cat <<SQL
$prelude
set local statement_timeout = '20s';
select set_config('request.jwt.claims',
  json_build_object('sub', (select id::text from auth.users where email = '$seed_email'),
                    'role', 'authenticated')::text, true) \\g /dev/null
set local role authenticated;
explain (analyze, costs off, timing off, summary off) $q \\g /dev/null
explain (analyze, buffers) $q;
rollback;
SQL
}

modes=(baseline)
[ -n "$candidate" ] && modes+=(candidate)

for f in "$dir"/[1-9]*.sql; do
  name=$(basename "$f" .sql)
  q=$(cat "$f")
  for mode in "${modes[@]}"; do
    echo
    echo "== $name [$mode] =="
    if out=$(explain_one "$mode" "$q" | run_psql -A -t 2>&1); then
      echo "$out"
      t=$(printf '%s\n' "$out" | sed -n 's/.*Execution Time: \([0-9.]*\) ms.*/\1/p' | tail -1)
      summary+=("$(printf '%-36s %-9s %s ms' "$name" "$mode" "${t:-?}")")
    else
      echo "$out" | tail -8
      summary+=("$(printf '%-36s %-9s ERROR' "$name" "$mode")")
    fi
  done
done

echo
echo "== summary (execution time, warm) =="
printf '%s\n' "${summary[@]}"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  { echo '### kc-dev EXPLAIN ANALYZE (warm)'; echo '```'; printf '%s\n' "${summary[@]}"; echo '```'; } >> "$GITHUB_STEP_SUMMARY"
fi
