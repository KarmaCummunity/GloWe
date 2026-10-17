# Deploy runbooks (find in &lt;1 minute)

## After merge to `dev` (automatic)

| What | Workflow | Target |
|---|---|---|
| DB migrations | `DB deploy` (`.github/workflows/db-deploy.yml`) | Supabase **kc-dev** (`supabase-dev` env) |
| Web SPA | `Deploy Web` | Cloudflare Pages → `https://dev.karma-community.pages.dev/` |

Verify: open Pages URL; for SQL, check the Actions log for `Applying migration …` / `Finished supabase db push`.

## Local DB

```bash
./scripts/dev-up.sh          # Docker Supabase + apply migrations
cd app && pnpm install
cp app/.env.example app/.env.local   # use `supabase status` keys only
```

## Mobile release (manual)

See [RELEASE.md](./RELEASE.md): version bump → EAS preview → TestFlight / Play internal. Public store = Nave only.

## Seeding

Demo/seed SQL lives under `supabase/` (seed + migration-embedded seeds). Prefer migrations that are idempotent. Do not seed against prod.

## Web Dockerfile / Railway (legacy note)

Historical Railway notes: [docs/DEPLOY_WEB.md](../DEPLOY_WEB.md). Current **dev** web path is Cloudflare Pages on push to `dev`.
