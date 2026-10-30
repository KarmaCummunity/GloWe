# Karma Community MVP — Backlog

> **Purpose:** Priority-ordered **open** task queue (`⏳` / `🟡` only).
> Agents pick the highest-priority `⏳` item. Update status when starting (⏳→🟡) or completing (🟡→✅).
> Completed work: [`archive/BACKLOG-history.md`](./archive/BACKLOG-history.md).

---

## TRANSLATE — Shared infra

| ID | Task | Owner | Status | Spec |
|----|------|-------|--------|------|
| TRANSLATE-P3 | **Phase 3 — Chat translation (opt-in, last).** Sender-consent gate; per-conversation translation; LRU cache eviction for chat. | agent-fullstack | ⏳ Planned | `spec/18_translation.md` FR-TRANSLATE-004 (to be detailed) |

## Shared — Research / Infra / Perf

| ID | Task | Owner | Status | Spec |
|----|------|-------|--------|------|
| P1.7 | FR-RESEARCH-001..003 — Public market research form | agent-be + agent-fe | 🟡 In progress (post-merge QA) | `spec/16_public_research.md` |
| P1.8 | FR-RESEARCH-004 — Share affordance for public research survey | agent-fe | 🟡 Code complete, post-merge QA pending | `spec/16_public_research.md` |
| INFRA-QA-W1 | Playwright P0 E2E gate on dev + release (`ci-e2e-dev.yml`, `tests/e2e/`) | infra | 🟡 In progress | Wave 1 |
| INFRA-QA-W2 | E2E domain expansion (posts, chat send, donations, research) | infra | ⏳ Planned | Wave 2 |
| INFRA-QA-W3 | RLS persona integration suite | infra | ⏳ Planned | Wave 3 |
| INFRA-QA-W4 | Performance budgets (Lighthouse + k6) | infra | ⏳ Planned | Wave 4 |
| INFRA-QA-W5 | Accessibility axe gate | infra | ⏳ Planned | Wave 5 |
| INFRA-QA-W7 | Expanded prod synthetic monitoring | infra | 🟡 In progress | Wave 7 — KC `prod-smoke.yml` |
| INFRA-OSS-4 | **Snyk PR scan** | infra | 🟡 In progress | `SECURITY.md` |
| INFRA-OSS-6 | **GitGuardian** | infra | 🟡 In progress | `SECURITY.md` |
| PERF-4 | **Image delivery — upload-time thumbs + backfill** | agent-fullstack | 🟡 In progress | TD-11 |
| PERF-5 | **DB consolidation — per-chat unread count RPC** | agent-fullstack | 🟡 In progress | Migration `0133` |

## DONATE — Money hub

| ID | Task | Owner | Status | Spec |
|----|------|-------|--------|------|
| DONATE-G8b | **Donation-to-KC confirmation + karma.** Grow webhook Edge Function (verify with Grow API, idempotent via `provider_webhook_events`), record the donation, award karma (1 per ₪10, 10/month standing order, cap 100 — §7.6). [blocked: Grow merchant account + API credentials — launch plan A11] | agent-be | ⏳ Planned | `spec/13_donations.md` FR-DONATE-011 AC8 · `docs/spec/93` G8 |

## OPS — Testing & observability infrastructure (D68, D69)

| ID | Task | Owner | Status | Spec |
|----|------|-------|--------|------|
| OPS-G38 | **Shared DB test harness + per-world lifecycle flows.** Harness + runner + rides flow shipped; port items, food, knowledge flows onto it. | agent-be | 🟡 In progress | `docs/architecture/target.md` §5.1 · G38 |
| OPS-G42 | **Health registry + monitor + alert router.** `ops.health_checks`, hourly dev + prod run, GitHub issue / email now, WhatsApp later. | agent-fullstack | ⏳ Planned | §5.2 · G42 |
| OPS-G41 | **Edge Function error reporting** through one shared wrapper. | agent-be | ⏳ Planned | §5.2 · G41 |
| OPS-G39 | **Port contract tests** (fake + Supabase adapter, same suite). | agent-fullstack | ⏳ Planned | §5.1 · G39 |
| OPS-G40 | **Two-user E2E journey per active world** on relevant PRs. | agent-fe | ⏳ Planned | §5.1 · G40 |
| OPS-G43 | **Per-world flow funnel** from handoff timestamps. | agent-be | ⏳ Planned | §5.2 · G43 |

## Deferred (post-MVP, still tracked)

| ID | Task | Status | Spec |
|----|------|--------|------|
| P3.1 | Block / unblock + visibility restoration | ⏳ Deferred (EXEC-9) | `spec/08_moderation.md` FR-MOD-003/004/009 |
| P3.MATCH-XW | **Cross-world matching** (improvement, P3). Goal: pair listings across worlds when one enables the other (item give ↔ ride offer for pickup/delivery; food give ↔ volunteer time for distribution). AC: opt-in per world pair in `matching_settings`; reuses `match_candidates` with a `link_kind`; geo/time windows of both legs respected; never notifies above the per-user cap; SQL test + seed sample; off by default. | ⏳ Deferred (PM 2026-10-18) | `docs/SSOT/MATCHING_V2.md` |

---

## Sprint Protocol

1. Pick the highest `⏳` item in **this file** (not `archive/`)
2. Read its linked `spec/` file
3. Move status to 🟡
4. Implement
5. Move status to ✅ **and** append/move the row to `archive/BACKLOG-history.md`
6. Update spec file status if all ACs complete
