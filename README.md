# GloWe

**KC mobile app development is paused.** All active development targets **GLOWE**
(`app/apps/glowe-web/`). GLOWE and the legacy KC mobile app share the same
**Supabase backend** (`supabase/`).

## What is GLOWE?

GLOWE is a global social-impact web application for volunteering, community
organizations, and collaboration — connecting people who want to help with
causes, opportunities, events, and projects that need support.

## Preview

- Local after setup: [http://localhost:4321](http://localhost:4321)
- **GloWe production** (`dev` branch):
  [https://dev.karma-community.pages.dev/glowe/](https://dev.karma-community.pages.dev/glowe/)
- **GloWe staging** (`staging` branch — ongoing integration):
  [https://staging.karma-community.pages.dev/glowe/](https://staging.karma-community.pages.dev/glowe/)

> KC production (`main`) also serves GloWe at `/glowe`, but that bundle lags behind
> `dev` until a `dev` → `main` release. Treat the `dev` branch URL as GloWe's live
> front door. See [`docs/SSOT/ENVIRONMENTS.md`](docs/SSOT/ENVIRONMENTS.md).

## Quickstart

1. **Clone** this repository.
2. **Start local Supabase and seed GLOWE** (Docker required): from the repo
   root, run `./scripts/dev-up.sh`. See [CONTRIBUTING.md](CONTRIBUTING.md) for
   full setup.
3. **Install dependencies:** `cd app && pnpm install`
4. **Configure env:** use [`app/.env.example`](app/.env.example) as the variable
   template. Copy it to `app/.env.local` (gitignored) and fill in the local API
   URL and anon key printed by `./scripts/dev-up.sh` — never use hosted
   `dev`/`prod` credentials.
5. **Run GLOWE web:** `pnpm --filter @kc/glowe-web dev` (serves at
   `http://localhost:4321`).

The local seed is fictional (`@example.test` accounts) and refuses hosted
Supabase URLs. Seed logins and verification steps are in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Pick a task

Start with issues labeled **`good first issue`** (also tagged
`contributor-facing`):

- [Good first issues](https://github.com/KarmaCummunity/GloWe/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
- [Help wanted](https://github.com/KarmaCummunity/GloWe/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)
- Project board:
  [GloWe (org project #2)](https://github.com/orgs/KarmaCummunity/projects/2)

Use the **Good first issues** and **Contributor board** views on that project.

## Don't work on

- **`app/apps/mobile/**`** — KC mobile frontend is paused. PRs that only change
  this tree are closed automatically (see [AGENTS.md](AGENTS.md) and
  [CONTRIBUTING.md](CONTRIBUTING.md)).
- **Hosted Supabase credentials** — never request or commit `dev`/`prod` URLs,
  anon keys, or service-role keys.
- **PRs targeting `main`** — open against **`dev`** only.
- Issues labeled **`maintainer-only`** — org-admin / maintainer work, not for
  volunteers.

## How we work together

1. Fork the repo and branch from latest `dev`.
2. Keep each PR focused on **one issue** (prefer small diffs).
3. Open a PR against **`dev`** with the CLA checkbox checked.
4. Wait for CI (typecheck / test / lint / SonarCloud, and other required checks).
5. Maintainer review and merge by
   [@navesarussi](https://github.com/navesarussi) — typically within **3
   business days**.

Questions before coding? Use
[GitHub Discussions](https://github.com/KarmaCummunity/GloWe/discussions).

## Repository map

```
app/
├── apps/
│   ├── glowe-web/     # GLOWE — active product (vanilla JS static site)
│   └── mobile/        # KC mobile app — paused (Expo / React Native)
├── packages/          # Shared domain, application, infrastructure, UI
supabase/              # Shared backend — migrations, RLS, Edge Functions, seed
docs/SSOT/             # Internal specs & backlog (not required for a first PR)
```

## License

Source is visible for transparency and contribution to **this repository only**.
See [LICENSE](LICENSE) (All Rights Reserved — not an OSI open-source license).
Inbound contributions are governed by [CLA.md](CLA.md).

## Contributing

We welcome pull requests for GLOWE. Read [CONTRIBUTING.md](CONTRIBUTING.md) and
agree to the [Contributor License Agreement](CLA.md) before opening a PR.

## Security

Report vulnerabilities responsibly — see [SECURITY.md](SECURITY.md).

## Branches & CI

Pull requests target **`dev`**. Required CI checks (including `typecheck`, `test`,
and `lint`) must be green before merge. **`main`** is updated only from **`dev`**
after the full release gate set passes.
