# Web Deployment — Railway → `dev3.karma-community-kc.com`

Operator runbook for the static-SPA web build of the Expo Router app, deployed on Railway with a Dockerfile.

> Earlier design considered Cloudflare Pages — kept for context at [`docs/SSOT/archive/superpowers/specs/2026-05-10-cloudflare-pages-web-deploy-design.md`](./SSOT/archive/superpowers/specs/2026-05-10-cloudflare-pages-web-deploy-design.md). The actual production deploy uses Railway because the project + custom domain were already provisioned there.

## What's checked into the repo

| File | Purpose |
| ---- | ------- |
| [`Dockerfile`](../Dockerfile) | Multistage build: stage 1 runs `pnpm install` + `pnpm build:web`; stage 2 is a tiny `node:20-alpine` image that serves `dist/` with `serve --single` (SPA fallback). |
| [`railway.json`](../railway.json) | Forces Railway to use the Dockerfile (bypasses Railpack auto-detect, which can't handle our pnpm monorepo). |
| [`.dockerignore`](../.dockerignore) | Keeps the build context small (excludes `docs/`, `supabase/`, `.git`, `node_modules`, etc.). |
| `app/package.json` scripts | `pnpm build:web` → `expo export -p web` + writes `_redirects` (no-op on Railway since `serve --single` handles fallback, but harmless). |

The mobile CI/CD (`.github/workflows/ci.yml`) is unchanged — Railway builds in its own infrastructure.

## Railway service configuration (one-time)

In the Railway dashboard for the **MVP-2** service:

### 1. Variables

Add these under **Variables** (all three available at both build time and runtime):

| Name | Value | Source |
| ---- | ----- | ------ |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://roeefqpdbftlndzsvhfj.supabase.co` | matches `app/apps/mobile/.env` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_…` | matches `app/apps/mobile/.env` (publishable key — safe to inline in client bundle) |
| `PORT` | (leave unset; Railway injects it automatically) | — |

The Dockerfile declares `ARG EXPO_PUBLIC_SUPABASE_URL` and `ARG EXPO_PUBLIC_SUPABASE_ANON_KEY` so Railway passes them as build args (they get inlined into the JS bundle by `expo export`).

### 2. Settings

- **Source repo**: `KarmaCummunity/GloWe` (already connected).
- **Branch**: `main` (production).
- **Builder**: leave on auto — `railway.json` overrides it to Dockerfile.
- **Healthcheck**: optional. If you want one, set path `/` and timeout `30s`.

### 3. Public domain

Already configured: `dev3.karma-community-kc.com` is mapped to this service. No DNS changes needed unless you want to confirm:

```bash
dig CNAME dev3.karma-community-kc.com +short
# should print Railway's CNAME target
```

### 4. Supabase Auth → URL Configuration

Required so Google SSO and other OAuth flows accept the deployed origin. Once, in the Supabase dashboard for project `roeefqpdbftlndzsvhfj` → Authentication → URL Configuration → **Redirect URLs**, add:

```
https://dev3.karma-community-kc.com/**
```

## Local commands

| Command | Purpose |
| ------- | ------- |
| `pnpm build:web` (from `app/`) | Produce `app/apps/mobile/dist/` exactly the way the Docker builder does (without Docker). |
| `pnpm preview:web` (from `app/`) | Serve the local `dist/` with SPA fallback on `localhost:3000`. |
| `docker build --build-arg EXPO_PUBLIC_SUPABASE_URL=… --build-arg EXPO_PUBLIC_SUPABASE_ANON_KEY=… -t kc-web .` | Reproduce the Railway build locally. |
| `docker run -p 4322:3000 kc-web` | Run the produced image on `localhost:4322`. |

## Deploy flow

1. PR merges to `main`.
2. Railway picks up the push, runs `docker build` using `Dockerfile` (per `railway.json`).
3. New image is deployed; old one is replaced once healthchecks pass.
4. Live at `https://dev3.karma-community-kc.com`.

## Verifying a deploy

```bash
curl -sSI https://dev3.karma-community-kc.com/                # → HTTP/2 200
curl -sSI https://dev3.karma-community-kc.com/donations       # → HTTP/2 200 (SPA fallback)
curl -sSI https://dev3.karma-community-kc.com/chat/abc        # → HTTP/2 200 (SPA fallback)
curl -sSI https://dev3.karma-community-kc.com/favicon.ico     # → HTTP/2 200, image/x-icon
```

Manual smoke test in a browser: feed loads → donations grid → sign-in (Google SSO) → post detail. Hebrew RTL must render correctly.

## Rollback

- **Bad code went live**: revert the offending commit on `main`. Railway auto-redeploys the previous good state (~2-3 min build time).
- **Need site down immediately**: Railway dashboard → service → **Settings** → toggle **Public Networking off**, or pause deployments.

## Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| Railway build fails on "Railpack process exited with an error" | `railway.json` not picked up | Confirm `railway.json` is at the **repo root** (not inside `app/`). |
| Build succeeds but the bundle has `undefined` instead of Supabase URL | Build args not passed | Check `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set under Railway → Variables and that they're enabled for **Build**. |
| `/donations` returns 404 in the browser | `serve --single` not running | Check the runtime CMD in `Dockerfile`: should be `serve dist --single --listen ${PORT:-3000}`. |
| Google SSO returns "redirect_uri_mismatch" | Supabase redirect list incomplete | Add `https://dev3.karma-community-kc.com/**` per the Supabase step above. |
| Build slow (~3 min) on every push | Layer cache miss | Railway caches Docker layers between builds — first build is slow, subsequent builds with unchanged `pnpm-lock.yaml` should reuse the install layer. If they don't, check the Dockerfile for layer-busting `COPY` ordering. |
| Bundle size warning | RN web app is naturally large | Current bundle is ~4.4 MB pre-gzip. Acceptable for now. Future optimization: enable Hermes/Metro tree-shaking, lazy-load donations sub-routes. |
