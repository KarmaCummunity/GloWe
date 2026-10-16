# AGENTS.md — start here

KC (Karma Community) is built largely by AI agents. This is the short entry point; full rules are in [`CLAUDE.md`](./CLAUDE.md).

| Read | For |
|---|---|
| [`docs/agents/OPERATING_MODEL.md`](docs/agents/OPERATING_MODEL.md) | Roles, the issue → PR → dev → kc-dev flow, labels, auto-merge |
| [`docs/agents/MIGRATION_RANGES.md`](docs/agents/MIGRATION_RANGES.md) | **Claim a migration number range before writing SQL** |
| [`docs/agents/STACK_MAP.md`](docs/agents/STACK_MAP.md) | Open stacked PRs and merge order |
| [`CLAUDE.md`](./CLAUDE.md) | Architecture, gates, PR template, prohibitions |

## Product focus

- **Mobile / web export:** `app/apps/mobile/**` (Expo, Hebrew RTL)
- **Backend:** `supabase/**` + `app/packages/infrastructure-supabase/**`
- GloWe was removed in `0238_drop_glowe_product.sql`. Do not reintroduce it.

## Branch naming

`<type>/<issue#>-<area>-<slug>`: `type` ∈ `feat|fix|refactor|chore|docs|test|ci`, `area` ∈ `db|mobile|marketplace|bot|social|infra|docs`. Example: `feat/905-marketplace-map`. Always branch from `origin/dev`.

## Scope rules

- One issue per PR. Stay inside the issue's "files likely touched" and "out of scope" lists.
- Don't edit another role's paths without saying so in the PR (see Roles).
- Small PRs (≤ ~600 changed lines unless generated). Files ≤ 300 lines (`pnpm lint:arch`).
- PR base is always `dev`. **Never** `main`, kc-prod, or prod deploy workflows without Naveh's explicit approval.
- No secrets in code, logs, issues or PRs.

## Definition of done

- [ ] Gates green locally (from `app/`): `pnpm typecheck && pnpm test && pnpm lint`
- [ ] New or changed behavior has tests
- [ ] Migrations, if any: numbered inside your claimed range, apply cleanly on a fresh stack (`./scripts/dev-up.sh`), RLS plus policy tests, no destructive ops (`CI — dev guard`)
- [ ] DB types regenerated and committed if the API surface changed
- [ ] `app/VERSION` PATCH bumped (`node scripts/bump-app-version.mjs`)
- [ ] PR body: `Closes #N` and `Mapped to spec: …`, following the CLAUDE.md §6 template
- [ ] All required CI checks green, then label `agent-ready` to auto-merge
- [ ] After merge: verified on kc-dev / dev.karma-community.pages.dev

Store builds (TestFlight / Play internal): see [`app/apps/mobile/README.md`](app/apps/mobile/README.md).
