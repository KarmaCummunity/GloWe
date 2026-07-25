# mock-login (local dev / E2E only)

**Never deploy to production expecting this to work.** The handler returns `404` unless
`SUPABASE_URL` points at `127.0.0.1` or `localhost`.

## Endpoint

`POST http://127.0.0.1:54321/functions/v1/mock-login`

Headers:

- `apikey: <local anon key>`
- `Content-Type: application/json`

Body (all optional):

```json
{
  "userId": "uuid",
  "email": "test-user@local.dev",
  "role": "user"
}
```

`role: "admin"` grants `glowe_admin` via `admin_role_grants`.

## Response (200)

Same Supabase session object the client receives after `signInWithPassword` / OAuth,
plus a `gloweUser` mirror for the static GloWe UI:

```json
{
  "session": { "access_token": "...", "refresh_token": "...", "user": { ... } },
  "user": { "id": "...", "name": "...", "email": "...", "type": "member" }
}
```

Default password for created users: `GloweLocal!2026` (matches `scripts/seed-glowe-local.mjs`).

## Consumers

- Playwright: `tests/e2e/lib/mockAuth.ts`
- GloWe dev UI: `glowe-dev-auth.js` (localhost + local Supabase only)
