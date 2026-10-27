# Audit 2026-05-16 — Posts / Closure / Feed

## Summary

The Posts / Closure / Feed surfaces are largely AC-aligned on the happy paths
shipped in P0.4-FE + P1.2 + 0083 (per-actor identity). However the audit
surfaces several material gaps that escape the current verification gate:

- **Two whole FRs are functionally unimplemented**: `FR-POST-007` (local draft
  autosave — zero code references) and `FR-POST-013` (300-day expiry transition
  — only the day-293 notification cron exists; no job ever sets `status='expired'`).
- **Per-actor identity projection (D-26, FR-POST-021)** is wired only on the
  Home Feed + `findById`. It is **bypassed** on `getProfileClosedPosts`,
  `searchPosts`, and `explorePosts`, so respondent identities on the profile
  closed-tab and in Search are not masked according to `post_actor_identity`.
- A **counter-drift bug** in the recipient-unmark + reopen path
  (`FR-CLOSURE-007` AC3 + `FR-CLOSURE-005` AC4): `rpc_recipient_unmark_self`
  manually decrements the owner counter and a subsequent
  `reopen_post_deleted_no_recipient` triggers `posts_after_change_counters`
  to decrement *again* → owner counter ends at -1 of the correct value.
- **Owner-mode banners (`FR-POST-015` AC2/AC3) and `FR-POST-006` AC3 OnlyMe
  interstitial** are missing from the UI.
- Home Feed never wires `onEndReached` (existing §3.11 is still open, not a
  regression).
- Edit-post emits **no `audit_event`** (`FR-POST-008` AC4).

Closure trigger fan-out (FR-CHAT-015), reopen RPCs, EXIF cron, and the ranked
feed path with viewer-aware `is_post_visible_to` are all behaving per spec.

## Re-verification of open followup rows

- **§3.7 Publish idempotency** — still open. No `client_request_id` column on
  `posts`; `CreatePostUseCase` / `SupabasePostRepository.create` do straight
  inserts. Confirmed (`grep "client_request_id" packages/.../posts supabase/migrations`
  returns nothing).
- **§3.11 onEndReached not wired** — confirmed still open. `app/(tabs)/index.tsx`
  renders `PostFeedList` without an `onEndReached` prop and `feedQuery` never
  receives a `cursor`. The infrastructure (`nextCursor`, ranked cursor encoding)
  is present, only the FE wire-up is missing.
- **§2.2 raw `Error` from adapter sites** — still open in
  `SupabasePostRepository.ts` (e.g. lines 71, 90, 135, 227) and helpers.
- **§5.6 server-side EXIF strip** — closed: cron `0080_strip_exif_cron.sql`
  in place and Edge Function shipped.

## New findings

| ID | Sev | FR / Area | File:Line | Symptom | Why it matters | Proposed home |
| --- | --- | --- | --- | --- | --- | --- |
| POST-01 | 🔴 | FR-POST-013 AC1 | `supabase/migrations/0066_notifications_post_expiry_cron.sql:1-55` | Only the day-293 *notification* cron exists. No job ever transitions `posts.status` to `'expired'`. The trigger logging on `new.status='expired'` (`0044_personal_activity_log.sql:160`) is dead code at MVP. | Posts older than 300 days never leave `open` — the lifecycle FSM (`FR-POST-012` AC2) does not actually run, expired posts keep counting toward the 20-post cap (`FR-POST-011`), and the "Republish" CTA never gets a row to act on. | New TD or P1.5 backlog item — schedule `bg-job-post-expiry`. |
| POST-02 | 🔴 | FR-CLOSURE-007 AC3 + FR-CLOSURE-005 AC4, FR-CLOSURE-009 | `supabase/migrations/0075_recipient_unmark_self.sql:69-77` + `supabase/migrations/0018_fix_counters_by_post_type.sql:127-136` + `supabase/migrations/0070_security_hardening.sql:206-213` | **Double-decrement of owner's items_given/received** when recipient unmarks AND owner subsequently reopens the now-`deleted_no_recipient` post within the grace window. `rpc_recipient_unmark_self` manually `stats_safe_dec`s the owner counter; the reopen UPDATE then hits the `posts_after_change_counters` `old.status in (closed_delivered, deleted_no_recipient) and v_now_open` branch which decrements again. | Directly violates `FR-CLOSURE-009` AC1/AC4 — drift between materialized counters and event-log truth. Recompute job (`0045_stats_recompute_nightly`) will repair but the dashboard / profile counts lie for up to 24h, and "items given" momentarily goes negative for active owners. | New TD — gate the manual dec in `rpc_recipient_unmark_self` on whether the subsequent UPDATE will be in the same txn, OR move the dec out of the RPC and rely on `posts_after_change_counters` for the closed→deleted leg. |
| POST-03 | 🔴 | FR-POST-021 AC2 (D-26), FR-POST-017 AC5 | `app/packages/infrastructure-supabase/src/posts/getProfileClosedPostsHelper.ts:42-62` | `getProfileClosedPosts` hydrates via `POST_SELECT_BARE` (no owner join) AND never calls `applyPostActorIdentityProjectionBatch`. Closed posts shown on the **respondent's** profile bypass the per-actor identity projection. | A user who set `exposure='Hidden'` on a closed post will still appear with full name + avatar on a profile-closed-posts surface to third parties — the exact violation D-26 was added to prevent. | Wire projection batch into the helper + extend `POST_SELECT_BARE` (or switch to `POST_SELECT_OWNER` for closed-tab rows). |
| POST-04 | 🔴 | FR-POST-021 AC2, FR-FEED-016 AC4 | `app/packages/infrastructure-supabase/src/search/searchQueryHelpers.ts:13-23` and `searchExploreHelpers.ts:12-20` | Universal Search post results bypass `applyPostActorIdentityProjectionBatch`. | Same identity-leak as POST-03 but on the Search tab. AC4 also implies visibility-awareness; that part is RLS-enforced, but identity masking is not. | Same fix as POST-03 — add projection at the search adapter boundary. |
| POST-05 | 🟠 | FR-POST-007 (all ACs) | (no code) — search returns 0 hits for "draft" in `app/(tabs)/create.tsx` or `apps/mobile/src/store/` | Local draft autosave is **entirely unimplemented** — no debounce, no AsyncStorage write, no "you have a draft" banner, no per-user scoping. | Drop the user out of the form (background, app crash, accidental close) and the post in progress is gone. Spec marks the FR ✅ in the status header but acceptance criteria are unmet. | Spec status downgrade to ⏳ + new BACKLOG item, or schedule for P1.4. |
| POST-06 | 🟠 | FR-POST-006 AC3 | `app/apps/mobile/app/(tabs)/create.tsx:210-214` | OnlyMe publish path skips the interstitial entirely — only `FollowersOnly` opens `ConfirmActionModal`. AC3 explicitly requires "Save private" / "Cancel" confirm. | Users publish `OnlyMe` without the reminder that visibility upgrades are allowed but not downgrades, which is the only reason the interstitial was specified. | Inline fix — add a second `ConfirmActionModal` branch. |
| POST-07 | 🟠 | FR-POST-015 AC2 + AC3 | `app/apps/mobile/app/post/PostDetailScrollContent.tsx` (whole file) | The owner-mode banners ("🔒 Private — only you can see this post." and "👥 Visible to your approved followers.") are **never rendered**. Only the `RecipientCallout` + `OwnerActionsBar` show. | Owners with `OnlyMe`/`FollowersOnly` posts get no visual confirmation of their visibility setting on the detail surface; in practice users frequently misunderstand which post is "private" vs "public" — the banner exists for exactly that reason. | Add two `<Banner>` conditional renders alongside `ClosedDeliveredExtras`. |
| POST-08 | 🟠 | FR-POST-008 AC4 | `app/packages/infrastructure-supabase/src/posts/executePostUpdate.ts` (whole file) | Editing a post emits **no `audit_event`**. R-MVP-Safety-3 is unenforced. | Lost moderation trail — admin restoring or reviewing a post cannot see who edited what / when. | Add a single `insert into audit_events` at the end of `executePostUpdate`, scoped to the diff between `current` and `patch`. |
| POST-09 | 🟠 | FR-FEED-001 AC4 | `app/apps/mobile/app/(tabs)/index.tsx:69-73, 143-160` + `app/apps/mobile/src/components/PostFeedList.tsx:106` | `feedQuery` is a plain `useQuery` with no `cursor`, and the Home Feed never passes `onEndReached` to `PostFeedList`. `nextCursor` returned by the adapter is read only to compute `hasMore` for the footer spinner. | Pagination is broken on Home Feed — once a user scrolls past page 1 they never see page 2. This is the existing follow-up §3.11; flagging here because it remains unfixed and is in scope. | Promote `feedQuery` to `useInfiniteQuery` and pass `onEndReached={fetchNextPage}`. |
| POST-10 | 🟠 | FR-POST-021 AC1 (RLS predicate) | `supabase/migrations/0083_post_actor_identity.sql:21-30` | `post_actor_identity_select_post_visible` requires `auth.uid() is not null`. Guests (`viewerId=null`) querying via `applyPostActorIdentityProjectionBatch` get an empty identity map → projection defaults to `Public` exposure → guests see real names/avatars even when the participant chose `Hidden`. | The guest preview (`FR-FEED-012`) shows the 3 most recent Public posts; under D-26 the publisher's `Hidden` policy must still apply. Guests currently see masked identities only by coincidence (no UI nav). | Either grant SELECT on the table to `anon` when the post is `Public` + visible, or push identity into `feed_ranked_ids` / a SECURITY DEFINER read. |
| POST-11 | 🟠 | FR-FEED-018 AC1, FR-FEED-016 AC6 | `app/packages/domain/src/searchTypes.ts:18-33` + `app/packages/infrastructure-supabase/src/search/searchQueryHelpers.ts:13-22` | `SearchFilters` lacks the post-shape dimensions `itemConditions`, `locationFilter {centerCity, radiusKm}`, `statusFilter`, `sortOrder`, `proximitySortCity`. `searchPosts` hardcodes `status='open'` and only consults `postType`/`category`/`city`. | Direct violation of the "shared post-filter vocabulary" promise. Users moving between Home Feed and Search see different filter sets. (TD-136 covers part of this but the type-level gap in `SearchFilters` is broader than TD-136 implies.) | Extend `SearchFilters` and wire helpers; TD-136 should be re-scoped to include the domain type. |
| POST-12 | 🟠 | FR-FEED-007 (deprecated but cold-start fallback still expected via FR-FEED-006 AC2) | `supabase/migrations/0022_feed_ranked_ids.sql:44-60` + `0025_feed_ranked_ids_followers.sql:40-53` | When sort=`distance` and the viewer has **no registered city** AND no explicit `proximity_sort_city`, RPC silently falls back to `newest`. But neither layer surfaces this fallback — the UI keeps the "By proximity" toggle highlighted, the user sees a chronological feed, and `EXEC-8`'s "nationwide cold-start" intent is technically met but invisibly. | Confuses users who think proximity is honored. Minor — D-8 is satisfied but observability is nil. TD-134 (analytics) will cover telemetry; until then no UX signal. | Either downgrade UI badge when fallback is active, or push a "couldn't compute distance — showing newest" hint via the existing toast infra. |
| POST-13 | 🟠 | FR-POST-005 AC5 + adjacent cleanup | `app/apps/mobile/src/services/imageUpload.ts` (whole file) + `app/apps/mobile/app/(tabs)/create.tsx:99-128` | No image-upload cleanup on **cancel/abort** of the create flow. Uploaded blobs stay in `post-images/<userId>/<batchUuid>/` until the daily reaper (`0079_storage_orphan_reconciliation_cron.sql`) runs. Tested: opening Create, uploading 3 photos, then hitting × leaves the rows in Storage for ~24h. | AC5 talks about retrying individual upload failures (which is wired). The orphan cleanup is intentional (per §5.7 the avatar mirror is also open) but worth a row for visibility. | Either pass the `batchId` to a `cleanupUnpublishedBatch` call in `useEffect` cleanup on screen unmount, or accept the reaper as authoritative and silence the row. |
| POST-14 | 🟠 | FR-POST-021 AC4 | `app/packages/infrastructure-supabase/src/posts/applyPostActorIdentityProjection.ts:137-144` + `app/apps/mobile/src/components/post-detail/RecipientCallout.tsx:60-63` | When the recipient's identity is masked (`mode='anonymous'`, `shareHandle=''`), `RecipientCallout`'s navigable branch is gated on `profileNavigable` so a tap is suppressed. Good. But the projection writes `shareHandle=''` and `displayName=''` to `recipientUser`. Other consumers that derive routes from `recipientUser.shareHandle` without checking `recipientProfileNavigableFromPost` would build `/user/` (invalid). | Latent risk — any new call site that grabs `recipientUser.shareHandle` and routes from it bypasses the navigability gate. | Have projection set `shareHandle=null` when anonymous and tighten the `PostWithOwner.recipientUser` type accordingly. |
| POST-15 | 🟢 | FR-FEED-014 AC3 | `app/packages/application/src/feed/GetActivePostsCountUseCase.ts` (referenced in spec; not read directly) | TD-135 acknowledges edge-cached endpoint deferral; works as-is. | Pre-launch hardening only. | TD-135 already covers. |
| POST-16 | 🟢 | FR-CLOSURE-007 — system-message side-effect | `supabase/migrations/0031_post_closure_emit_system_messages.sql:42-46` + `rpc_recipient_unmark_self` flow | When recipient unmarks, the RPC flips post `closed_delivered → deleted_no_recipient`. Trigger `posts_emit_closure_system_messages` has an early-return that requires `old.status='open'`, so it does **not** fire on this transition — meaning chats anchored to the post get no system message that the closure was undone. Spec FR-CLOSURE-007 is silent on system-message emission for unmark; reading literally this is fine (it's a recipient-side action, not an owner closure). Flagging because TD-148 already exists for Hebrew bodies. | Intentional behavior; no AC violation but worth verifying against product. | None — confirm with PM whether unmark should emit a system message. |
| POST-17 | 🟢 | FR-POST-002 AC4 second publish button | `app/apps/mobile/app/(tabs)/create.tsx:399-410` | Second publish CTA at bottom of form is present. | OK. | None. |
| POST-18 | 🟢 | FR-FEED-019 cities-geo | `supabase/migrations/0021_cities_geo.sql` + `0023_cities_geo_backfill.sql` + `0024_cities_geo_fixups.sql` | Cities seeded, haversine in place, RPC consumed. Adapter respects `null` distance for cities without coords. | OK. | None. |
| POST-19 | 🟢 | FR-CLOSURE-001 AC6 (anchor clear-on-close) | `supabase/migrations/0026_chat_anchor_lifecycle.sql` | Trigger updated to set `chats.anchor_post_id = NULL` after the system-message fan-out. | OK. | None. |
| POST-20 | 🟢 | FR-FEED-010 AC2 keyboard shortcut | `app/apps/mobile/src/components/WebRefreshButton.tsx:21-35` | `R` key wired with focus-guard against input/textarea/contentEditable and modifier-key suppression. | OK. | None. |
| POST-21 | 🟢 | FR-POST-019 AC3 Hebrew street suffix | `supabase/migrations/0081_street_number_allow_hebrew_suffix.sql` + `STREET_NUMBER_PATTERN` in domain | Hebrew-letter suffix admitted at DB + domain validator. | OK. | None. |
| POST-22 | 🟢 | FR-POST-009 visibility upgrade-only | trigger `posts_visibility_upgrade_check` (`0002_init_posts.sql:67-95`) + `UpdatePostUseCase.ts:66-69` | Two-layer enforcement (UI + DB). API surfaces `visibility_downgrade_forbidden` correctly. | OK. | None. |

(22 findings; 5 🔴, 13 🟠, 4 🟢.)

## Spec amendments needed

- **`FR-POST-007`**: status header in `docs/SSOT/spec/04_posts.md:3` is marked
  ✅ Core Complete; it should be downgraded — *zero* ACs of this FR are
  implemented. Either a) move the FR to a follow-up backlog item with status
  ⏳, or b) explicitly scope-cut the FR and amend `BACKLOG.md`.
- **`FR-POST-013`** AC1/AC2: the spec implies a single `bg-job-post-expiry`
  job; the current code splits "notify 7 days before" (shipped) from "actually
  expire" (unshipped). Either ship the second cron or amend AC1 to reflect
  notify-only.
- **`FR-POST-021`** AC1: tighten the SELECT policy text to address guest
  read access for `Public` + visible posts, or amend AC1 to state that
  identity masking is auth-required (and that guests always see the default
  `Public` projection).
- **`FR-FEED-016`** AC6 / **`FR-FEED-018`** AC1: clarify in the spec that
  `SearchFilters` (`packages/domain/src/searchTypes.ts`) must carry the
  shared dimensions, not just the UI store. Currently the type-level gap
  is invisible from the spec text.
- **`FR-CLOSURE-007`** Edge Cases: add a note about whether the
  `closed_delivered → deleted_no_recipient` transition triggered by unmark
  should emit a system message in anchored chats (today it does not — see
  POST-16). This avoids the spec being silent on a real concurrency
  surface.

## Notes

- Counter drift (POST-02) is repaired nightly by
  `0045_stats_recompute_nightly.sql`, so the visible impact is bounded to one
  day. Still worth fixing because the public profile counters can go negative
  momentarily, which the FE has no UI for (`stats_safe_dec` clamps DB rows
  but the in-flight Optimistic UI does not).
- POST-03 and POST-04 share a fix — adding
  `applyPostActorIdentityProjectionBatch` at the helper level. Recommend
  one combined PR.
- POST-09 has the largest behavioral impact for end users but is already
  tracked in §3.11 of the existing follow-up. Highlighting it ensures the
  next iteration of the loop picks it up.
- Did not re-flag closed items: §5.6 EXIF strip (closed via 0080), §2.2–2.5
  adapter-error wrapping (still open, captured in followup), TD-148 system
  messages Hebrew (captured in followup).
- Hard-coded Hebrew in closure step screens (`ClosureSheet.tsx`,
  `OwnerActionsBar.tsx`, `RecipientUnmarkBar.tsx`) all route through
  `t('closure....')` — no new bare-string leaks in this audit pass.
