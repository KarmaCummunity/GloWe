# GloWe unified home feed — design

**Date:** 2026-07-27  
**Status:** Approved (PM 2026-07-27) — implementation plan next  
**Mapped to:** FR-GLOWE-016 AC2 (supersedes capped posts+opportunities highlight strip)  
**Related:** FR-GLOWE-006 (wishes), FR-GLOWE-007 (opportunities/events), FR-GLOWE-008 (community posts), FR-GLOWE-009 (forums), FR-GLOWE-016 AC7 (volunteer offers as `post_type='offer'`), FR-GLOWE-023 (guest peek)

## Problem

Signed-in home (“What is happening on GloWe”) currently:

1. Mixes only **community posts** and **opportunities**, with **two different card chrome**s.
2. On desktop, **caps at 6 items** and pushes users to “See all” → Community.
3. Omits wishes, volunteer offers, events-as-opportunities, and forum content from the home surface.
4. Desktop still shows personal hero + “Your activity”, while phone already shows community-only — inconsistent with the PM goal that Home = community discovery.

## Goals

- One **unified card shell**; type differences via **badge/tag only**.
- Home shows a **smart mixed feed** of the main activity types (not org directory profiles).
- **Progressive loading** that feels smooth (not dump-everything, not a dead “See all” gate).
- Guests get a **short peek** + join CTA (FR-GLOWE-023).
- Members get **feed-only home** on all viewports (no hero / no “Your activity” on Home).

## Non-goals

- Organization **profile cards** in the home feed (stay on Organizations directory).
- Server-side ranked feed RPC in the first ship (documented as Phase 2).
- Replacing dedicated pages (Community, Opportunities, Wishing Well, Forums) — Home is a discovery surface; deep work stays on those pages.
- Changing UGC translation (“Show original”) behavior beyond fitting the unified card slot.

## Product decisions (PM 2026-07-27)

| Topic | Decision |
| ----- | -------- |
| Card chrome | Unified shell; different **tag** per type |
| Content mix | Posts, opportunities (incl. events), wishes, volunteer offers, **forum groups**, **forum threads** |
| Org profiles | **Out** of home feed |
| Ranking | Recency + comments + saves (simple hot score) **and** type diversity |
| Loading | Progressive: **10** first, then **+8**; prefetch near end of list |
| Member home chrome | **Feed only** (desktop = same as phone; drop hero + Your activity + See all) |
| Guest home | Short preview (~**10** items) + registration/join CTA; marketing shell may remain around/above as today unless implementation drops redundant marketing blocks for clarity |
| Architecture | **Hybrid:** client merge/rank/page for MVP; server RPC later if volume requires it |

## Content types & tags

| Kind | Source | Tag (EN key → i18n) | Primary href |
| ---- | ------ | ------------------- | ------------ |
| `post` | `glowe_posts` `post_type='community'` | Post · {category} | Community `#post-…` / community page |
| `opportunity` | `glowe_opportunities` without event date (or non-event) | Opportunity | `opportunity.html?id=` |
| `event` | `glowe_opportunities` with `start_at` (D-66) | Event | same opportunity detail |
| `wish` | `glowe_posts` `post_type='wish'` open | Wish / Need | Wishing Well detail/modal |
| `volunteer_offer` | `glowe_posts` `post_type='offer'` | Volunteer offer | Wishing Well / post target |
| `forum_group` | `glowe_forum_groups` | Forum | `discussion-group.html?group=` |
| `forum_thread` | `glowe_forum_threads` | Discussion | thread surface on discussion-group / forums |

Removed from scope: organization profile teasers.

## Ranking (MVP client formula)

Normalize each item to `{ kind, id, createdAt, commentCount, saveCount, … }`.

**Hot score (illustrative weights — tune in implementation, keep pure + unit-tested):**

```
score = recencyScore(createdAt) + wC * log1p(commentCount) + wS * log1p(saveCount)
```

- `recencyScore`: decay over ~48–72h so “new” gets a clear boost (PM: recency is part of “hot”).
- Missing signals (e.g. forum group with no comments): treat as `0` for that term; still eligible via recency.
- Saves: use whatever the client already can resolve from `glowe_saved_items` aggregates or per-item counts if available; if a kind has no save path yet, `saveCount = 0` (do not block inclusion).

**Diversity pass:** after sorting by `score` desc, emit a sequence that avoids **≥3 consecutive items of the same `kind`** when alternatives exist in the remaining pool (simple greedy pick).

## Progressive loading

| Audience | First paint | Next pages | End of list |
| -------- | ----------- | ---------- | ----------- |
| Member | 10 items | +8 on near-end scroll (≈2–3 cards from bottom) | Quiet “You’re caught up” / no false “See all” to Community |
| Guest | 10 items max | No further pages | Join CTA (Continue with Google / contextual join) |

Remove the desktop **“See all”** button that currently gates a 6-item strip.

## Unified card chrome

Reuse the spirit of `GloweUiConventions.directoryCardHtml` / compact member-feed card, single template:

1. Optional entity mark (author/org avatar initials) when available — **same slot for all kinds** (empty/hidden if none).
2. Type **tag** (required).
3. Title + short snippet (~140 chars).
4. Secondary line: author/org/group name as available.
5. Translation toggle slot when UGC markers apply.
6. Whole-card primary navigation via stretched link (kind-specific href).

No separate “opportunity header vs post footer” layouts.

## Member vs guest home layout

**Member (all breakpoints):**

- `#member-home` shows **only** the unified feed section (title e.g. “What is happening on GloWe”).
- No Welcome hero, no “Your activity”, no “See all”.
- Personal create / activity remain reachable via **Create (+)** and **Profile / Personal Area** (existing FR-GLOWE-016 surfaces).

**Guest:**

- Keep guest marketing as the outer shell (FR-GLOWE-023 peek).
- Embed or append a **preview strip** of the same unified feed (10 items, ranked/diversity same rules).
- CTA to join; write actions stay gated.

## Architecture

### Phase 1 — Client (ship)

1. Pure module (e.g. `glowe-home-feed.js`): map sources → feed items, score, diversify, slice pages — **unit-tested**.
2. `initMemberHome` / guest home init: fetch existing catalogs already used elsewhere (`listAll` posts, opportunities, forum groups/threads, offers/wishes via existing loaders), build ranked list once, render page 1, attach infinite-scroll observer.
3. CSS: one `.home-feed-card` (or evolve `.member-feed-card`) shell; kill opportunity-specific header-only layout on Home.
4. Spec update: FR-GLOWE-016 AC2 rewritten to match this design; decision note optional in `DECISIONS.md` if we want a durable D-* for “Home = unified discovery feed”.

### Phase 2 — Server (later)

- `SECURITY DEFINER` RPC (or view) returning ranked page keys + scores for scale, RLS-safe.
- Client keeps the same card renderer; swap data source.

## Spec impact

**Supersedes** current FR-GLOWE-016 AC2 language:

- “capped” posts+opportunities highlight + desktop personal hero/activity on Home.
- Phone-only community-only exception becomes the **default for all viewports** (feed-only).

Does **not** remove Personal Area; it removes Home duplication of personal rails.

## Risks & mitigations

| Risk | Mitigation |
| ---- | ---------- |
| First paint slow if fetching every catalog | Parallel `Promise.all`; show skeleton; page only first 10 into DOM |
| Sparse engagement signals | Recency-dominant weights; diversity still runs |
| Forum groups feel “static” next to posts | Cap how often `forum_group` appears in diversity (e.g. at most 1 per 10) if needed after QA |
| Guest marketing + feed feels crowded | Preview below fold or replace a redundant marketing block — PM visual pass |

## Acceptance criteria (implementation checklist)

1. Member Home (desktop + phone): unified feed only; no sticky personal rails; no “See all” cap.
2. Feed includes: community posts, opportunities, events, open wishes, volunteer offers, forum groups, forum threads — **not** org profiles.
3. Cards share one chrome; kinds differ by tag (+ available identity line).
4. Ordering uses hot(score) + diversity; helpers unit-tested.
5. Progressive load 10 then +8 with near-end prefetch; guest stops at 10 + join CTA.
6. FR-GLOWE-016 AC2 + Hebrew/other locale keys for new tags/empty/caught-up strings updated in the same change-set.
7. App PATCH version bump when PR’d to `dev`.

## Open polish (non-blocking)

- Exact EN/HE tag strings for Wish vs Need.
- Whether guest preview replaces or sits under the current marketing “community teaser” block.
- Fine-tuning of `wC` / `wS` / decay half-life after first real-data QA.
