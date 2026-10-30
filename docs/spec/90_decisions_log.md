# 90 — Decisions log D1–D58

Index only — the binding wording lives in the linked spec files. All decided by Nave (PM), 2026-10. `*` = needs further depth.

| # | Decision | Lives in | Status |
|---|---|---|---|
| D1 | One list of giving worlds | 04, 05 | Approved; extended D39–D44, reshaped D45 |
| D2 | One Post entity; no "marketplace listings" | 07.1, 07.12 | Approved |
| D3 | All worlds always shown; inactive = "not active yet" | 04, 14 | Approved |
| D4 | Money only to orgs / to KC; never between users | 05.5, 08 | Approved |
| D5 | Main feed + feed per world | 07.3 | Approved |
| D6* | Uniform form, card and detail screen | 07.2, 07.4 | Needs depth |
| D7 | Notifications screen | 07.11 | Approved |
| D8 | Seed only in kc-dev; TestFlight to a clean environment | architecture | Pending check |
| D9 | Org link requires KC admin approval | 08, 12 | Approved |
| D10 | Notify on good match / saved filter | 07.3, 07.11 | Approved |
| D11 | Closing button per world | 07.5 | Approved |
| D12 | Karma points menu | 07.6 | Approved |
| D13 | One chat per pair, post pinned | 07.8 | Existing |
| D14 | Profile without "marketplace" tab | 07.12 | Approved |
| D15 | Two-sided rating | 07.7 | Approved |
| D16 | Anonymity both ways; everything is a Post subtype | 07.13 | Approved |
| D17 | Closing flow per post type | 07.5 | Approved |
| D18 | No "app creation/design" world; item subcategories | 05.2 | Approved; "challenges as world" replaced by D43 |
| D19 | One post table; ride = extension; handoff = closing stage | 07.1, architecture | Approved |
| D20 | Donation to KC via Grow; JGive vision; section 46 | 05.5, 08 | Approved |
| D21 | Expiry per post type + relevance reminder | 07.1 | Approved |
| D22 | Any user offers volunteering; affiliation grants permissions | 07.10, 08 | Approved |
| D23 | Verification shown, not blocking | 07.14 | Approved |
| D24 | Users don't see ratings; trust engine | 07.7, 07.14 | Approved |
| D25 | Likes & comments incl. on comments | 07.9 | Approved |
| D26 | Rich notifications like IG/FB/WhatsApp | 07.11 | Approved |
| D27 | Full user control of sort; default = recommendation engine | 07.3 | Approved |
| D28 | Form per type; photo required only for food offer | 07.2 | Approved |
| D29 | Karma visible to owner and main admin; values in config | 07.6 | Approved |
| D30 | Verification exceptions: housing & medical | 05.6, 06, 07.14 | Approved |
| D31 | Event = org post type | 08 | Approved |
| D32 | Automatic volunteering karma; hours by affiliation | 07.10 | Approved |
| D33 | 3 reports on post / 5 on user | 07.15 | Approved |
| D34 | Friends/Everyone toggle, TikTok style | 07.3 | Approved |
| D35 | The Hebrew project-book page is the single source of truth | README | Approved |
| D36 | Every world = world hub; one infra + WorldHubConfig | 04 | Approved |
| D37 | Cooperate with all nonprofits; KC = community layer | 01, 12 | Approved |
| D38 | Import the WhatsApp market (rides & items) via bots & chat export | 13 | Approved |
| D39 | Elderly & loneliness | 06 | Approved; now a domain (D45) |
| D40 | Rights inside knowledge; democracy; iron constitution & handover; GeoPoll | 05.7, 06, 11 | Approved |
| D41 | Non-commercial philanthropic job board | 06 | Approved |
| D42 | Emergency mode by region & world, in levels | 09 | Approved |
| D43 | Challenges = cross-cutting layer, personal & group, with karma | 10 | Approved |
| D44 | Sport, science & tech, history & heritage; registrar mapping | 04, 06 | Approved; became domains in D45 |
| D45 | Two-layer model: 8 giving worlds + internal domains; one type + one domain per post; domain not on card; feed = giving marketplace; no religion | 04, 05, 06, 07 | Approved |
| D46 | One challenge engine, openable from any world and from the challenges layer | 10 | Approved |
| D47 | GTM: migrate one WhatsApp group at a time (items or rides) | 13 | Approved |
| D48 | Elderly home visit requires ID verification | 06, 07.14 | Approved |
| D49 | One verified person one vote; small extra org weight (tentative) | 11 | Approved; weight tentative |
| D50 | Iron-constitution core — open, later | 11 | Deferred |
| D51 | General emergency — main admin only; org manager/security officer — inside the org | 09 | Approved |
| D52 | Every challenge interaction earns karma; community > private, large > small | 07.6, 10 | Approved |
| D53 | Every registered org is verified; can post jobs & recruit; org verification levels | 08 | Approved |
| D54 | WhatsApp import consent — stays open | 13, 92 | Open |
| D55 | Everything free for orgs for now; parallel tool for orgs | 08, 11 | Approved |
| D56 | Verified official/state body declares emergency within its permissions | 09 | Approved |
| D57 | Social venture = org; any registered org (incl. private person) may post jobs | 08 | Approved |
| D58 | Standing goals: spec maintenance, store release + updates, modular scalable code | 00 | Approved |
| D59 | Items and all requests never expire; instead the owner gets relevance reminders (S3: 14 days after publish, then every 30 days) — answers P5 | 07.1 | Approved (PM 2026-10-30) |
| D60 | Every world is shown in full. Two kinds: **active** worlds (full in-app flow, e.g. items, rides) and **portal** worlds (links + knowledge + org blocks). Launch flags choose active vs portal; they never hide a world — refines D3, answers Q-1 | 04, 14 | Approved (PM 2026-10-30) |
| D61 | Moderation: 3 distinct reports on a post → `hidden_pending_review` + admin notification; 5 distinct reporters on a user in 30 days → suspended from actions, can still chat with support — confirms D33/S11, answers Q-2 | 07.15 | Approved (PM 2026-10-30) |
| D62 | Code follows the spec list: 8 giving worlds + 11 domains (D45). Legacy code worlds map to it (`app_design` removed per D18; `medical`, `animals`, `environment`, `creative`→`culture` become domains). Every world and every domain gets its own screen tree under the Donations tab — answers Q-3 | 04, 05, 06 | Approved (PM 2026-10-30) |
| D63 | Listing handoffs award the §7.6 karma values (one closing/karma model, G34); applies from the change on, not retroactively — answers Q-5 | 07.5, 07.6 | Approved (PM 2026-10-30) |
| D64 | Bit / PayBox links to KC are interim transfer links, not clearing: withdrawn automatically once a licensed one-time clearing page exists | 05.5, 08 | Approved |
| D65 | Brand = "Karma Community" (HE "קהילת קארמה"), nickname "KC"; design tokens in code are the source of truth, mirrored to Figma and Claude Design; automated brand guardrails in `pnpm test` | 17 | Approved |
| D66 | Brand font Rubik app-wide (via `@kc/ui` Text/TextInput); AA-compliant light `primary` `#C2410C` (vivid orange for decoration); secondary = logo navy; current `logo.png` is the master | 17 | Approved |
| D67 | Brand system v2: KC = the platform, the KC org is styled like any org, "קיבוץ קפיטליסטי" never shown; radius scale 4/8/12/16/24; tokens for decoration orange, weights and avatars; guard covers colour, type, radius, spacing and RTL sides, and every file a PR touches must be fully clean; admin = same tokens, denser layout; native follows the OS colour scheme | 17 | Approved (PM 2026-10-30) |
| D68 | Operational alerts reach the PM as a GitHub issue (assigned → email) and by email now, and by WhatsApp once the WhatsApp channel is live | architecture §5.2 | Approved (PM 2026-10-30) |
| D69 | Monitoring covers both dev and production; production checks are read-only | architecture §5.2 | Approved (PM 2026-10-30) |
| D80 | Brand guard covers components, icons, layers and shadows: new tokens `iconSize` (14/16/18/20/22/24), `zIndex` (base 0 · raised 1 · overlay 2 · floating 20 · toast 9999) and `shadow.glow`, each matching the values screens already used most; the ratchet adds icon-size, z-index, shadow, raw `TextInput` (use `TextField`) and raw `Modal` (frozen until the shared modal, #1284); ESLint allows only Ionicons | 17 | Approved (PM 2026-10-30) |
