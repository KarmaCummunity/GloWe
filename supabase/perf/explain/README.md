# Hot-query EXPLAIN suite (kc-dev only)

Each `NN_name.sql` file holds one read-only `SELECT` (no trailing semicolon).
`.github/workflows/db-explain-dev.yml` runs every file against **kc-dev** with
`EXPLAIN (ANALYZE, BUFFERS)` inside a `READ ONLY` transaction that is rolled
back. Queries run as the `authenticated` role with the JWT of the public seed
user `user1@seed.kc.test`, so RLS and `auth.uid()` behave like the app.

`00_diagnostics.sql` is run as plain SQL (not EXPLAIN) and prints table sizes,
indexes on the hot tables, and the realtime publication.

Triggers: a pull request touching this folder, a push to a `perf-explain/**`
branch, or manual dispatch from the default branch. The job refuses to run
unless the `supabase-dev` project ref is kc-dev. Output is the plans and
timings only; no secrets are printed.
