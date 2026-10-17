# whatsapp-sender

Outbound worker for the WhatsApp bot (issue #938). Call it on a schedule (e.g. every
minute via pg_cron / a Supabase scheduled invocation) with the service role:
`POST /functions/v1/whatsapp-sender` with optional body `{ "batch": 20 }`.

It does nothing (`{ skipped: "channel_disabled" | "not_configured" }`) until
`whatsapp_channel_config.is_enabled = true` **and** `WHATSAPP_CLOUD_API_TOKEN` plus a phone
number id are set. That is the default today: no real Meta keys exist yet.

## Flow

1. `api_whatsapp_outbound_claim(batch, visibility)` — takes due rows from the pgmq queue
   `whatsapp_outbound` (table polling when pgmq is absent), capped by
   `whatsapp_send_limits.global_per_minute`. Template rows whose user has since opted out are
   marked `skipped_no_consent` here and never sent.
2. Send via Graph `/{version}/{phone_number_id}/messages` (`_shared/whatsapp/meta.ts`).
3. `api_whatsapp_outbound_result(...)`: `sent`; or retryable (429, 5xx, network, Meta
   throttling codes) → `queued` again with exponential backoff
   (`backoff_base_seconds * 2^attempts`, max 1h, via `pgmq.set_vt`); otherwise or after
   `max_attempts` → `failed` (archived in pgmq).

## Limits enforced in the DB (migration 0306, tune `public.whatsapp_send_limits`)

| Limit | Default | Where |
|-------|---------|-------|
| Proactive templates per user / hour, / day | 5 / 20 | `api_whatsapp_queue_outbound` |
| Unique template recipients / 24h (Meta tier) | 1000 | `api_whatsapp_queue_outbound` |
| Session replies per phone / hour | 30 | `api_whatsapp_queue_reply` |
| Global sends / minute | 60 | `api_whatsapp_outbound_claim` |
| Inbound messages per phone / minute | 20 | `api_whatsapp_inbound_allowed` (webhook) |
| LLM calls per phone / day, global / day | 30 / 2000 | `api_whatsapp_llm_budget_take` (intake worker) |

Rules: a proactive (non-reply) message needs a consent row (`whatsapp_match_consent.opted_in`)
and no phone-level STOP, a linked WhatsApp identity, and an **approved** template. Free-form
replies only go out inside the 24h window after the user's last inbound message; after STOP
only the STOP confirmation is allowed.

Secrets: see `../whatsapp-webhook/README.md` (names only).
