# 93 — Implementation gaps G1–G37

Spec is clear; code does not match yet. These are **tasks, not contradictions**. Every gap = a task with code + spec section + automated test.

| # | Gap | Section |
|---|---|---|
| G1 | Unify listings → posts, ride_post_details, post_handoffs (D19) | 07.1 |
| G2 | One world list in code (D1) | 04 |
| G3 | Anonymity 'only-stricter' trigger vs both-ways change (D16) | 07.13 |
| G4 | ✅ 2026-10-30 — Ratings readable only by their rater and super admins (migration `0446`, probe in `supabase/tests/`) (D24) | 07.7 |
| G5 | Org links without approval; two org entities (D9) | 08 |
| G6 | 'Marketplace listings' profile tab (D14) | 07.12 |
| G7 | Which DB TestFlight connects to (D8) | architecture |
| G8 | 🟡 2026-10-30 — Donation to KC via Grow (D20): redirect half shipped (`FR-DONATE-011`: one-time + standing-order hosted pages, server-configured channels, migration `0447`). Open: Grow merchant account + page URLs (launch plan A11), confirmation webhook, donation record, karma award (07.6) | 08 |
| G9 | Vague names in code | 94 |
| G10 | Trust engine (D24) | 07.14 |
| G11 | Expiry & reminders (D21) | 07.1 |
| G12 | Like & reply on comments (D25) | 07.9 |
| G13 | ID verification, blue check, provider choice (D23) | 07.14 |
| G14 | Form per type without 'general' (D28) | 07.2 |
| G15 | Recommendation engine & toggle (D27, D34) | 07.3 |
| G16 | Karma values config (D29) | 07.6 |
| G17 | 🟡 2026-10-30 — Notification preferences & emergency group (D26, D42). Done: per-type opt-out model `kinds` + "Match suggestions" toggle (FR-NOTIF-017, `0460`). Open: other per-type toggles, per-channel preferences, `emergency` group | 07.11 |
| G18 | Event post & registration (D31) | 08 |
| G19 | Volunteer hours (D32) | 07.10 |
| G20 | ✅ 2026-10-30 — Report & suspension thresholds: post 3 reports (14 d) → hidden for review; user 5 distinct reporters (30 d) → suspended; support stays reachable (D33, D61; migration `0452`) | 07.15 |
| G21 | Housing world (D30) | 05.6 |
| G22 | Wire the medical directory into the hub (D30) | 06 |
| G23 | World hub infra + WorldHubConfig (D36) | 04 |
| G24 | 8 world slugs (incl. experiences), domain_slug field + 11 domains, remove challenges as world (D45) | 04 |
| G25 | Emergency mode (D42) | 09 |
| G26 | Challenges layer (D43) | 10 |
| G27 | WhatsApp import & bridge (D38) | 13 |
| G28 | Job board (D41) | 06 |
| G29 | Polls & votes (D40) | 11 |
| G30 | Registrar data import & proper-management badge (S35) | 12 |
| G31 | Org verification levels, tags & filters (D53) | 08 |
| G32 | Per-type expiry replaces the single 300-day rule (D21) — evidence in [95](./95_reconciliation.md) | 07.1 |
| G33 | 🟡 2026-10-30 — DB done: `hidden_pending_review` status, auto-moderation hides, admin restore/remove/search handle it (migration `0452`). Remaining: app UI for the status and suspended-user browsing + support chat (client PR) (D33, D61) | 07.15 |
| G34 | One closing system with one karma table (posts closure vs listing handoffs differ) (D12, D17) | 07.5, 07.6 |
| G35 | World list in code holds `app_design` (D18) and domain-type slugs (D45) | 04 |
| G36 | ✅ 2026-10-30 — "Forgot password" flow (legacy FR-AUTH-008): `(auth)/forgot-password` + `auth/reset-password`; needs the hosted reset-email template (see 95) | auth |
| G37 | ✅ 2026-10-30 — Launch flags no longer hide worlds: every world tile is shown; a world whose flag is off opens as a portal (links + knowledge) instead of "coming soon" (D3, D60; `launchWorldMode`, `WorldPortalScreen`) | 04 |
