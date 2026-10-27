# 2.6 Feed, Search & Filters

[← back to Part II index](./README.md)

Prefix: `FR-FEED-*`

---

## Scope

The Home Feed and its discovery affordances:

- Composition rules (which posts appear, in what order).
- Free-text search.
- Filter modal and persisted state across sessions.
- Sort options.
- Cold-start fallback (empty city → all-Israel).
- Guest preview behavior.

Non-goals (out of scope):

- Algorithmic personalization (explicitly excluded by `R-MVP-Profile-7`).
- "Friends-only" toggle (excluded by `R-MVP-Profile-8`).
- Post likes / comments / sharing (excluded — see `PRD_MVP/08_Out_of_Scope_and_Future.md`).

---

## FR-FEED-001 — Default feed composition

**Description.**
The Home Feed shows public posts that the viewer is allowed to see, sorted in reverse-chronological order.

**Source.**
- PRD: `03_Core_Features.md` §3.3.1.1, `05_Screen_UI_Mapping.md` §2.1.
- Constraints: `R-MVP-Profile-7`.

**Acceptance Criteria.**
- AC1. The query selects posts where:
   - `Post.status = open`, **and**
   - the viewer's visibility predicate from `FR-FOLLOW-012` permits read access. (`FR-MOD-009`'s bilateral-block filter is deferred per `EXEC-9`; the predicate still SELECTs from `is_blocked()`, which always returns `false` in MVP because `public.blocks` stays unpopulated, so the filter is a structural no-op.)
- AC2. Default ordering: `created_at DESC`.
- AC3. There is **no** algorithmic boost based on follow relationships, popularity, or category in MVP.
- AC4. Pagination: 20 posts per page; infinite scroll on mobile, "Load more" button on Web.

**Related.** Screens: 2.1 · Domain: `Post`, `FollowEdge`.

---

## FR-FEED-002 — Feed card composition

**Description.**
What each feed card displays.

**Source.**
- PRD: `03_Core_Features.md` §3.3.1.2, `05_Screen_UI_Mapping.md` §2.1.

**Acceptance Criteria.**
- AC1. Always shown: image OR category icon (for image-less Request posts), type badge `🎁`/`🔍`, title, 2-line truncated description with "Read more" affordance, owner row (avatar + name), location string per `Post.location_display_level`, relative timestamp.
- AC2. Conditional: `👥 Followers only` badge (when applicable to the viewer-owner pair), `🔒 Closed — delivered` badge (only when the user enabled "Include closed posts" filter).
- AC3. **Never shown in the feed**: posts at visibility `OnlyMe` (regardless of whether the viewer is the owner). Owner sees them in their profile only (`FR-PROFILE-001`).
- AC4. Quick "💬 Send Message" icon visible on cards owned by other users (`FR-POST-018`).

**Related.** Screens: 2.1.

---

## FR-FEED-003 — Free-text search — **DEPRECATED (P1.2)**

**Status.** ⚠️ Deprecated by P1.2 design decision (Q1, 2026-05-11). No search
bar is rendered on the Home Feed. Free-text post search lives on the
Universal Search tab (`FR-FEED-016` as superseded, see below) and continues
to satisfy the original acceptance criteria (multi-field match, debounce,
visibility-aware results) on that surface.

The Home Feed exposes only the filter/sort affordances of `FR-FEED-004` and
on those affordances the search query field is intentionally absent —
filtering and sorting are post-shape operations, not text matching.

**Original ACs** are preserved in `FR-FEED-016` (which now describes the
shipped Universal Search engine) as the authoritative location for the
text-matching contract.

---

## FR-FEED-004 — Filter modal — **REWORKED (P1.2)**

**Description.**
A bottom-sheet modal with combinable filters opened from an `options-outline`
icon in the TopBar. The icon is rendered only while the Home Feed tab is
active and disappears on tab switch. A red badge on the icon shows the count
of active filters when >0; the old in-feed "X filters active" chip
(`FR-FEED-013`) is removed.

**Source.**
- Design spec: `docs/SSOT/archive/superpowers/specs/2026-05-11-p1-2-feed-discovery-and-filters-design.md`.
- Decisions: P1.2 Q1–Q8 (2026-05-11).

**Acceptance Criteria.**
- AC1. Filter set:
   - **Sort**: `Newest first` (default) / `Oldest first` / `By proximity`. When
     `By proximity` is selected, a city picker resolves the center of the
     ranking; default is the viewer's registered city.
   - **Type**: `All` / `Givers only` / `Requesters only`.
   - **Category**: multi-select from the canonical 10 categories.
   - **Item condition**: multi-select; rendered only when `Type = Givers only`
     (`New` / `LikeNew` / `Good` / `Fair`).
   - **Location**: city picker + radius slider (`5 / 10 / 25 / 50 / 100` km).
     When set, the feed includes only posts whose city is within the radius
     of the chosen center city. Defaults to no spatial filter.
   - **Status**: 3-mode — `Open only` (default) / `Closed only` / `All`.
- AC2. Filters compose with AND semantics. Sort is independent of filters.
- AC3. "Apply" commits to the persisted store; "Clear all" resets and
   immediately commits the cleared state.
- AC4. The same filter vocabulary (post-shape) is available on the Universal
   Search tab via the shared design (`FR-FEED-018`). The Search tab keeps its
   additional dimensions (`resultType`, `donationCategory`, etc.) in its own
   state.

**Related.** Screens: 2.2 · `FR-FEED-013` (deprecated) · `FR-FEED-018`.

---

## FR-FEED-005 — Persisted filter state — **EXTENDED (P1.2)**

**Description.**
The user's current filters are persisted across sessions. Only filter state
persists — search text no longer applies to the Home Feed (`FR-FEED-003`
deprecated).

**Source.**
- PRD: `03_Core_Features.md` §3.3.1.3.
- Constraints: `R-MVP-Privacy-8`.

**Acceptance Criteria.**
- AC1. Filter state persists in local storage (AsyncStorage on native,
   localStorage on web) on every change, keyed per signed-in user.
- AC2. On launch, the feed restores the persisted state; the active-count
   badge on the TopBar filter icon reflects this state (the in-feed chip
   from the prior contract is removed — see `FR-FEED-013` deprecated).
- AC3. Tapping "Clear all" inside the filter sheet resets state and persists
   the cleared state.
- AC4. The persistence key includes a schema version; legacy v1 state from
   the old filter shape is dropped on first read and replaced by defaults.

**Related.** Domain: `FeedFilter` value object · `FR-FEED-004` ·
`FR-FEED-013` (deprecated).

---

## FR-FEED-006 — Sort: by proximity — **REWORKED (P1.2)**

**Description.**
The "By proximity" sort option ranks posts by great-circle distance between
the chosen center city and each post's city, in ascending order. This
replaces the prior string-equality-with-recency approach (which lumped
all non-viewer-city posts together by date).

**Source.**
- Design spec: `docs/SSOT/archive/superpowers/specs/2026-05-11-p1-2-feed-discovery-and-filters-design.md`.
- Decisions: P1.2 Q2, Q4 (2026-05-11) and `EXEC-8` in the C decisions log.

**Acceptance Criteria.**
- AC1. Posts are ranked by `distance_km` ascending (Haversine between the
   `cities.lat/lon` of the center city and the post's city centroid). Tie-
   break by `created_at DESC` so newer posts surface first within the same
   city.
- AC2. **Center city resolution**: if `FeedFilter.proximitySortCity` is set,
   that city is the ranking center. Otherwise the viewer's registered city
   (`User.city`) is used. If neither is set, sort silently falls back to
   `Newest first` (preserves the original AC3).
- AC3. The `cities_geo` lookup (`FR-FEED-019`) is the single source of truth
   for coordinates. Cities whose lat/lon is NULL produce a `NULL`
   `distance_km` and are placed at the tail of the result set.
- AC4. The distance value is propagated through `PostWithOwner.distanceKm`
   for UI display when relevant.
- AC5. The prior MVP prohibition on geocoding (legacy AC2) is **lifted**
   under this rework; `cities_geo` is a static, server-seeded lookup, not
   a runtime geocoding service.

**Related.** Domain: `User.city`, `Post.city`, `cities_geo`, `haversine_km`.

---

## FR-FEED-007 — Cold-start fallback — **DEPRECATED (P1.2)**

**Status.** ⚠️ Deprecated by P1.2 design decision (2026-05-11).

**Rationale.** The reworked proximity sort (`FR-FEED-006`) already surfaces
the nearest available posts and continues seamlessly into farther cities
when local supply is thin. A dedicated fallback banner with a sticky chip
introduced UI complexity without observable user value, and inline
mid-feed banners were rejected as a UX anti-pattern in the brainstorming
phase.

If supply imbalances later prove to confuse users, a softer treatment can
be reintroduced as a separate FR; until then, the proximity sort fully
covers the original goal.

---

## FR-FEED-008 — Empty feed (warm) — **EXTENDED (P1.2)**

**Description.**
When the feed query returns zero posts after applying all filters, a warm
empty state is shown with adaptive copy and CTAs.

**Source.**
- Decisions: `D-15`.
- P1.2 design (2026-05-11).

**Acceptance Criteria.**
- AC1. Copy depends on whether filters are active:
   - *Filters active*: "אין פוסטים שתואמים לפילטרים שלך — נסה לנקות את
     הפילטרים או להיות הראשון לשתף."
   - *No filters*: "אין עדיין פוסטים בקהילה — תהיה הראשון לשתף משהו."
- AC2. CTAs adapt:
   - "נקה פילטרים" rendered only when at least one filter is active
     (`FilterState.activeCount > 0`); triggers `FR-FEED-005`'s clear-all.
   - "שתף פוסט" always rendered; opens `/post/create` (`FR-POST-001`).
- AC3. The empty state additionally surfaces the community counter
   (`FR-FEED-014`) as "{N} פוסטים פעילים בקהילה כרגע" when N > 0 — a soft
   reminder that the lack of results is filter-driven rather than empty
   supply.
- AC4. The empty state is fully accessible (label, focusable buttons) per
   `NFR-A11Y-002`.

**Related.** Domain: `FilterState` (local), `FR-FEED-005`, `FR-FEED-014`.

---

## FR-FEED-009 — Realtime feed freshness

**Description.**
A new public post created elsewhere appears in the feed without manual refresh, within the freshness budget.

**Source.**
- PRD: (implied; UX expectation for an active community).

**Acceptance Criteria.**
- AC1. New posts visible to the viewer surface within `NFR-PERF-005` (≤2s end-to-end at p95).
- AC2. The newly arrived post(s) are not silently injected into the user's scroll position; instead, a "↑ N new posts" banner appears at the top until the user taps it or scrolls to the top.
- AC3. The realtime channel disconnects when the screen is backgrounded for >60 seconds and reconnects on foreground; on reconnect, a single REST query reconciles missed posts.

**Related.** Domain: `Feed`, `RealtimeChannel`.

---

## FR-FEED-010 — Pull-to-refresh (mobile) and refresh button (Web)

**Description.**
Manual refresh affordances coexist with realtime updates.

**Source.**
- PRD: (UX baseline for mobile).

**Acceptance Criteria.**
- AC1. Mobile: standard pull-to-refresh gesture re-queries the feed.
- AC2. Web: a refresh button is provided next to the search bar; keyboard shortcut `R` (configurable in `06_cross_cutting/03_i18n_rtl.md`) triggers it.
- AC3. Refresh resets the pagination cursor to the top.

**Related.** Domain: `Feed`.

---

## FR-FEED-011 — Search & filters within other contexts

**Description.**
The Followers / Following lists (`FR-PROFILE-009`) and the Inbox (`FR-CHAT-001`) carry their own search bars; they are scoped and do **not** share state with the feed.

**Source.**
- PRD: `05_Screen_UI_Mapping.md` §3.4, §4.1.

**Acceptance Criteria.**
- AC1. Each list's search is isolated.
- AC2. There is no global search in MVP.

---

## FR-FEED-012 — Guest feed preview

**Description.**
The guest feed (1.7) is a constrained sub-set of the public feed.

**Source.**
- PRD: `03_Core_Features.md` §3.3.1.4.
- Constraints: `R-MVP-Core-2`.

**Acceptance Criteria.**
- AC1. Returns the 3 most recent **`Public`-visibility** posts across all of Israel.
- AC2. Quick-message, profile navigation, post detail, and filters are all blocked; tap targets surface the sign-up overlay (`FR-AUTH-014`).
- AC3. Realtime updates are disabled for guests; a guest sees a static snapshot until they sign up.

**Related.** Screens: 1.7.

---

## FR-FEED-013 — Active-filters chip — **DEPRECATED (P1.2)**

**Status.** ⚠️ Deprecated by P1.2 design decision (Q7, 2026-05-11).

**Rationale.** The same affordance now lives as a red count badge on the
TopBar filter icon (`FR-FEED-004`). Surfacing it in two places at once was
redundant and crowded the feed. The user discovers active filters through
the badge; the filter sheet itself displays which fields are set when
opened.

The original AC contract is preserved in the TopBar badge:
- visibility: shown when `activeCount > 0` (AC1 equivalent)
- discoverability: tapping opens the filter sheet (AC2 equivalent)
- count: rendered numerically up to 9, then `9+` (AC3 equivalent;
  "Clear all" moves inside the sheet header).

---

## FR-FEED-014 — Active-community counter — **EXTENDED (P1.2)**

**Description.**
A live "{N} פוסטים פעילים בקהילה" counter that surfaces in three places:
the guest banner (replacing the prior hardcoded "50+" string), the warm
empty state of the signed-in feed, and any future onboarding/marketing
surface that wants to highlight community activity.

**Source.**
- PRD: `03_Core_Features.md` §3.3.1.4.
- P1.2 design (2026-05-11).

**Acceptance Criteria.**
- AC1. Counter is computed as the number of `open` `Public`-visibility posts
   system-wide, sourced from the `community_stats` view in migration 0006.
- AC2. Client-side, the counter is fetched on mount of any consuming
   component and refreshed every 60 seconds via TanStack Query's
   `refetchInterval`.
- AC3. The number is displayed only as a non-negative integer (the use case
   `GetActivePostsCountUseCase` clamps to `Math.max(0, trunc(value))`).
- AC4. Edge-cached endpoint (originally specified) is deferred to P2.x; the
   direct view read is sufficient for MVP traffic. A TD is opened for the
   edge layer when scale demands it.

**Related.** Domain: `CommunityStats` · `community_stats` view · use case
`GetActivePostsCountUseCase`.

---

## FR-FEED-016 — Universal Search tab — **SUPERSEDED (P1.2)**

**Description.**
The dedicated Search tab (`🔍`) in the bottom bar mounts a Universal Search
screen that performs free-text matching across three result domains
simultaneously: posts, users, and donation links. This supersedes the
placeholder-only contract of the prior FR (the engine was originally
deferred to `FR-FEED-017+`; it shipped earlier than planned and now lives
under this FR ID).

**Source.**
- Earlier design: `docs/SSOT/archive/superpowers/specs/2026-05-09-donations-and-search-tabs-design.md`.
- Decisions: `D-16`, and P1.2 Q1 (2026-05-11) which retroactively documents
  the shipped engine.

**Acceptance Criteria.**
- AC1. The Search tab mounts at `/(tabs)/search`.
- AC2. A single text input runs the search across **posts**, **users**, and
   **donation links** with a 300 ms debounce; queries shorter than 2
   characters do not execute (a coaching empty state is rendered).
- AC3. Result sections are independently expandable from a 5-result preview
   to a 50-result list.
- AC4. The search remains visibility-aware: it respects the same
   `is_post_visible_to` predicate as the Home Feed. (User-blocking is
   deferred per `EXEC-9`; the predicate still references `is_blocked()` but
   that always returns `false` in MVP.)
- AC5. Recent searches are persisted to local storage (up to 10 entries) and
   are clearable from the UI.
- AC6. The Universal Search tab carries its own filter sheet that exposes,
   in addition to its own dimensions (`resultType`, `donationCategory`,
   `minFollowers`, `sortBy`), the same **post-shape** filter dimensions
   surfaced on the Home Feed (`FR-FEED-018`). The two state stores remain
   distinct but the filter vocabulary is shared.
- AC7. The screen is fully accessible per `NFR-A11Y-002`.

**Related.** Screens: 2.5 · `FR-FEED-004`, `FR-FEED-018`.

---

## FR-FEED-015 — First-post nudge card — **REWORKED (P1.2)**

**Description.**
A dismissible card at the top of the Home Feed prompts users who have not
yet created a post. The card exposes three actions with distinct lifecycles
so it can drive action without alienating users who aren't ready.

**Source.**
- Decisions: `D-9`.
- P1.2 design (2026-05-11), Q6.

**Acceptance Criteria.**
- AC1. Eligibility: the card renders when **all** of the following hold:
   - viewer is signed in,
   - `User.firstPostNudgeDismissed === false` (DB flag),
   - the session-level `firstPostNudgeDismissedThisSession` flag is false,
   - the viewer has zero open posts (`IPostRepository.countOpenByUser`).
- AC2. Copy: *"יש לך מוצר לתת? או משהו לבקש? שתף את הפוסט הראשון שלך עכשיו."*
- AC3. Three actions, in visual priority order:
   - **Primary CTA — "שתף מוצר"**: navigates to `/post/create`. Creating a
     first post implicitly hides the card via AC1's `countOpenByUser`
     check.
   - **Secondary — "תזכיר לי אחר כך"**: sets the in-memory
     `firstPostNudgeDismissedThisSession` flag. The card disappears for
     this session and returns on the next cold start.
   - **Tertiary link — "אל תציג לי שוב"**: invokes
     `DismissFirstPostNudgeUseCase` which sets
     `users.first_post_nudge_dismissed = true`. The card never appears
     again for this user.
- AC4. Accessibility: each action is a focusable button with an explicit
   accessible label.

**Related.** Domain: `User.firstPostNudgeDismissed` · use case
`DismissFirstPostNudgeUseCase` · `IPostRepository.countOpenByUser`.

---

## FR-FEED-018 — Shared post-filter vocabulary — **NEW (P1.2)**

**Description.**
The Home Feed and the Universal Search tab share a common vocabulary of
post-shape filter dimensions so users move between the two surfaces with
predictable controls.

**Source.**
- Design spec: `docs/SSOT/archive/superpowers/specs/2026-05-11-p1-2-feed-discovery-and-filters-design.md`.

**Acceptance Criteria.**
- AC1. Shared dimensions: `type`, `categories[]`, `itemConditions[]`,
   `locationFilter {centerCity, radiusKm}`, `statusFilter` (3-mode),
   `sortOrder` (newest/oldest/distance), `proximitySortCity`.
- AC2. Implementation: each surface owns its own state store (Home Feed →
   `filterStore`; Search tab → `searchStore`) but the field names, value
   sets, and UI primitives are identical.
- AC3. The Universal Search tab additionally exposes search-only fields
   (`resultType`, `donationCategory`, `minFollowers`, search-mode
   `sortBy`). Those do not propagate to the Home Feed.

**Related.** `FR-FEED-004` · `FR-FEED-016`.

---

## FR-FEED-019 — Cities-geo lookup — **NEW (P1.2)**

**Description.**
A static reference table holding latitude / longitude for every canonical
Israeli city in `public.cities`, plus a pure-SQL `haversine_km` helper. This
is the single source of truth for any distance computation in the system.

**Source.**
- Design spec: `docs/SSOT/archive/superpowers/specs/2026-05-11-p1-2-feed-discovery-and-filters-design.md`.
- Migration: `supabase/migrations/0021_cities_geo.sql`.

**Acceptance Criteria.**
- AC1. `public.cities` is extended with nullable `lat double precision` and
   `lon double precision` columns (sanity-bounded for Israel: lat ∈ [29.0,
   34.0], lon ∈ [34.0, 36.5]).
- AC2. The 20 canonical settlements seeded in migration 0001 are populated
   with coordinates in migration 0021.
- AC3. A pure-SQL function `public.haversine_km(lat1, lon1, lat2, lon2)`
   returns great-circle distance in kilometres; it is `immutable` and
   `parallel safe`. Returns `NULL` when any input is `NULL`.
- AC4. The companion `public.feed_ranked_ids` RPC (migration 0022) consumes
   this lookup to deliver `FR-FEED-006`'s ranking and the radius branch of
   `FR-FEED-004`'s location filter.
- AC5. Adding new cities in the future requires also populating lat/lon
   alongside the row; otherwise the post inherits a `NULL distance_km`
   and degrades to the tail of distance-sorted feeds.

**Related.** `FR-FEED-006`, `FR-FEED-004`.

---

## Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 0.1 | 2026-05-05 | Initial draft from PRD §3.3.1–§3.3.2 and Decisions D-8, D-9, D-15. |
| 0.2 | 2026-05-09 | Added `FR-FEED-016` (Search hub placeholder) per `D-16`. |
| 0.3 | 2026-05-11 | P1.2 sweep: deprecated `FR-FEED-003, 007, 013`; reworked `FR-FEED-004, 006, 015`; extended `FR-FEED-005, 008, 014`; superseded `FR-FEED-016` (now Universal Search engine); added `FR-FEED-018` (shared filter vocabulary) and `FR-FEED-019` (cities-geo lookup). |
