# Karma Points (FR-KARMA) — Design

> **Mapped to spec:** NEW domain `docs/SSOT/spec/14_karma.md` (FR-KARMA-001..009), created with the implementation.
> **Status of source spec:** new feature (not in any existing spec) → spec authored as part of this work.
> **Decision:** `DECISIONS.md` D-155 — karma self-only for MVP (public-ready data model), the points economy, a +1 registration floor, and realtime counter/karma propagation via own-row Supabase Realtime.
> **Layer scope:** full stack — `packages/{domain,application,infrastructure-supabase}` + `apps/mobile` + new `supabase/migrations`.
> **Refined by the implementation plan** (`docs/SSOT/archive/superpowers/plans/2026-05-29-karma-points.md`, after a 4-domain review council): closure karma anchors to the `posts.status` transition (not recipients-row existence); the ledger uses single-anchor append-and-sum with a partial-unique on once-events only (not a global UNIQUE); realtime filters `user_id` (not `id`) + needs `replica identity full`; the outreach soft daily-cap ships in MVP; anti-collusion caps gate the future public flip (D-156).

## Problem / Motivation

Every user should carry a single number that reflects **how involved they are** in the community.

- **Primary goal:** one engagement number per user.
- **Secondary goal:** nudge people to give more and stay involved.
- **Hard constraint (PM):** the number measures *engagement*, not wealth. Recipients and people in need MUST be able to accumulate it — it cannot reward giving only.

No karma/points concept exists in the codebase today. The app already maintains denormalized per-user counters (`items_given_count`, `items_received_count`, `followers_count`, …) via DB triggers, plus a nightly recompute + drift-detection job (migrations `0006`, `0044`, `0045`). Karma fits this exact pattern.

## Goals (Acceptance Criteria) — FR-KARMA-*

- **FR-KARMA-001 — Score storage & integrity.** `users.karma_points` (int, default 0) is the displayed total, backed by an append-only `karma_ledger`. Every award/reversal is idempotent (unique per event). The score is floored at 0 (mirrors FR-STATS-002 AC4). A nightly job recomputes the total from the ledger and reconciles drift (mirrors FR-STATS-005). A one-time backfill seeds existing users so launch day isn't all-zeros.
- **FR-KARMA-002 — Points schedule.** The earning table below. All values live in **one** place server-side (a single SQL schedule function) so future tuning is a one-function migration.
- **FR-KARMA-003 — Value bonus.** On a `Give` post that closes `delivered`, the giver gets a bonus = `round(estimated_value / 50)`, capped at `estimated_value = 1000` (max +20). Applies to both low- and high-value items.
- **FR-KARMA-004 — Estimated-value slider.** Create-post form shows, **only for `Give` posts**, a centered title "שווי מוערך של החפץ" above a slider `0–1000`, step `50`, top end labeled "1000+". Default `0`. Persists to `posts.estimated_value`.
- **FR-KARMA-005 — Reversals net to zero.** Reopen, recipient un-mark, unfollow, and admin-removal each reverse exactly the points they originally granted, to both economic roles where relevant.
- **FR-KARMA-006 — Anti-gaming.** Outreach scores once per (user, post) with a soft daily cap; follow→unfollow churn nets zero; the value bonus is realized only on real delivery.
- **FR-KARMA-007 — Display.** The number appears as a "נקודות קארמה" badge on **My Profile (self view only)** and as a card on the existing `/stats` screen, with a "how do I earn karma?" info affordance.
- **FR-KARMA-008 — Visibility (MVP self-only, public-ready).** Other users do **not** see the number yet. The stored value carries no privacy coupling — exposing it later is a display-gate change only, no schema/recompute change.
- **FR-KARMA-009 — Real-time propagation.** The karma number **and every per-user counter** (items given/received, active posts, followers/following) update on-screen in real time — no manual refresh, no focus-refetch — the moment the underlying value changes server-side. Closes the existing focus-only gap (FR-STATS-001 AC2 / TD-98).

## Points schedule (FR-KARMA-002 / 003)

Awards are assigned by **economic role**, not by ownership. In a `Give` post the owner is the giver; in a `Request` post the marked recipient is the giver and the owner is the receiver.

| Event | Recipient of points | Points |
|---|---|---|
| Registered an account | the new user | **+1** (once, on signup — floor for every user) |
| Post published (`Give` or `Request`) | publisher | **+5** |
| First outreach to a post's owner | the sender | **+1** (once per post; soft daily cap) |
| Gained a follower | the followed user | **+1** |
| Closed `delivered` — giver side | the giver | **+20** + value bonus |
| Closed `delivered` — receiver side | the receiver | **+15** (value-independent) |

Value bonus (giver, `Give` only, at closure): `round(estimated_value / 50)`, clamped at `1000`.

| estimated_value | bonus | giver total at closure |
|---|---|---|
| ₪0 | 0 | 20 |
| ₪100 | +2 | 22 |
| ₪500 | +10 | 30 |
| ₪1000+ | +20 | 40 |

Rationale: max bonus equals the closure base, so value matters without dwarfing engagement; a cheap gift still earns the full +20 base, satisfying "rewards low- and high-value alike, in a sensible ratio." Per-delivery the giver earns ~1.6×–3× the receiver (encourages giving) while the receiver still earns a solid, value-independent +15 (preserves dignity). The PM expects to retune these — hence the single-source-of-truth constraint in FR-KARMA-002.

## Non-goals (YAGNI)

- No levels / tiers / badges / leaderboard (deferred; PM said "surely more later").
- Not shown on other users' profiles yet (FR-KARMA-008).
- No value slider on `Request` posts (the model supports enabling it later with zero schema change).
- No reconstruction of historical value bonuses / outreach / post-creation in the backfill — seed is an approximation from existing counters (see below).

## Architecture

```
supabase/migrations
├── 00NN_post_estimated_value.sql   ← posts.estimated_value int null CHECK 0..1000; column-write guard in posts RLS/trigger
└── 00NN_karma_points.sql           ← users.karma_points; karma_ledger; karma schedule fn (constants live here);
                                       award/reverse triggers on post/follow/recipient/message/status events;
                                       nightly recompute fn + pg_cron; one-time backfill

packages/domain/src
├── karma.ts                        ← KarmaEventType, KARMA_VALUE_BONUS_DIVISOR=50/cap=1000, computeValueBonus() (pure)
├── entities.ts                     ← User.karmaPoints: number
├── posts.ts                        ← Post.estimatedValue: number | null
└── __tests__/karma.test.ts

packages/application/src
└── ports/IUserRealtime.ts          ← subscribe to own-user row changes (port)

packages/infrastructure-supabase/src
├── mappers                         ← mapUserRow → karmaPoints; map post → estimatedValue
├── posts adapter                   ← write estimated_value on create (Give only)
└── users/SupabaseUserRealtime.ts ← postgres_changes UPDATE on public.users, filtered user_id=me (mirrors chat/feed realtime)

apps/mobile
├── src/store/meStore.ts            ← subscribes IUserRealtime; karma + ALL counters read here (single client source)
├── src/components/CreatePostForm/EstimatedValueSlider.tsx   ← Give-only; live "this earns ~+X" preview
├── src/components/CreatePostForm/CreatePostFormScrollContent.tsx ← mount slider for Give
├── app/(tabs)/create.tsx           ← thread estimatedValue into publish
├── src/components/profile/KarmaBadge.tsx                    ← self-only number + "how to earn" info sheet
├── (My Profile screen)             ← mount KarmaBadge (self view only); counters read meStore
├── (/stats screen)                 ← karma card; counters read meStore
└── i18n/locales/he/*.ts            ← karma.* strings (badge label, slider title, explainer copy)
```

**Server-authoritative awards.** Karma is granted by DB triggers on the same events that already drive the existing counters — never by client writes. The schedule constants live in the SQL schedule function (single source of truth). The mobile slider preview mirrors only the value-bonus divisor as a domain constant (`KARMA_VALUE_BONUS_DIVISOR`), asserted by a domain test against this spec; the app never needs the other award amounts to function (it only renders the total).

## Data flow

1. **Create `Give` post** → `estimated_value` stored on the post row.
2. **Scored event fires** (post insert, follow edge insert/delete, recipient insert/delete, first message to owner, post status → `closed_delivered` / `removed_admin`) → `karma_award()` / `karma_reverse()` inserts an idempotent `karma_ledger` row and adjusts `users.karma_points`, floored at 0.
3. **Push** → the `users`-row UPDATE is broadcast over Supabase Realtime (RLS-gated to the owner); the mobile `meStore` updates and the karma badge + every counter re-render instantly. Cold load still reads `users.karma_points` directly; the self profile is the only surface that renders the number.
4. **Nightly** → recompute `karma_points = SUM(karma_ledger.points_delta)` per active user; mismatch emits a drift event and reconciles.

## Real-time updates (FR-KARMA-009)

Karma and all per-user counters are server-maintained columns on `public.users`, which is **already** in the `supabase_realtime` publication with RLS-gated delivery (migration `0007` — a client only ever receives its own row). The gap is purely client-side: the app doesn't yet subscribe to its own user row, so stats are focus-refetch today (the known FR-STATS-001 AC2 / TD-98 gap).

Approach (CTO decision): subscribe to `postgres_changes` (UPDATE on `public.users`, filtered `user_id=eq.<me>` — `user_id` is the PK) via a new `SupabaseUserRealtime` adapter that mirrors the existing `SupabaseChatRealtime` / `SupabaseFeedRealtime` house pattern, behind an `IUserRealtime` application port. The live row is written into the existing `['user-profile', userId]` react-query cache (the implementation plan refines this away from a separate `meStore`); the karma badge and every counter that reads that query update on-screen within one WebSocket round-trip — no polling, no refetch. One subscription, one row, RLS-enforced. (Requires `replica identity full` on `users` for reliable filtered-UPDATE delivery.)

This is right-sized and consistent with the app's existing realtime usage. If per-user subscriber fan-out later becomes a scaling concern, the documented upgrade path is Supabase **Broadcast from Database** (`realtime.broadcast_changes` inside the award trigger → a per-user topic), which decouples delivery from per-subscriber RLS checks. Not needed at MVP scale — recorded as a `TECH_DEBT` watch item, not built now (YAGNI).

## Backfill (FR-KARMA-001) — confirmed, ships with launch

One-time, at migration: per existing user insert a single `backfill` ledger row and set `karma_points` to
`1 (registration) + items_given_count*20 + items_received_count*15 + followers_count*1`.
This seeds from cheaply-available counters; historical value bonuses, post-creation, and outreach are not reconstructed (accepted approximation). The seed is part of the ledger, so the nightly recompute stays consistent. Confirmed by PM — no all-zeros launch; every existing and future user is worth at least 1.

## Error handling

- Award/reverse idempotent via `UNIQUE(user_id, event_type, ref_type, ref_id)` — a double-fired trigger is a no-op (directly avoids the double-count class behind TD-71).
- `karma_points` never < 0 (domain integrity; mirrors FR-STATS-002 AC4).
- `estimated_value` validated `0..1000` (DB `CHECK` + client clamp); values above 1000 score as 1000.

## Testing protocol

- **domain:** schedule constants match this spec; `computeValueBonus` boundaries (0, 50, 500, 1000, >1000 clamp); reversal symmetry.
- **SQL:** award on each event; reverse on reopen / un-mark / unfollow / admin-remove; idempotency under double-fire; floor-at-zero; backfill arithmetic; recompute reconciles injected drift.
- **mobile:** slider renders for `Give` only and clamps; karma badge visible on own profile, absent on other profiles; `/stats` card; explainer copy from i18n.

## SSOT updates (shipped in the implementation PR)

- Create `docs/SSOT/spec/14_karma.md` (FR-KARMA-001..009).
- `spec/10_statistics.md`: FR-STATS-001 AC2 now genuinely realtime (was focus-only) — update status note; close **TD-98**.
- `BACKLOG.md`: add row, flip to ✅ on merge.
- `DECISIONS.md`: D-155 (self-only-for-now visibility + points economy + registration floor + server-authoritative awards + realtime via own-row `postgres_changes`).
- `TECH_DEBT.md`: close TD-98 (counters realtime); add a watch item for the Broadcast-from-DB scale path and the SQL-constant ↔ TS-divisor mirror.
