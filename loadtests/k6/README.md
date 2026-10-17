# k6 load tests (KC#881)

Read-only smoke/load against **kc-dev** only. No production URLs. **Do not commit secrets.**

## Required environment variables

| Variable | Purpose |
|----------|---------|
| `K6_SUPABASE_URL` | Dev project URL, e.g. `https://<ref>.supabase.co` |
| `K6_SUPABASE_ANON_KEY` | Dev anon key (Dashboard → Settings → API) |
| `K6_TEST_USER_JWT` | Optional: authenticated JWT for RPCs that require auth |

## Scenarios

| Script | What it exercises |
|--------|-------------------|
| `feed-scroll.js` | `feed_ranked_ids` RPC (newest page, read-only) |
| `search-burst.js` | `search_all` RPC (read-only) |

## Run locally

```bash
# Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
export K6_SUPABASE_URL="https://YOUR-DEV-REF.supabase.co"
export K6_SUPABASE_ANON_KEY="your-dev-anon-key"
k6 run loadtests/k6/feed-scroll.js
k6 run loadtests/k6/search-burst.js
```

## Targets (KC#881)

- p95 RPC latency **< 200ms** on dev with seeded data
- Use `handleSummary` JSON output for CI artifacts

## CI

On-demand workflow: `.github/workflows/k6-load-dev.yml` (`workflow_dispatch` only).
