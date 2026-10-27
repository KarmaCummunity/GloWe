# whatsapp-webhook

Meta WhatsApp Cloud API webhook (issues #843, #937, #938). Logic is in `handler.ts`
(dependency-injected, unit-tested in `handler.test.ts`); `index.ts` only wires Supabase.

Per inbound message:

1. `api_whatsapp_inbound_allowed(wa_id)` — per-phone inbound throttle (#938). Throttled
   messages are not stored or sent to intake (Meta still gets `200`).
2. `api_whatsapp_ingest_inbound` — idempotent raw-record storage; stamps
   `whatsapp_identities.last_inbound_at` (opens the 24h customer-service window).
3. `api_whatsapp_handle_keyword` — exact STOP/START/HELP keywords in he/en
   (`stop`, `unsubscribe`, `הסר`, `עצור`, … / `start`, `הצטרף`, … / `help`, `עזרה`, …).
   Consent changes are written to `whatsapp_identities`, mirrored to
   `whatsapp_match_consent` and audited in `whatsapp_consent_events`. Always runs, even when
   throttled, so a STOP is never lost.
4. For a keyword, `api_whatsapp_queue_reply` queues the he/en confirmation
   (`_shared/whatsapp/replies.ts`). Delivery is done by `whatsapp-sender`.

## Supabase Edge secrets (names only — set in dashboard / `supabase secrets set`)

| Name | Purpose |
|------|---------|
| `WHATSAPP_VERIFY_TOKEN` | Meta webhook verify token (GET challenge) |
| `WHATSAPP_APP_SECRET` | Meta app secret for HMAC signature verification |
| `WHATSAPP_CLOUD_API_TOKEN` | Graph API bearer token for outbound sends (`whatsapp-sender`) |
| `WHATSAPP_PHONE_NUMBER_ID` | Sending phone number id (`whatsapp-sender`) |
| `WHATSAPP_GRAPH_API_VERSION` | e.g. `v21.0` (optional; DB config has default) |
| `WHATSAPP_SKIP_SIGNATURE_VERIFY` | Dev only: set `true` when `WHATSAPP_APP_SECRET` is unset |

Never commit real tokens. See `supabase/README.md` for the full WhatsApp bot env list.

## Tests

```bash
cd supabase/functions
deno test _shared/whatsapp whatsapp-webhook whatsapp-sender
```

All tests use a mocked RPC layer and a mocked Graph API `fetch`; no secrets are needed.
