# whatsapp-webhook

Meta WhatsApp Cloud API webhook (issue #843). Verifies the subscription challenge and
`X-Hub-Signature-256`, then stores inbound messages via `api_whatsapp_ingest_inbound`.

## Supabase Edge secrets (names only — set in dashboard / `supabase secrets set`)

| Name | Purpose |
|------|---------|
| `WHATSAPP_VERIFY_TOKEN` | Meta webhook verify token (GET challenge) |
| `WHATSAPP_APP_SECRET` | Meta app secret for HMAC signature verification |
| `WHATSAPP_CLOUD_API_TOKEN` | Graph API bearer token for outbound sends (separate sender) |
| `WHATSAPP_PHONE_NUMBER_ID` | Sending phone number id |
| `WHATSAPP_GRAPH_API_VERSION` | e.g. `v21.0` (optional; DB config has default) |
| `WHATSAPP_SKIP_SIGNATURE_VERIFY` | Dev only: set `true` when `WHATSAPP_APP_SECRET` is unset |

Never commit real tokens. See `supabase/README.md` for the full WhatsApp bot env list.
