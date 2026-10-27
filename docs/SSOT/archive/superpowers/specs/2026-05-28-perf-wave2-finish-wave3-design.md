# Performance — Image delivery + DB consolidation + Smart caching — Design

| Field | Value |
| --- | --- |
| **Date** | 2026-05-28 |
| **Status** | Draft — PM-approved priority order, execution underway |
| **Driver** | PM directive — "the worst problem is image display + loading. Also don't spam the database and manage cache smartly." |
| **Parent design** | [`2026-05-25-app-performance-overhaul-design.md`](2026-05-25-app-performance-overhaul-design.md) — diagnosis + waves architecture |
| **Mapped to** | New image work (re-opens part of PERF-2 Wave 1 that didn't land) + PERF-3 Wave 2 deferred half + Wave 4 caching subset. Push dispatcher batching (PERF-4) deferred until PM signals. |

---

## TL;DR (for the PM)

Three sequential shipments against `dev`, ordered by the user-felt severity you flagged today.

1. **Shipment 1 — Image delivery (URGENT).** Today the app serves a 2048px JPEG into every 200px thumbnail and a 512px avatar into every 40px circle. The Wave 1 fix from 2026-05-25 doesn't work on this Supabase project — the image-transform endpoint hangs or 404s on `post-images`, which is why it was reverted in PR #397. The replacement plan generates the right sizes **at upload time** (no transform endpoint needed, no CDN needed). Existing images get backfilled in one pass. Users feel: feed images appear ~10× faster on cellular; mobile data per session drops ≥85%; web stops re-downloading the same image on every tab switch.

2. **Shipment 2 — DB consolidation.** Today the feed makes 3 server round-trips per page; the inbox makes 4. Each collapses to one. Users feel: feed first row paints ~½ the current time; opening the chat list is snappier; heavy chat users feel the biggest jump (today the inbox transfers every unread message just to count them).

3. **Shipment 3 — Smart caching.** Today cities/streets onboarding lists are re-fetched from the server every cold open; React Query forgets the feed on every app restart. Cache cities/streets on-device with a 7-day TTL; persist React Query across app restarts; audit per-query staleness. Users feel: app reopens with the feed already on screen; onboarding city picker is instant.

**Push dispatcher batching** (the original Shipment B in earlier drafts of this spec) is **deferred**. It's a hosting-cost win, not a user-felt issue today, and the PM has prioritized user-felt work first.

**Calendar estimate:** Shipment 1 ~3-4 days. Shipment 2 ~2-3 days. Shipment 3 ~2-3 days. Total ~1.5 weeks of focused engineering. Each ships as its own PR against `dev`.

---

## What changes for users

### After Shipment 1 (Images)

| Surface | Before | After |
| --- | --- | --- |
| Feed thumb (rendered at 200px) | 2048px JPEG (~300-500KB) | 400px thumb (~25-40KB) |
| Avatar circle (rendered at 40px) | 512px JPEG (~50-80KB) | 96px thumb (~4-8KB) |
| Web tab switch | Image re-downloads on every navigation | Image served from browser cache (1-year immutable) |
| Worldwide latency | Every fetch hits Supabase Storage origin | Same (CDN deferred to a later shipment; biggest pain is size, not geography) |
| Cellular session data | High — full-res JPEGs everywhere | ~85-92% less data per session |
| Web blurhash placeholder | Disabled (workaround for transform-endpoint failure) | Re-enabled — images load progressively from a blur |

### After Shipment 2 (DB consolidation)

| Surface | Before | After |
| --- | --- | --- |
| Cold open → feed first row painted | 3 sequential DB round-trips | 1 round-trip |
| Tap inbox tab → chat list painted | 4 sequential DB round-trips | 1 round-trip |
| Heavy chat users (50+ threads) | Transfer every unread message just to count them | Counter computed server-side; payload shrinks ~10× |

Zero visible behavior change: same feed ordering, same visibility rules (Public/Followers/OnlyMe + banned + blocked + hidden identity), same inbox dedupe.

### After Shipment 3 (Caching)

| Surface | Before | After |
| --- | --- | --- |
| Onboarding city picker — first open | 600-1500ms cold (Supabase round-trip) | <100ms — served from device cache |
| App restart → feed | Empty until network query returns | Feed already on screen (persisted from last session) |
| Tab switch back to feed after backgrounding | Re-fetch trigger | Cache hit until staleness window expires |

---

## Out of scope (deferred, with rationale)

| Item | Why deferred | When revisit |
| --- | --- | --- |
| Push dispatcher batching (PERF-4 / 5/25 Wave 3) | PM prioritization — not user-felt today | When notification cost shows on hosting bill or chat-spam complaints surface |
| CDN in front of `post-images` (5/25 Wave 4 PR 4.1) | Upload-time thumbs solve the size problem (~85-92% bandwidth cut). CDN adds worldwide geo speed on top. | When users-outside-Israel complaints surface |
| Cold-start parallelization (5/25 Wave 4 PR 4.2) | Not in PM's top-3 today | Next perf round |
| FlashList migration (5/25 design § Out-of-scope) | Wave 1 memoization already shipped most of the FlatList wins | When measured FPS regression appears |
| Server-side OG previews | Already covered by FR-POST-023 | N/A |

---

## Success metrics

All baselines come from Sentry dashboards Wave 0 collects.

### Shipment 1 (Images)
- `image.first_paint` p50 drops ≥60% vs the current pre-Shipment-1 baseline.
- Image bytes per feed-scroll session drop ≥85% (measured via DevTools network panel on the web build, fresh-cache state).
- A specific user-flow check: scrolling 20 posts in the feed downloads ≤2MB total (today: 8-15MB).
- Web: an image that was rendered in the feed is served from `disk cache` (not re-fetched) when the user opens that post's detail screen.

### Shipment 2 (DB)
- `feed.first_render` p50 drops ≥40% vs current baseline (cumulative cut from Wave 0 baseline ≥50%).
- Inbox open transaction (Sentry `screen.transition` from tap to first chat row painted) p50 ≤ 250ms.
- Postgres reads per feed page: 3 → 1. Per inbox open: 4 → 1.

### Shipment 3 (Caching)
- `app.cold_start` p50 drops ≥20% vs current baseline.
- Onboarding city-picker open-to-first-row p50 ≤ 100ms (today: 600-1500ms cold).
- Feed `staleTime`-hit ratio in Sentry breadcrumbs ≥70% on tab focus events.

---

## Sequencing and rollout

**Shipment 1 first** because the PM flagged it as the worst user-felt issue.

1. PR 1 from this branch (`perf/PERF-3-wave2-finish-feed-inbox-rpcs` — will be renamed) → `dev`. Image upload-time thumbs + backfill + KCImage size hints + web blurhash re-enable + immutable cache headers.
2. Merge, observe Sentry deltas in dev for 24 hours.
3. PR 2 from a fresh branch off updated `dev` — DB consolidation (feed + inbox RPCs). The design appendix below holds the engineering details.
4. PR 3 from a fresh branch off updated `dev` — Smart caching.

Each PR follows the standard `CLAUDE.md` PR workflow (typecheck + test + lint green; PR body includes `Mapped to spec` line; SSOT updates in the same PR).

---

## Risks and mitigations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Thumb generation client-side adds latency to upload UX | Low | `ImageManipulator.manipulateAsync` already runs on the resize step. Second call adds ~200-400ms; acceptable for the upload flow. |
| Backfill pass exhausts Edge Function CPU quota | Medium | Page through `post-images` and `avatars` buckets; rate-limited; runs as cron with bounded `lookbackHours` (same pattern as `strip-exif`). |
| Storage cost ~2× due to thumb files | Low | Thumb is ~1/10 the size of the original; net cost growth ~10%. Bucket already small relative to plan limit. |
| `<KCImage>` size hint mismatched to rendered surface → still serves wrong size | Low | Tests + an audit pass over every callsite during the shipment. Wrong-size doesn't break — it just doesn't save the bandwidth. |
| Web blurhash re-enable re-triggers the bug from PR #397 | Low | The bug was the transform endpoint never returning. With upload-time thumbs we never call the transform endpoint, so the failure mode can't recur. |
| Avatars from Google OAuth bypass our pipeline | Known | Avatars from Google CDN are already fast (Google's edge). Documented; not a regression. Future shipment could mirror them into our bucket if needed. |
| DB RPCs return posts a viewer shouldn't see (RLS divergence) | High | Mirror RLS predicates inside SECURITY DEFINER bodies with explicit `WHERE` clauses; integration tests across the visibility matrix. (Same approach as 5/25 design.) |
| Persistent React Query restores stale data on app restart | Medium | Bound persistence age (e.g., 1h max persisted age for feed; indefinite for static catalogs); `gcTime` aligned. Realtime gap-fill (already shipped in PERF-3) reconciles. |

---

## TDs closed / advanced

- **Shipment 1:** Reopens and closes part of TD-126 (image perf cluster) that didn't survive the PR #397 revert. Closes TD-11 (post-images cache headers — the public-read bucket gets immutable cache control). Touches TD-11's "private posts via signed URL" concern indirectly — still deferred separately.
- **Shipment 2:** Closes TD-137 (feed N+1). Fully closes TD-72 (actor identity projection — final batched call subsumed into feed RPC).
- **Shipment 3:** Closes the cities/streets piece of TD-127 (cold-start cluster).

---

## Engineering execution appendix

> _PM: you don't need to read this. It's for the implementing agent._

### Shipment 1 — Image delivery

**Mobile changes**
- `apps/mobile/src/services/imageUpload.ts` — extend `resizeAndUploadImage` to produce two encodes per picked image: a full-size at 2048px max edge (unchanged) and a 400px max-edge thumb. Upload both: full at `<userId>/<batchUuid>/<ordinal>.jpg`, thumb at `<userId>/<batchUuid>/<ordinal>-thumb.jpg`. Both written with `cacheControl: 'public, max-age=31536000, immutable'` via the Storage upload options.
- `apps/mobile/src/services/avatarUpload.ts` — same pattern: write a 96px thumb to `<userId>/avatar-96.jpg` alongside the existing `<userId>/avatar.jpg`. Cache busting `?v=` query string preserved (it's path-stable per upload).
- `apps/mobile/src/lib/imageUrl.ts` — new helper `getSupabaseImageThumbUrl({ bucket, path })` that derives the thumb path from the full path (insert `-thumb` before the extension). Existing `getSupabasePublicImageUrl` stays for full-size renders (post detail, lightbox). Both go through `/storage/v1/object/public/` — no transform endpoint involved.
- `apps/mobile/src/components/ui/KCImage.tsx` — add a `size?: 'thumb' | 'full'` prop. When `size='thumb'`, callers pass the thumb URL. Default stays `full` for safety. No magic auto-derivation — explicit per callsite.
- `apps/mobile/src/components/PostCardGrid.tsx` — use thumb URL.
- `apps/mobile/src/components/AvatarInitials.tsx` — use thumb URL for any surface ≤96px (which is all the chrome surfaces).
- Re-enable blurhash + crossfade on web in `KCImage.tsx`. The PR #397 reasoning (transform endpoint failure) no longer applies; remove the `IS_WEB` skip.
- `MediaAssetInput` (in `@kc/application`) — add optional `thumbPath` field so the domain knows about the thumb. Backwards compatible (consumers fall back to deriving the path if not present).

**Backend changes**
- `supabase/functions/backfill-image-thumbs/index.ts` — new Edge Function (mirrors `strip-exif` pattern). Paginates `post-images` and `avatars` buckets; for any full-size object without a sibling `-thumb`, downloads, resizes via a server-side image library (`https://esm.sh/sharp` or `@imagemagick/magick-wasm` — pick whichever is mature on Deno), uploads the thumb, sets cache headers. Idempotent. Manual POST trigger.
- `supabase/migrations/0133_backfill_image_thumbs_cron.sql` — one-shot cron entry that fires the backfill function once on deploy via `net.http_post` (then the cron entry self-disables, or we delete it in a follow-up migration). Alternative: run it from `OPERATOR_RUNBOOK.md` as a manual ops step.
- Storage RLS policies — verify the existing `post_images_insert_own` and avatar policies cover the thumb paths (they should, since the policy keys on the first path segment = `auth.uid()`).

**Tests**
- `apps/mobile/src/services/__tests__/imageUpload.thumb.test.ts` — covers the two-encode-and-upload flow.
- `apps/mobile/src/lib/__tests__/imageUrl.test.ts` — extend with thumb URL derivation.
- `supabase/functions/backfill-image-thumbs/__tests__/backfill.flow.test.ts` — covers the paginated scan + thumb generation + skip-if-exists logic.

### Shipment 2 — DB consolidation

Identical scope to the prior version of this spec. Reproduced briefly here for continuity.

**Migrations**
- `0134_rpc_feed_one_round_trip.sql` — SECURITY DEFINER. Single RPC subsuming `feed_ranked_ids` + the `.in('post_id', ids)` row fetch + `applyPostActorIdentityProjectionBatch`. Returns the existing `POST_SELECT_OWNER` columns + `distance_km` + projected actor identity columns. RLS replicated explicitly.
- `0135_rpc_inbox_with_last_message.sql` — SECURITY DEFINER. Single RPC subsuming chats + last-messages + unread count + counterparty user. `dedupeRowsByCounterpart` rule lifted into SQL. LATERAL JOINs for last-message and unread.

**Frontend swaps**
- `app/packages/infrastructure-supabase/src/posts/feedQueryRanked.ts` + `feedQuery.ts` → single new module calling the new RPC. `SupabasePostRepository.getFeed` updated.
- `app/packages/infrastructure-supabase/src/chat/getMyChats.ts` → single RPC call. Helpers retained if still used elsewhere.

**Tests**
- Visibility-matrix integration tests for feed RPC (Public, Followers, OnlyMe, banned, blocked, hidden identity).
- Inbox RPC tests for deleted counterpart, support thread, unread accuracy.

### Shipment 3 — Smart caching

**Mobile changes**
- `apps/mobile/src/services/cityStreetCache.ts` — new module wrapping `SupabaseCityRepository.listAll` and `SupabaseStreetRepository.listByCity` with an AsyncStorage layer. Keys: `cities@v1`, `streets:<cityId>@v1`. TTL: 7 days; manual schema-version bump on city table change.
- `app/_layout.tsx` (or wherever `QueryClient` is constructed) — wire `@tanstack/query-async-storage-persister` with `persistQueryClient`. Persist:
  - `['feed', filters]` — max-age 1h (Realtime gap-fill reconciles).
  - `['profile', userId]` — max-age 24h for self, 1h for others.
  - Skip persistence for `['admin.*']`, `['stats.*']` (already realtime-fed), `['legalDocs']` (already cached natively).
- Per-query `staleTime` audit — pass over `apps/mobile/src/**` finding any `useQuery` without an explicit `staleTime` and assign one per the 5/25 design's staleness table.

**Tests**
- `cityStreetCache.test.ts` — covers hit, miss, expiry, schema-version bump.
- React Query persister wiring smoke test.

---

## SSOT updates required in each PR

PR 1 (Shipment 1 — Images):
- `docs/SSOT/BACKLOG.md` — add row `PERF-4` (Image delivery — upload-time thumbs + backfill + cache headers); flip status during work.
- `docs/SSOT/TECH_DEBT.md` — close the image-perf piece of TD-126; close TD-11's public-bucket cache-control piece.

PR 2 (Shipment 2 — DB consolidation):
- `docs/SSOT/BACKLOG.md` — add row `PERF-5` (DB consolidation — feed + inbox RPCs).
- `docs/SSOT/TECH_DEBT.md` — close TD-137; close remaining TD-72.

PR 3 (Shipment 3 — Caching):
- `docs/SSOT/BACKLOG.md` — add row `PERF-6` (Smart caching — AsyncStorage catalogs + persistent React Query).
- `docs/SSOT/TECH_DEBT.md` — close cities/streets piece of TD-127.

Both PR 1 and PR 3 may surface new spin-out TDs (e.g., CDN for worldwide image speed, FlashList for any FPS gaps); log them at the same time.
