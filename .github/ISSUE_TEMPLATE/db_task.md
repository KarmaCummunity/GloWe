---
name: DB task
about: Supabase migration / RPC / RLS work (KC smart database)
title: "DB 0xxx: "
labels: database
---

## Goal
<!-- What capability this adds and why -->

## Scope
<!-- Tables, columns, RPCs, RLS policies, triggers, crons, Edge Functions -->

## Migration
- File: `supabase/migrations/0xxx_<name>.sql`
- Depends on: #

## Acceptance criteria
- [ ] Migration applies cleanly on a fresh local stack (`./scripts/dev-up.sh`) and on supabase-dev via `db-deploy`
- [ ] RLS enabled on every new table, with policy tests
- [ ] No regression in existing posts / rides / chat flows
- [ ] `ci-migration-drift` and required checks green
- [ ] Generated types updated if the API surface changed

## Reference
<!-- db-design.md section / PRD section -->
