# Migration range registry

**Rule:** before writing a migration, claim a range here, in your PR or a small docs PR to `dev`. Use only numbers inside your range. Files are `supabase/migrations/NNNN_snake_case.sql`. Gaps are fine; collisions are not.

Last applied on kc-dev when this was written: `0239`.

| Range | Owner / issue | Status |
|---|---|---|
| 0238–0239 | #852 (GloWe removal, translation) | merged |
| 0240–0247 | #860 (unified schema) | merged |
| 0248–0249 | — | free |
| 0250–0259 | social (#885, #887) | merged |
| 0260–0262 | #886 (matching) | merged |
| 0263–0270 | #889 (PRD roles / payments) | merged |
| 0271–0279 | — | free |
| 0280–0285 | social3 (#892) | merged |
| 0286–0299 | — | free |
| 0300–0304 | WhatsApp bot (#902) | merged |
| 0305–0306 | WhatsApp consent/STOP/HELP keywords + audit (#937); send limits, 24h window, LLM budget, pgmq outbound backoff queue (#938) | merged |
| 0307 | WhatsApp message templates as code (#936/#963): registry columns, he/en seed, language-aware queue | merged |
| 0308 | WhatsApp admin dashboard RPCs (#939/#968): overview, consent, outbound, rate hits, matches, kill switch, resend, block | merged |
| 0309 | — | free |
| 0310–0319 | — | free |
| 0320–0339 | marketplace (#912) | merged |
| 0340–0349 | perf (#910, #911) | merged |
| 0350 | world-rules trigger: enforce on insert / rule-field change only (#952) | merged |
| 0351 | items image rule: photo or details image, deferred check (#953) | merged |
| 0352 | drop old 9-param create_marketplace_listing overload (#954) | merged |
| 0353 | external-organisation picker: external_bodies RLS, search + admin RPCs, create RPC p_external_body_id | merged |
| 0354–0356 | Supabase advisors cleanup (#945/#962): RLS initplan, FK indexes, search_path | merged |
| 0357 | items image optional: drop 0351 deferred image check + last-photo delete block (product decision) | merged |
| 0358 | users: grant SELECT (preferred_language), QA pass (#978) | in review |
| 0359 | get_marketplace_listing_detail: users.city fix, QA pass (#977) | in review |
| 0360–0369 | money world (#913) | merged |
| 0370–0379 | time world (volunteering, #915) | merged |
| 0380–0389 | items & food worlds (handoffs, #916) | merged |
| 0390–0399 | rides + knowledge marketplace worlds (geo match, seats/slots, handoffs) | merged (#972) |
| 0400 | #982: kc-dev demo verified nonprofits (guarded no-op unless kc-dev seed present) | merged |
| 0401 | #991 store readiness: account-deletion FK fixes (money records de-identified on delete) | merged |
| 0402 | Store readiness: DRAFT terms + privacy on kc-dev aligned with behaviour (guarded no-op off kc-dev) | merged (#998) |
| 0403 | Store readiness: `app_flags` remote config (`ios_in_app_donations`) | in progress (#999) |
| 0404–0409 | — | free |
| 0410–0413 | perf: keyset pagination + hot-query indexes (feed / marketplace / search) | merged (#989) |
| 0414 | — | free |
| 0415–0416 | realtime: typing/presence send auth, online presence topic, feed:public new-post broadcast | merged (#994) |
| 0417–0419 | feed hides/mutes view (`feed_visible_posts`), paged post/user search RPCs (no exact count), "show my active status" presence privacy | merged (#1001) |
| 0420–0429 | matching engine v2: scored offer↔request candidates across worlds, pg_cron + on-insert, WhatsApp/in-app delivery, feedback, optional LLM re-rank flag | claimed (feat/matching-engine) |
| 0430+ | — | free |

## Next free ranges

`0248–0249`, `0271–0279`, `0286–0299`, `0309`, `0310–0319`, `0404–0409`, `0414`, `0430+`.

## How to claim

1. Take the lowest free block that fits, usually 5–10 numbers.
2. Add a row with your issue number and `in progress`, then commit it in your PR.
3. When the PR merges, set the status to `merged`. Return unused numbers by adding a `free` row.
