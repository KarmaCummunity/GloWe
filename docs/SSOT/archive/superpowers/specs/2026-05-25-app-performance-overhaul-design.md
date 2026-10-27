# App Performance Overhaul — Design

| Field | Value |
| --- | --- |
| **Date** | 2026-05-25 |
| **Status** | Draft — planning artifact, not execution |
| **Mapped to spec** | Cross-cutting. Closes TD-126 (perf cluster), TD-137 (feed N+1), TD-11 (CDN), TD-135 (community stats cache), TD-92 (notification dispatcher), TD-125 (Sentry), partial TD-127 (cold-start cluster), TD-72 (actor identity projection) |
| **Driver** | PM directive — "make the app feel fast and smooth" |

---

## TL;DR (Executive summary)

The app does not have one single performance bug. It has **seven layers of waste that compound**. The user perceives this as "the app feels slow." A focused four-week effort addresses all seven, organized into five waves. The biggest single user-visible wave is Wave 1 (images + re-renders): the user will say "wow" within one week. The biggest backend-cost win is Wave 3 (push dispatcher batching): cuts Edge Function invocations by ~50–100× at scale.

**Decision on caching:** No external KV (Redis/Upstash) at this stage. Wins come from AsyncStorage (cities/streets), persisted React Query (feed/profile), materialized views (community stats), and a CDN (image edge caching). External KV becomes interesting post-launch at >5k DAU, mainly for rate-limiting and edge-cached read endpoints. Documented as a deferred option.

**Decision on measurement:** Wave 0 wires Sentry + custom marks. This was already required by TD-125 (no crash reporting). Bundling it here means we get a baseline for free.

---

## Goals

1. **First-contentful render of the feed ≤ 1.5s on a cold start over LTE** (today: unmeasured, perceived ~3–5s).
2. **Scroll FPS ≥ 55 on iPhone 11 and equivalent Android** in the feed and search results. Today: visible jank reported.
3. **Image bandwidth per session ↓ 80%+** through transform URLs + CDN + disk cache.
4. **Postgres reads per feed page ↓ 50%** by collapsing the two-round-trip feed pattern into one RPC.
5. **Push dispatcher cost per notification ↓ 90%+** by batching invocations and Expo API calls.
6. **Baseline observability** — Sentry crash + performance, custom marks, and dashboards for the four metrics above.

## Non-goals

- New product features (this is purely under-the-hood).
- Rewriting the architecture (Clean Architecture invariants from `CLAUDE.md §5` stay intact).
- Migrating to a different DB, ORM, or runtime.
- Building a custom analytics pipeline (the existing TD-134 covers product analytics separately).
- Multi-region database. Single region is fine for the foreseeable scale; CDN gives us most of the geo benefit.
- Caching layer overhaul that requires new infrastructure (Redis). Re-evaluated post-launch if metrics justify.

## Out of scope (explicitly deferred)

- FlashList migration (TD-126 mentions it). Worth doing after Wave 1 ships and we can measure whether plain FlatList + memoization is already enough.
- i18n namespace splitting / lazy-load (TD-154-adjacent). Big project; not the bottleneck right now.
- Server-side rendering of OG previews for shared links beyond what FR-POST-023 already ships.
- Realtime presence ("who is online"). Not currently a product surface.

---

## Diagnosis — the seven layers of waste

Each layer's findings are summarized below. Full file:line list is in the audit appendix.

### Layer A — Imaging (🔴🔴🔴, most user-visible)
- Full-resolution images served into 200px thumbnails (`PostCardGrid.tsx:61`) — wastes ~25× bandwidth per image.
- Full-resolution avatars served into 40px circles (`AvatarInitials.tsx:38`).
- `getPublicUrl()` called from inside `render()` (`PostCardGrid.tsx:60–62`) — string built per re-render.
- No `expo-image` anywhere → no disk cache → every tab switch re-downloads.
- `post-images` bucket fetched directly from Supabase Storage region (TD-11) → 150–300ms latency added per image for users far from the region.

### Layer B — Re-render storm in lists (🔴🔴)
- `useFilterStore()` bare call (`(tabs)/index.tsx:34`) and `useAuthStore()` destructure (`AuthGate.tsx:44`) and `useSearchStore()` bare call (`(tabs)/search.tsx:66`) subscribe to the whole store, so any unrelated store mutation re-renders the whole tree.
- `formatDistanceToNow()` called inline from PostCard and PostCardGrid render bodies, with the Hebrew locale loaded — recomputed for every visible card on every render.
- `PostCardGrid` not wrapped in `React.memo`; `renderItem` is an inline arrow (`PostFeedList.tsx:78–82`); breaks FlatList virtualization gain.
- `OnboardingSoftGate` context `value={{ ... }}` recreated every render — pushes the cost down the whole subtree.

### Layer C — Push notification dispatcher (🔴🔴🔴, biggest server-cost waste)
- One Edge Function invocation per notification (`dispatch-notification/index.ts:51`) — cold start paid per dispatch.
- One Expo Push API call per notification (`dispatch-notification/index.ts:156`) — Expo supports 100 messages per call; we send 1.
- `DeviceNotRegistered` errors trigger `DELETE … WHERE push_token = …` inside a loop instead of a single batched delete.
- Two separate `count(*)` queries on `notifications_outbox` per dispatch for coalescing (could be one RPC with a window function).
- TD-92 documents the per-minute chat dedupe key blocking the "X new messages" coalescer.

### Layer D — N+1 / over-fetching in DB calls (🟠🔴)
- Feed: `feed_ranked_ids` RPC returns IDs + distance, then a second `.in('id', …)` SELECT fetches the row data (TD-137).
- Inbox: `getMyChats.ts:45–91` runs three sequential SELECTs (chats → last-messages → user profiles) and reconciles client-side. A LATERAL join would be one query.
- Feed actor identity projection (`applyPostActorIdentityProjection.ts`) does a separate SELECT for `post_actor_identity` and another for `follow_edges` after the main feed query.
- `select('*')` in `chats`, `messages`, `donation_links`, `post_actor_identity` queries — payloads are 2–4× larger than needed.
- RLS policy `0106_recipients_select_visible_viewers.sql` does two EXISTS subqueries per row on every read — expensive when a profile has many recipients.
- `getMyChats` has no `.limit()` — scales linearly with the user's chat count.

### Layer E — Refetch storms (🟠)
- `QueryClient` defaults to `staleTime: 2min`, `refetchOnWindowFocus: true` (default), `refetchOnMount: true` (default). Every tab focus and screen mount refires queries.
- `useFeedRealtime.ts:43–47`: on app resume after backgrounding, the hook re-subscribes AND triggers a full feed refetch — double work. Should be incremental gap-fill (`createdAt > lastSeen`).
- Community stats polled every 60s in `useCommunityStatsAbout.ts:45` and `stats.tsx:45`. With 100 active screens that's 6,000 reads/hour on data that changes daily.
- Account gate polled every 60s (`useEnforceAccountGate.ts:64`). Both wasteful and slow to react.
- `stats.tsx:56-62` calls `invalidateQueries` on every focus — overrides staleTime entirely.

### Layer F — Realtime channels (🟠)
- Inbox subscription has no `filter:` clause, relying on RLS server-side — works correctly but channel still receives and discards client-side noise.
- Per-chat channel topic uses `Math.random()` (`SupabaseChatRealtime.ts:29`) → rapid re-mounts create orphan channels until GC.
- Unread total RPC fires on both `INSERT` and `UPDATE` events — read-receipt updates wastefully trigger the expensive unread RPC.

### Layer G — Cold start (🟠)
- `AuthGate` runs `restoreSession` → `tryDevAutoSignIn` → `bootstrap` sequentially. Could be parallel.
- Hebrew locale (~164KB) imported eagerly at module top — heavy on web first paint.
- Web DOM mutations (RTL/lang/favicon/viewport) executed inside React module-load instead of inline in the HTML template.

---

## Approach — five waves

Each wave is one or more PRs, independently shippable. We ship in order because earlier waves give us metrics that inform later tuning.

| Wave | Theme | Estimated effort | User-visible improvement |
| --- | --- | --- | --- |
| 0 | Observability baseline | 2 days | None directly; unlocks measurement |
| 1 | Imaging + re-renders | 5–7 days | Dramatic. Feed feels smooth, images load instantly on revisit, data usage drops. |
| 2 | DB + React Query | 4–6 days | Feed page-load ~½ time; tab switches no longer trigger refetch flicker. |
| 3 | Push dispatcher batching | 3–4 days | Fewer notification spam-bursts; major server-cost cut. |
| 4 | CDN + cold start + cache cities/streets | 3–4 days | First-open faster; images snappy worldwide; onboarding faster. |

Total calendar: 3–4 weeks for one engineer working full-time, or 5–6 weeks at 60% allocation. Each wave can pause for review before the next.

---

## Wave 0 — Observability baseline (2 days)

**Goal:** Be able to prove every later improvement. Close TD-125 in the same pass.

### Changes

1. **Install Sentry** (`@sentry/react-native`):
   - Wire crash reporting in `apps/mobile/app/_layout.tsx` and `apps/mobile/src/components/ErrorBoundary.tsx`.
   - Source map upload via EAS post-build hook.
   - Environments: `dev` and `prod`, tagged on init.
2. **Performance instrumentation** — Sentry Performance with custom transactions:
   - `app.cold_start` — from `_layout.tsx` mount to first interactive frame.
   - `feed.first_render` — from feed query trigger to first PostCard painted.
   - `image.first_paint` — first onLoad on the first visible PostCard image.
   - `screen.transition` — auto, via `@sentry/react-native` navigation integration with `expo-router`.
3. **Backend instrumentation** — add request timing to Edge Functions:
   - `dispatch-notification`, `validate-donation-link`, `delete-account` log `function.invocation_ms` and `function.cold_start` (truthy if `Deno.startTime` < 200ms).
4. **Custom dashboards** — three Sentry dashboards: cold start, feed first render, image paint timings — with p50/p75/p95 percentiles by platform.
5. **Sentry sample rate** — Performance 100% in dev, 25% in prod (sample down later if quota matters).

### Success criteria

- After 48 hours of dogfooding in dev/staging, each dashboard shows ≥100 samples per metric.
- Crash from `throw` inside `ErrorBoundary.componentDidCatch` produces a Sentry event with stack + source map.

### Risks

- Sentry SDK adds ~80–120KB to web bundle and ~250KB to native. Acceptable.
- Source map upload requires `SENTRY_AUTH_TOKEN` in EAS secrets — PM action.

---

## Wave 1 — Imaging + re-renders (5–7 days)

**Goal:** Make scrolling and image loading feel instant. This is the wave the user will feel most strongly.

### Changes

#### Imaging
- **PR 1.1 — `getSupabasePublicImageUrl(path, { width, quality })`** new helper in `apps/mobile/src/lib/imageUrl.ts`. Appends Supabase Storage image-transform params. All callers updated:
  - `PostCardGrid.tsx:60–62` → `width: 400, quality: 80`
  - `AvatarInitials.tsx:38` → `width: 96, quality: 75`
  - `PostCard.tsx`, `PostDetail`, profile chrome → equivalent sizes.
- **PR 1.2 — Adopt `expo-image`** across all image-rendering sites. Component-level prop set: `cachePolicy="memory-disk"`, `transition={150}`, `placeholder={blurhash}` where we have one.
- **PR 1.3 — Memoize URL composition** — `useMemo` on the URL inside PostCard / PostCardGrid so it isn't rebuilt on every render.

#### Re-renders
- **PR 1.4 — Store selectors everywhere**:
  - `(tabs)/index.tsx:34` — replace `const filter = useFilterStore()` with `useFilterStore(useShallow(s => ({ type: s.type, categories: s.categories, sortOrder: s.sortOrder, ... })))`.
  - `AuthGate.tsx:44` — split bare destructure into individual `useAuthStore(s => s.session)` calls.
  - `(tabs)/search.tsx:66` — same treatment.
  - Sweep the rest of `apps/mobile/**` for bare store calls (audit found ~12 sites).
- **PR 1.5 — `React.memo` PostCard family** + `useCallback` stable `renderItem` and `keyExtractor` in `PostFeedList.tsx`. Confirm `React.memo`'s default shallow compare is sufficient (props are primitives + the `post` object reference).
- **PR 1.6 — Hoist date formatting** — `useMemo(() => formatDistanceToNow(new Date(post.createdAt), { locale: he }), [post.createdAt])` inside PostCard / PostCardGrid.
- **PR 1.7 — Memo context values** — `OnboardingSoftGate.tsx:48` (and any other Provider value built inline).

### Success criteria

- Sentry `feed.first_render` p50 drops ≥30% vs Wave 0 baseline.
- Sentry `image.first_paint` p50 drops ≥50%.
- Image bytes downloaded per session (measured via DevTools network panel on the web build) drops ≥75%.
- Visual: scrolling the feed on iPhone 11 stays at 60 FPS in the Sentry FPS recorder.

### Risks

- `expo-image` migration touches a lot of files. Mitigation: PR 1.2 is mechanical (codemod) and behind a small wrapper `<KCImage>` so we can swap implementations later.
- Transform params query string broke once historically (TD-11 mentions the bucket is public). Mitigation: test in dev project first; rollback is removing the param.

---

## Wave 2 — DB + React Query (4–6 days)

**Goal:** Cut Postgres round-trips on hot paths. Stop refetch storms.

### Changes

- **PR 2.1 — `rpc_feed_one_round_trip`** — new Postgres function that returns full feed rows in one shot (closes TD-137). Replaces the `feed_ranked_ids` + `.in('id', …)` pattern in `SupabasePostRepository.getFeed`. Same return shape; clean swap.
- **PR 2.2 — `rpc_inbox_with_last_message`** — single RPC using LATERAL JOIN: `chats` × `last_message` × `last_message_sender` × `counterparty_profile`. Closes the three-query pattern in `getMyChats.ts`.
- **PR 2.3 — Column pruning** — replace every `select('*')` in `infrastructure-supabase/` with an explicit column list. Verified targets: chats, messages, donation_links, post_actor_identity, about_team_members.
- **PR 2.4 — `.limit()` everywhere** — add explicit `.limit()` to every list query. Defensive: `100` is a safe upper bound for inbox and lists; PM-confirmable for `about_team_members` (10 is fine).
- **PR 2.5 — QueryClient config rewrite** — in `apps/mobile/app/_layout.tsx`:
  ```ts
  defaultOptions: {
    queries: {
      staleTime: 10 * 60_000,      // 10 min — most data is fine for 10 min
      gcTime: 30 * 60_000,         // 30 min — keep in memory longer
      refetchOnWindowFocus: false, // explicit; we use Realtime/per-query overrides instead
      refetchOnMount: true,        // default — respects staleTime
      retry: 2,
    }
  }
  ```
  Per-query overrides remain (community stats, feed, chat) — see PR 2.6.
- **PR 2.6 — Per-query staleTime audit** — promote each `useQuery` to a sensible value:
  - Feed: 60s (realtime fills gaps anyway).
  - Profile (self): 5min.
  - Profile (others): 60s.
  - Stats: 5min + Realtime subscription (PR 2.7).
  - Legal docs: indefinite (LegalDocumentCache already handles it).
- **PR 2.7 — Replace stats polling with Realtime** — drop `setInterval` in `useCommunityStatsAbout.ts` and `stats.tsx`; subscribe to `community_stats` table changes via Supabase Realtime.
- **PR 2.8 — Feed gap-fill on resume** — `useFeedRealtime.ts:43–47` should fire a range query (`createdAt > lastSeenEpoch`) instead of a full refetch.
- **PR 2.9 — `actor_identity` projection batched** — adapt `applyPostActorIdentityProjection` to fetch identity in a single `.in()` query instead of one-per-post. This was actually already partially done (`applyPostActorIdentityProjectionBatch`); make sure it's used everywhere TD-72 calls out.
- **PR 2.10 — RLS read-path tightening for `recipients`** — replace the two EXISTS subqueries in `0106_recipients_select_visible_viewers.sql` with a `JOIN`-based check or a SECURITY DEFINER function. Spike work first; if no clear win, document and skip.

### Success criteria

- Sentry `feed.first_render` p50 drops further (target: total reduction ≥50% vs Wave 0 baseline).
- Postgres reads per feed page in pg_stat ≤ ½ the pre-change number.
- Inbox open transaction (`screen.transition` from tap to first row painted) p50 ≤ 250ms.

### Risks

- New RPCs need RLS replication. Mitigation: use `SECURITY DEFINER` + explicit `WHERE` clauses replicating the policy logic; integration tests verify identical visibility.
- Reducing `refetchOnWindowFocus` to `false` means stale data on tab switch. Mitigation: per-query overrides for inbox + feed + stats keep them fresh; everything else is fine for 10 minutes.

---

## Wave 3 — Push dispatcher batching (3–4 days)

**Goal:** Cut Edge Function invocations and Expo API calls dramatically. Improve coalescing behavior.

### Changes

- **PR 3.1 — Cron-driven outbox processor** — new Edge Function `dispatch-notifications-batch` that runs every 5 seconds (pg_cron + invokes via `net.http_post`), processes up to 100 outbox rows in one batch.
- **PR 3.2 — Per-invocation processing remains as fallback** for low-volume / immediate cases (chat messages where 5s latency matters). Keep `dispatch-notification` (singular) for `urgency: 'high'` rows; everything else goes through the batch processor.
- **PR 3.3 — Expo batch API call** — `sendExpoPush(messages: ExpoPushMessage[])` already takes an array; the existing `for (const message of messages) await sendExpoPush([message])` pattern in `dispatch-notification/index.ts:156` becomes `await sendExpoPush(messages)`. Up to 100 per call.
- **PR 3.4 — Batched bad-token cleanup** — accumulate failed `DeviceNotRegistered` tokens in an array, then `supabase.from('devices').delete().in('push_token', failedTokens)` once at the end of the batch.
- **PR 3.5 — Coalesce-key fix** — change chat dedupe key from per-minute to per-conversation-window (e.g., `chat:<chatId>:<viewerId>:<5min-window>`) so the "X new messages" coalescer can engage (closes part of TD-92).
- **PR 3.6 — Window-function coalesce query** — replace the two separate count queries with a single RPC using `count() OVER (PARTITION BY dedupe_key)`.

### Success criteria

- Edge Function invocations (visible in Supabase logs) drop ≥50% during a 1-hour load test where 1000 messages are sent across 50 chats.
- Expo API HTTP requests per notification batch averaged ≤ 1.5 (1 batch call + occasional retry).
- A user receiving 8 messages in a 5-minute window gets one "8 new messages" push, not 8 separate pushes.

### Risks

- 5-second batch latency vs current instant dispatch. Acceptable for FR-NOTIF kinds other than `chat_message` (where we keep the immediate path for high-urgency).
- Outbox row locking during batch processing. Mitigation: `SELECT … FOR UPDATE SKIP LOCKED LIMIT 100`.

---

## Wave 4 — CDN + cold start + cache cities/streets (3–4 days)

**Goal:** First-launch experience and worldwide image speed.

### Changes

- **PR 4.1 — CDN in front of `post-images` bucket** — Cloudflare (or Bunny — needs PM choice; Cloudflare's free tier is excellent and the team already knows it from `karma-community-kc.com`):
  - Subdomain `cdn.karma-community-kc.com` → CNAME → Supabase Storage origin.
  - Cache-Control headers set on storage objects: `public, max-age=31536000, immutable` (filenames include content-hash via image upload pipeline already? — verify; if not, add hash).
  - Update `getSupabasePublicImageUrl` to emit the CDN URL instead of the origin URL.
- **PR 4.2 — Parallel cold-start in AuthGate** — refactor `AuthGate.tsx:54–85`:
  ```ts
  const [restored, autoSigned] = await Promise.all([
    restoreSessionUseCase.execute(),
    tryDevAutoSignIn(),
  ]);
  ```
  Bootstrap depends on `restored`, so still serial after the join — but the two cheap operations parallelize.
- **PR 4.3 — AsyncStorage cache for cities** — wrap `SupabaseCityRepository.listAll()` in a thin cache layer keyed by `cities@v<schema_version>`. TTL: 7 days; manual bump on city table change (rare).
- **PR 4.4 — AsyncStorage cache for streets per city** — `SupabaseStreetRepository.listByCity(cityId)` cached under `streets:<cityId>@v<schema_version>`.
- **PR 4.5 — Hoist web DOM setup to HTML template** — RTL/lang/favicon/viewport blocks in `_layout.tsx:19–90` move into `web/index.html` `<head>`. Eliminates 10–20ms of JS execution before first paint on web.

### Success criteria

- Sentry `app.cold_start` p50 drops ≥25% vs Wave 0 baseline.
- Onboarding city-picker open-to-first-row p50 ≤ 100ms (was: 600–1500ms cold).
- Image first-paint p50 for users outside the Supabase region drops ≥40% (geo-segmented Sentry).

### Risks

- CDN setup is operations-flavored. Mitigation: Cloudflare is well-trodden; the team owns `karma-community-kc.com` already.
- AsyncStorage cache versioning — wrong invalidation gives users a stale city list. Mitigation: version bump on every cities migration.

---

## Caching strategy (the "Redis question")

### Verdict

**No Redis in scope.** Cache wins for this app are achievable with native + Postgres primitives at a fraction of the operational cost. If post-launch metrics show specific hot paths that aren't solved by what's below, revisit.

### Layered strategy

| Tier | What lives here | Wave | Notes |
| --- | --- | --- | --- |
| **In-memory (React Query)** | feed, profile, post detail, follow-state, donation links, search results | Wave 2 | staleTime tuned per query. Default 10min. |
| **AsyncStorage (per device)** | cities, streets, legal docs, last-known feed page (for offline cold start) | Wave 4 | Cities/streets are static gov data. Legal docs already cached. |
| **Postgres materialized view + cron refresh** | `community_stats`, future leaderboards | already in place; tune in Wave 2 | Refresh frequency: 5 min for stats; daily for leaderboard kinds. |
| **CDN edge (Cloudflare)** | post images, avatars, future static assets | Wave 4 | Bytes never re-fetched from Supabase Storage. |

### When Redis becomes interesting (deferred — post-launch)

Triggers that would justify introducing Upstash (~$10/mo to start):
- DAU > 5,000 and `community_stats` reads exceed 1M/day.
- Need for distributed rate-limiting on Edge Functions (e.g., spam protection on `validate-donation-link`).
- Need for cross-device "last-active" presence with sub-second freshness.
- Need for idempotency keys spanning the outbox dispatcher batches.

None of these apply today. Document the option and move on.

---

## Risks & open questions

| Risk | Mitigation |
| --- | --- |
| Sentry quota cost in prod | Performance sample rate at 25%; revisit at >1k DAU. |
| `expo-image` introduces new platform-specific bugs | Roll out via a `<KCImage>` wrapper; can swap back to RN `<Image>` per-platform if needed. |
| New feed RPC has subtle visibility differences vs the JS path | Integration test set covering: Public/Followers/OnlyMe owner views, banned user, blocked user, hidden identity. |
| CDN URLs leak after PR 4.1 — image cache busting | All paths include a content hash already (verify); cache-control `immutable` is safe. |
| 5s batch latency annoying for chat | High-urgency chat path remains immediate. Only digest-style kinds go through batch. |

## Mapped to spec / TDs

This work doesn't close a single FR — it closes a cluster of TDs that have accreted around performance:
- **Closes**: TD-126 (perf cluster), TD-137 (feed N+1), TD-135 (community-stats cache), TD-125 (Sentry), partial TD-92 (dispatcher).
- **Partially addresses**: TD-11 (CDN — needs follow-up on signed URLs for private posts), TD-127 (cold-start cluster), TD-72 (actor identity projection completion).
- **Spins out**: New TD entries for any deferred item (e.g., FlashList migration, i18n namespace split).

BACKLOG.md additions on execution (not in this spec):
- `PERF-1` Wave 0 (observability) — INFRA lane.
- `PERF-2` Wave 1 (imaging + re-renders) — P1 priority, FE lane.
- `PERF-3` Wave 2 (DB + RQ) — P1 priority, BE+FE lanes.
- `PERF-4` Wave 3 (dispatcher) — P2 priority, BE lane.
- `PERF-5` Wave 4 (CDN + cold start + cache) — P2 priority, mixed lanes.

## Success metrics (post-launch dashboard)

By the end of Wave 4 we should be able to show, in Sentry dashboards:

| Metric | Wave 0 baseline | Target after Wave 4 |
| --- | --- | --- |
| `app.cold_start` p50 | TBD (Wave 0 measures) | ≤ 1500ms |
| `feed.first_render` p50 | TBD | ≤ 800ms |
| `image.first_paint` p50 | TBD | ≤ 250ms |
| Postgres reads per feed page | 2 (RPC + SELECT) | 1 |
| Edge Function invocations per push (10-msg burst) | 10 | ≤ 2 |
| Image bytes per session | TBD | ↓ ≥ 75% |

## Appendix — file:line audit list

This is the raw list from the four parallel audits, kept here so plan authors can map each PR to specific code. Layers A–G above are summaries of these findings.

> The full audit is preserved in this design doc rather than a separate file so plan authors can map each PR back to specific code.

(See sections "Layer A" through "Layer G" above for the canonical list.)
