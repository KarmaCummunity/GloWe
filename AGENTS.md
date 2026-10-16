# AGENTS.md

This repository follows the `CLAUDE.md` convention for agent rules.
All process, architecture, and workflow rules live in [`CLAUDE.md`](./CLAUDE.md).
Read it first.

**App version:** bump `app/VERSION` PATCH on every PR into `dev` (see `CLAUDE.md`).

## Active product focus

**KC is the product.** Primary surfaces:

- **Mobile / web export:** `app/apps/mobile/**` (Expo, Hebrew RTL MVP)
- **Backend:** `supabase/**` + `app/packages/infrastructure-supabase/**`

The former GloWe static site (`app/apps/glowe-web`) and `glowe_*` database objects were
removed in migration `0238_drop_glowe_product.sql` (2026-10). Do not reintroduce GloWe-only
features unless the PM reopens them in SSOT.
