# Karma Community MVP — Backlog

> **Purpose:** Priority-ordered **open** task queue (`⏳` / `🟡` only).
> Agents pick the highest-priority `⏳` item. Update status when starting (⏳→🟡) or completing (🟡→✅).
> Completed work: [`archive/BACKLOG-history.md`](./archive/BACKLOG-history.md).
> Paused KC mobile: [`archive/BACKLOG-kc-mobile-paused.md`](./archive/BACKLOG-kc-mobile-paused.md).

---

## GLOWE — Active frontend

| ID | Task | Owner | Status | Spec |
|----|------|-------|--------|------|
| GLOWE.B | **Phase B — Live Content Layer (specced 2026-06-29)** — connect all existing pages to real Supabase persistence: Wishing Well, Volunteer Network, Community Feed, Forums, Organizations Directory, Profile Management, Applications & Offers, Saved Items, Direct Messaging (stub), Moderation. New migrations for `glowe_forum_groups`, `glowe_forum_threads`, `glowe_forum_replies`, `glowe_offers`, `glowe_reports`. PRD: `docs/SSOT/archive/superpowers/specs/2026-06-29-glowe-mvp-prd.md`; SRS: `docs/SSOT/archive/superpowers/specs/2026-06-29-glowe-mvp-srs.md` | agent-fullstack | ⏳ Planned | `spec/17_glowe_frontend.md` FR-GLOWE-006..015 |
| GLOWE.LAUNCH-0 | **Launch hardening Wave 0 — server-side publish guards + profile privacy.** Move the GloWe capability matrix, org view-only rule and content rate limits from browser JS into Postgres (`glowe_can_create()` + `BEFORE INSERT` triggers, `enforce_rate_limit()`); close the `glowe_profiles` exposure (pending/rejected applications, `org_review_note`, org contact details and `raw_profile` were readable by `anon`). Migration `0236`. | agent-fullstack | ✅ Done | `spec/17_glowe_frontend.md` FR-GLOWE-003 / FR-GLOWE-016; D-185; TD-188 |
| GLOWE.LAUNCH-1 | **Launch hardening Wave 1 — owner approval mode + decision notifications.** Unify volunteer-apply and event-RSVP onto one RPC that honours `registration_mode` and `capacity`; expose the open-vs-gated toggle on the volunteer-opportunity composer and add edit-after-publish; send transactional email on org approve/reject and application accept/decline; surface `org_review_note` to the rejected org. | agent-fullstack | ✅ Done — migration `0237` unified registration (D-186); migration `0239` transactional email + org review note banner (D-187); edit-after-publish deferred to Wave 1.2b | `spec/17_glowe_frontend.md` FR-GLOWE-003 AC9 / FR-GLOWE-012 AC9 |
| GLOWE.LAUNCH-2 | **Launch hardening Wave 2 — performance.** Server-side `glowe_home_feed` RPC; esbuild minify + content-hashed assets + `_headers`; extract `GLOWE_TRANSLATIONS` to per-language JSON; `defer` scripts; vendor `supabase-js`; compress images. | agent-fullstack | ✅ Done — migration `0240`; D-188 minify/hash; `i18n/*.json` on-demand (TD-186 closed); vendored supabase-js; WebP assets; script `defer` | `spec/17_glowe_frontend.md`; TD-186; D-188 |
| GLOWE.LAUNCH-3 | **Launch hardening Wave 3 — launch operations.** Sentry + product analytics; `privacy.html`; cookie/consent banner; IS 5568 accessibility statement; meta/`og:`/`robots.txt`/sitemap. | agent-fullstack | ✅ Done — `glowe-observability.js` (opt-in Sentry DSN + analytics endpoint); `privacy.html` / `accessibility.html`; `glowe-consent.js`; SEO assets; footer legal links (FR-GLOWE-028) | `spec/17_glowe_frontend.md` FR-GLOWE-028; TD-185 |
| GLOWE.LAUNCH-4 | **Launch hardening Wave 4 — QA + rollback.** E2E for individual signup, org onboarding, event RSVP and owner accept/decline; negative E2E asserting the Wave 0 server rules hold against a direct API call; document the Cloudflare Pages rollback path. | agent-fullstack | ✅ Done — `tests/e2e/journeys/glowe-launch-wave4.spec.ts` (Google-only signup smoke, org onboarding surface, RSVP/apply UI, owner Accept/Decline, `glowe_can_create` + blocked individual opp insert); Cloudflare Pages rollback in `RELEASE_CHECKLIST.md` | `RELEASE_CHECKLIST.md`; INFRA-QA-W2 |
| GLOWE.HOME-FEED | **Unified Home discovery feed** — feed-only member home; hot+diversity ranking; progressive 10/+8; guest peek 10 + join CTA; no org profiles | agent-fullstack | ✅ Done | `spec/17_glowe_frontend.md` FR-GLOWE-016 AC2; D-184 |
| GLOWE.DS | **Design system reset** — one token layer, cascade-layered CSS entry bundled to a single request, unified `.btn`/form/feedback components, one shell stamped from partials into all pages, canonical breakpoints, lint guards, PR-time visual gate. Phases 1–3 (foundation, shell & layout, controls & cards) shipped; Phases 4–5 (pages, cleanup) per `docs/superpowers/plans/2026-09-09-glowe-design-system-reset.md` | agent-frontend | 🟡 In progress | `spec/17_glowe_frontend.md` FR-GLOWE-029; D-190; TD-191/TD-192 |
| GLOWE.C | **Phase C — convergence** — GloWe as primary frontend, unified schema, KC mobile deprecated | agent-fullstack | ⏳ Planned | `spec/17_glowe_frontend.md` (Phase C) |
| GLOWE.GUEST-B | **Guest conversion Mode B (progressive disclosure)** — let the guest fill the action form and wall only at final submit, preserving input for auto-submit after sign-in | agent-fullstack | ⏳ Planned [blocked: needs explicit PM instruction per D-68] | `spec/17_glowe_frontend.md` FR-GLOWE-023 AC7 |

## TRANSLATE — Shared infra

| ID | Task | Owner | Status | Spec |
|----|------|-------|--------|------|
| TRANSLATE-P3 | **Phase 3 — Chat translation (opt-in, last).** Sender-consent gate (a message is translated only if its sender opted in); per-conversation translation; LRU cache eviction for chat. | agent-fullstack | ⏳ Planned | `spec/18_translation.md` FR-TRANSLATE-004 (to be detailed) |
| TRANSLATE-P6 | **GLOWE web translation performance.** Efficiency-first per-field ladder (same-language short-circuit → sessionStorage cache → batched DB read → batched Edge call), viewport-lookahead prefetch, and a rare localized "Translating…" indicator. | agent-fullstack | ✅ Done | `spec/18_translation.md` FR-TRANSLATE-006 |

## Shared — Research / Infra / Perf

| ID | Task | Owner | Status | Spec |
|----|------|-------|--------|------|
| P1.7 | FR-RESEARCH-001..003 — Public market research form (Survey B) — web-only anonymous form at `/research/[slug]?src=`, 11 questions, anti-abuse (honeypot + origin allowlist + rate limit + circuit breaker), PII-isolated contact opt-in | agent-be + agent-fe | 🟡 In progress (post-merge QA) | `spec/16_public_research.md`; Migration `0123`, Edge Functions `public-research-submit` + `rotate-research-salt`, `.web.tsx` route · **2026-06-14 QA:** fixed mid-survey draft-loss-on-reload (AC7) + reflowed to a spacious single-scroll layout; prod save path verified healthy end-to-end |
| P1.8 | FR-RESEARCH-004 — Share affordance for public research survey (3 surfaces: thanks page primary CTA, survey form header button, in-app Settings row; 3 ?src= values for attribution) | agent-fe | 🟡 Code complete, post-merge QA pending | `spec/16_public_research.md`; design: `docs/SSOT/archive/superpowers/specs/2026-05-28-in-app-share-research-survey-design.md` |
| INFRA-QA-W1 | Playwright P0 E2E gate on `staging`/`dev` + release (`ci-e2e-glowe.yml`, `ci-e2e-dev.yml`, `tests/e2e/`) | infra | 🟡 In progress | `docs/SSOT/archive/superpowers/plans/2026-05-28-comprehensive-quality-automation.md` Wave 1 |
| INFRA-QA-W2 | E2E domain expansion (posts, chat send, donations, research) | infra | ⏳ Planned | Wave 2 |
| INFRA-QA-W3 | RLS persona integration suite | infra | ⏳ Planned | Wave 3 |
| INFRA-QA-W4 | Performance budgets (Lighthouse + k6) | infra | ⏳ Planned | Wave 4 |
| INFRA-QA-W5 | Accessibility axe gate | infra | ⏳ Planned | Wave 5 |
| INFRA-QA-W7 | Expanded prod synthetic monitoring | infra | 🟡 In progress | Wave 7 — `prod-health` Playwright probes, `glowe_health_checks` table, admin portal panel, `prod-smoke.yml` cron |
| INFRA-OSS-4 | **Snyk PR scan** — `.github/workflows/ci-snyk.yml`; `SNYK_TOKEN` configured | infra | 🟡 In progress [promote to required after baseline] | same design §7; `SECURITY.md` |
| INFRA-OSS-6 | **GitGuardian** — `.github/workflows/ci-gitguardian.yml`; `GITGUARDIAN_API_KEY` configured | infra | 🟡 In progress [promote to required after baseline] | same design §7; `SECURITY.md` |
| PERF-4 | **Image delivery — upload-time thumbs + backfill + immutable cache headers + web blurhash re-enable.** Re-opens part of Wave 1 that didn't survive the PR #397 transform-endpoint revert. Generates 400px post thumbs + 96px avatar thumbs at upload time (PR-1a, PR #408); backfills existing objects via the new `backfill-image-thumbs` Edge Function (PR-1b); sets `cache-control: public, max-age=31536000, immutable`; re-enables blurhash placeholder + crossfade on web. Closes the image-perf piece of TD-126; advances TD-11. | agent-fullstack | 🟡 In progress (PR-1a shipped, PR-1b pending merge) | `docs/SSOT/archive/superpowers/specs/2026-05-28-perf-wave2-finish-wave3-design.md` § Shipment 1; `OPERATOR_RUNBOOK.md` Backfill image thumbnails |
| PERF-5 | **DB consolidation — per-chat unread count RPC (targeted scope).** Replaces the inbox unread-count fan-out in `getMyChats` (today: SELECT every non-read message across every chat the viewer is in, then group client-side) with `rpc_unread_counts_for_chats` — server-side aggregation using the existing `messages_chat_unread_idx` partial index. Migration `0133`. The full feed + inbox single-RPC consolidation noted in the spec is descoped — the unread fan-out was the biggest single waste and a targeted fix ships safely; the broader RPCs can land separately if profiling shows remaining hot spots. SECURITY DEFINER with explicit participant guard mirrors `is_chat_visible_to`. | agent-fullstack | 🟡 In progress | `docs/SSOT/archive/superpowers/specs/2026-05-28-perf-wave2-finish-wave3-design.md` § Shipment 2 |

## Deferred (post-MVP, still tracked)

| ID | Task | Status | Spec |
|----|------|--------|------|
| P3.1 | Block / unblock + visibility restoration | ⏳ Deferred (EXEC-9) | `spec/08_moderation.md` FR-MOD-003/004/009 |
| P3.3 | Quiet hours / DND | ⏳ Deferred | `spec/09_notifications.md` FR-NOTIF-016 |

---

## Sprint Protocol

1. Pick the highest `⏳` item in **this file** (not `archive/`)
2. Read its linked `spec/` file
3. Move status to 🟡
4. Implement
5. Move status to ✅ **and** append/move the row to `archive/BACKLOG-history.md` (keep active file free of Done rows)
6. Update spec file status if all ACs complete
