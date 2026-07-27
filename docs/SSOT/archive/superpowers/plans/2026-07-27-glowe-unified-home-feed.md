# GloWe Unified Home Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the capped posts+opportunities member-home strip with a unified, hot+diversity-ranked discovery feed (progressive 10/+8), feed-only member home on all viewports, and a 10-item guest peek + join CTA — no org profiles.

**Architecture:** Pure DOM-free `glowe-home-feed.js` normalizes mixed sources → scores → diversifies → pages. `app.js` fetches existing catalogs in parallel, renders one card chrome, attaches IntersectionObserver for load-more. Phase-2 server RPC is out of this plan (documented in design only).

**Tech Stack:** GloWe vanilla JS (`app/apps/glowe-web`), existing Supabase `listAll` loaders, Vitest (`pnpm --filter @kc/glowe-web test`).

**Design:** `docs/SSOT/archive/superpowers/specs/2026-07-27-glowe-unified-home-feed-design.md`

## Global Constraints

- Branch from latest `origin/dev`: `feat/FR-GLOWE-016-unified-home-feed`.
- No new DB migrations or RPCs in this PR.
- Pure modules: IIFE + `module.exports` / `window.GloweHomeFeed`, DOM-free.
- File size ≤300 lines per file — split helpers if needed.
- UI strings: English source keys + all four locales (`he`/`ru`/`ar`/`am`) in `GLOWE_TRANSLATIONS`.
- Org profile cards must **not** appear in the feed.
- Pre-push from `app/`: `pnpm typecheck && pnpm test && pnpm lint`.
- PR targets `dev`; bump PATCH `1.1.3` → `1.1.4` in `app/VERSION` + `glowe-version.js`.
- Mapped to: FR-GLOWE-016 AC2 (rewrite); related FR-GLOWE-006/007/008/009/023.

## File map

| File | Role |
|------|------|
| `app/apps/glowe-web/js/glowe-home-feed.js` | **Create** — normalize, score, diversify, pageSlice, tagKey, href helpers |
| `app/apps/glowe-web/js/__tests__/glowe-home-feed.test.js` | **Create** — unit tests |
| `app/apps/glowe-web/js/app.js` | **Modify** — replace `selectCommunityHighlights` / `renderMemberHomeMarkup` / `initMemberHome`; guest preview; card renderer; i18n keys |
| `app/apps/glowe-web/index.html` | **Modify** — script include `glowe-home-feed.js`; optional `#guest-home-feed` mount |
| `app/apps/glowe-web/css/styles.css` | **Modify** — unified `.home-feed-card` (evolve/replace split member-feed opportunity chrome on home) |
| `docs/SSOT/spec/17_glowe_frontend.md` | FR-GLOWE-016 AC2 rewrite |
| `docs/SSOT/DECISIONS.md` | D-* Home = unified discovery feed |
| `docs/SSOT/BACKLOG.md` | Add/flip GLOWE row for this slice |
| `app/VERSION` + `glowe-version.js` | 1.1.4 |

---

### Task 1: Pure feed pipeline (TDD)

**Files:**
- Create: `app/apps/glowe-web/js/glowe-home-feed.js`
- Create: `app/apps/glowe-web/js/__tests__/glowe-home-feed.test.js`

**Interfaces:**
- Produces:
  - `KINDS` — `post | opportunity | event | wish | volunteer_offer | forum_group | forum_thread`
  - `PAGE_SIZE_FIRST = 10`, `PAGE_SIZE_NEXT = 8`, `GUEST_PREVIEW_LIMIT = 10`
  - `normalizeFeedSources(sources) → FeedItem[]`  
    `sources = { posts, opportunities, wishes, offers, forumGroups, forumThreads, commentsByPostId, saveCountsByKey }`  
    Each `FeedItem`: `{ kind, id, title, snippet, createdAt, authorLabel, commentCount, saveCount, hrefPath, tagKey, category }`
  - `recencyScore(createdAt, nowMs) → number` (decay ~60h half-life style; 0 if missing)
  - `hotScore(item, nowMs, weights?) → number` — `recency + wC*log1p(comments) + wS*log1p(saves)` defaults `wC=2`, `wS=1.5`
  - `rankFeed(items, nowMs) → FeedItem[]` sorted by hotScore desc (stable id tie-break)
  - `diversifyFeed(ranked, { maxRun = 2, maxForumGroupPerWindow = 1, window = 10 }) → FeedItem[]` — no more than `maxRun` consecutive same `kind`; at most one `forum_group` per `window` when alternatives exist
  - `pageSlice(items, offset, limit) → { items, nextOffset, done }`
  - `buildHomeFeed(sources, opts) → FeedItem[]` — normalize → rank → diversify (full ordered list; paging is separate)
  - `feedItemKey(item) → string` — `${kind}:${id}`
  - `defaultHref(kind, id, extra?) → string` (root-relative for home page)

**Notes for normalize:**
- `post`: community posts only (caller passes already-filtered list or filter `post_type`).
- `opportunity` vs `event`: use `GloweEvents.isEvent` **injected** as `sources.isEvent(opp)` so the pure module stays free of other globals (pass function in sources).
- `wish`: open wishes only (caller filters via `GloweWishes.isOpenWish` before pass, or pass flag).
- `volunteer_offer`: open offers (`GloweCreate.isOpenOffer` filtered by caller).
- `forum_group` / `forum_thread`: map from GloweForums shapes; `commentCount` for threads = `replies` or 0.
- Missing save/comment signals → `0` (do not drop item).
- Snippet: first 140 chars of text/description/body.
- **Never** accept org profiles in sources.

- [ ] **Step 1: Write failing tests**

```javascript
import { describe, it, expect } from 'vitest';
import GloweHomeFeed from '../glowe-home-feed.js';

const NOW = Date.parse('2026-07-27T12:00:00Z');

function item(partial) {
  return {
    kind: 'post',
    id: '1',
    title: 'T',
    snippet: 'S',
    createdAt: '2026-07-27T11:00:00Z',
    authorLabel: 'A',
    commentCount: 0,
    saveCount: 0,
    hrefPath: 'pages/community.html',
    tagKey: 'Post',
    category: '',
    ...partial
  };
}

describe('hotScore', () => {
  it('ranks newer higher when engagement equal', () => {
    const newer = item({ id: 'n', createdAt: '2026-07-27T11:00:00Z' });
    const older = item({ id: 'o', createdAt: '2026-07-20T11:00:00Z' });
    expect(GloweHomeFeed.hotScore(newer, NOW)).toBeGreaterThan(GloweHomeFeed.hotScore(older, NOW));
  });

  it('boosts comments and saves', () => {
    const plain = item({ id: 'a' });
    const hot = item({ id: 'b', commentCount: 10, saveCount: 5 });
    expect(GloweHomeFeed.hotScore(hot, NOW)).toBeGreaterThan(GloweHomeFeed.hotScore(plain, NOW));
  });
});

describe('diversifyFeed', () => {
  it('breaks runs of the same kind when alternatives exist', () => {
    const ranked = [
      item({ id: 'p1', kind: 'post' }),
      item({ id: 'p2', kind: 'post' }),
      item({ id: 'p3', kind: 'post' }),
      item({ id: 'o1', kind: 'opportunity' })
    ];
    const out = GloweHomeFeed.diversifyFeed(ranked, { maxRun: 2 });
    expect(out.slice(0, 3).map((x) => x.kind)).toEqual(['post', 'post', 'opportunity']);
  });

  it('caps forum_group density', () => {
    const ranked = [
      item({ id: 'g1', kind: 'forum_group' }),
      item({ id: 'g2', kind: 'forum_group' }),
      item({ id: 'p1', kind: 'post' })
    ];
    const out = GloweHomeFeed.diversifyFeed(ranked, { maxForumGroupPerWindow: 1, window: 10 });
    expect(out.filter((x) => x.kind === 'forum_group').length).toBe(1);
    expect(out.some((x) => x.id === 'p1')).toBe(true);
  });
});

describe('pageSlice', () => {
  it('pages 10 then 8', () => {
    const items = Array.from({ length: 25 }, (_, i) => item({ id: String(i) }));
    const first = GloweHomeFeed.pageSlice(items, 0, GloweHomeFeed.PAGE_SIZE_FIRST);
    expect(first.items).toHaveLength(10);
    expect(first.nextOffset).toBe(10);
    expect(first.done).toBe(false);
    const second = GloweHomeFeed.pageSlice(items, first.nextOffset, GloweHomeFeed.PAGE_SIZE_NEXT);
    expect(second.items).toHaveLength(8);
    expect(second.nextOffset).toBe(18);
  });
});

describe('normalizeFeedSources', () => {
  it('splits opportunities into opportunity vs event via isEvent', () => {
    const out = GloweHomeFeed.normalizeFeedSources({
      posts: [],
      opportunities: [
        { id: 'e1', title: 'Meetup', description: 'd', startAt: '2026-08-01', organization: 'Org', createdAt: '2026-07-26' },
        { id: 'o1', title: 'Mentor', description: 'd', organization: 'Org', createdAt: '2026-07-26' }
      ],
      wishes: [],
      offers: [],
      forumGroups: [],
      forumThreads: [],
      commentsByPostId: {},
      saveCountsByKey: {},
      isEvent: (opp) => Boolean(opp && (opp.startAt || opp.start_at))
    });
    expect(out.map((x) => x.kind).sort()).toEqual(['event', 'opportunity']);
  });

  it('attaches comment counts for posts', () => {
    const out = GloweHomeFeed.normalizeFeedSources({
      posts: [{ id: 'p1', title: 'Hi', text: 'body', authorName: 'Sam', createdAt: '2026-07-26', category: 'Knowledge Share' }],
      opportunities: [],
      wishes: [],
      offers: [],
      forumGroups: [],
      forumThreads: [],
      commentsByPostId: { p1: [{}, {}, {}] },
      saveCountsByKey: { 'post:p1': 2 },
      isEvent: () => false
    });
    expect(out[0].commentCount).toBe(3);
    expect(out[0].saveCount).toBe(2);
    expect(out[0].kind).toBe('post');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd app && pnpm --filter @kc/glowe-web test -- glowe-home-feed.test.js
```

Expected: module not found / FAIL.

- [ ] **Step 3: Implement `glowe-home-feed.js`**

IIFE pattern matching `glowe-posts.js`. Keep ≤300 lines; if over, move `diversifyFeed` to `glowe-home-feed-diversify.js` (same IIFE export merged onto `GloweHomeFeed`).

Implement all interfaces above. `log1p(n) = Math.log(1 + Math.max(0, Number(n) || 0))`.

`defaultHref` examples (root-relative from `index.html`):
- post → `pages/community.html#post-${id}`
- opportunity/event → `pages/opportunity.html?id=${encodeURIComponent(id)}`
- wish / volunteer_offer → `pages/wishing-well.html` (detail deep-link if existing hash/query exists; else board)
- forum_group → `pages/discussion-group.html?group=${id}`
- forum_thread → `pages/discussion-group.html?group=${groupId}` (include `groupId` on item from normalize)

`tagKey` English dictionary keys (translated later via `gloweText`):
- post → use category via caller for display; store `tagKey: 'Post'` + `category`
- opportunity → `'Opportunity'`
- event → `'Event'`
- wish → `'Wish'`
- volunteer_offer → `'Volunteer Offer'`
- forum_group → `'Forum'`
- forum_thread → `'Discussion'`

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd app && pnpm --filter @kc/glowe-web test -- glowe-home-feed.test.js
```

- [ ] **Step 5: Commit**

```bash
git add app/apps/glowe-web/js/glowe-home-feed.js app/apps/glowe-web/js/__tests__/glowe-home-feed.test.js
git commit -m "$(cat <<'EOF'
feat(glowe): add pure unified home-feed rank/page helpers

FR-GLOWE-016 AC2 — hot score + diversity + paging for discovery feed.
EOF
)"
```

---

### Task 2: Unified card HTML + CSS

**Files:**
- Modify: `app/apps/glowe-web/js/app.js` (add `renderHomeFeedCard`, remove split opportunity header layout from home path)
- Modify: `app/apps/glowe-web/css/styles.css` (`.home-feed-card` styles; keep `.member-feed-grid`)
- Modify: `app/apps/glowe-web/index.html` (script tag before `app.js`)

**Interfaces:**
- Consumes: `GloweHomeFeed` FeedItem
- Produces: `renderHomeFeedCard(item) → string` — single chrome for all kinds

- [ ] **Step 1: Add script include** in `index.html` after `glowe-forums.js`:

```html
<script src="js/glowe-home-feed.js"></script>
```

- [ ] **Step 2: Implement `renderHomeFeedCard` in `app.js`**

```javascript
function renderHomeFeedCard(item) {
    const HF = window.GloweHomeFeed;
    const kind = item.kind || 'post';
    const id = item.id || '';
    const href = item.hrefPath || (HF ? HF.defaultHref(kind, id, item) : '#');
    const tag = kind === 'post'
        ? glowePostTypeLabel(item.category || '', ' · ')
        : gloweText(item.tagKey || 'Post');
    const title = escapeHtml(item.title || 'GloWe');
    const snippet = escapeHtml(item.snippet || '');
    const author = escapeHtml(item.authorLabel || '');
    const trType = kind === 'opportunity' || kind === 'event' ? 'glowe_opportunity'
        : kind === 'forum_thread' || kind === 'forum_group' ? 'glowe_forum_thread'
        : 'glowe_post';
    return `
      <article class="home-feed-card member-feed-card" data-tr-card data-tr-type="${trType}" data-tr-id="${escapeHtml(String(id))}" data-feed-kind="${escapeHtml(kind)}">
        ${typeof translationToggleSlotHtml === 'function' ? translationToggleSlotHtml() : ''}
        <a class="member-feed-card-link" href="${href}">
          <span class="member-feed-type">${escapeHtml(tag)}</span>
          <h3 data-tr-field="title">${title}</h3>
          <p data-tr-field="${kind === 'opportunity' || kind === 'event' ? 'description' : 'text'}">${snippet}</p>
          ${author ? `<span class="member-feed-author">${author}</span>` : ''}
        </a>
      </article>`;
}
```

Remove use of `renderMemberFeedOpportunity` / dual chrome from home path (functions may remain unused until deleted in same PR if nothing else calls them — delete if only home used them).

- [ ] **Step 3: CSS** — ensure `.home-feed-card` / `.member-feed-card` share one layout; delete or unused `.member-feed-opportunity-header` rules if no longer referenced.

- [ ] **Step 4: Manual smoke** — open home logged-in after Task 3; for this task alone, optional temporary call in console.

- [ ] **Step 5: Commit**

```bash
git add app/apps/glowe-web/js/app.js app/apps/glowe-web/css/styles.css app/apps/glowe-web/index.html
git commit -m "$(cat <<'EOF'
feat(glowe): unify home feed card chrome

Same shell for all discovery kinds; tag differs by type.
EOF
)"
```

---

### Task 3: Member home — feed only + progressive load

**Files:**
- Modify: `app/apps/glowe-web/js/app.js` — `initMemberHome`, `renderMemberHomeMarkup`, drop hero/activity/See all; wire observer

**Interfaces:**
- Consumes: `GloweHomeFeed.buildHomeFeed`, `pageSlice`, `renderHomeFeedCard`
- Produces: member `#member-home` = toolbar title + grid + sentinel; state on `root._homeFeed = { items, offset }`

- [ ] **Step 1: Replace markup helper**

```javascript
function renderMemberHomeMarkup(feedHtml) {
    return `
      <div class="container member-home-inner member-home-community-only">
        <section class="member-section member-home-community">
          <div class="section-toolbar">
            <div><h2>What is happening on GloWe</h2></div>
          </div>
          <div class="member-feed-grid" id="home-feed-grid">${feedHtml}</div>
          <div id="home-feed-sentinel" class="home-feed-sentinel" aria-hidden="true"></div>
          <p id="home-feed-end" class="muted-note home-feed-end" hidden>You're caught up</p>
        </section>
      </div>`;
}
```

Delete `communityOnly` / personal sections / See all link.

- [ ] **Step 2: Rewrite `initMemberHome`**

Parallel fetch (reuse existing loaders):
- opportunities via existing `fetchAndPopulate` / `getAllOpportunitiesForDisplay`
- `loadCommunityPosts()` + `loadPostComments()` → `GlowePosts.groupCommentsByPost`
- open wishes: from posts list filter `GloweWishes.isOpenWish` **or** dedicated list if already loaded
- offers: filter posts / create helper `GloweCreate.isOpenOffer`
- `loadForumGroups` / `loadForumThreads` if they exist; else `listAll('forum_groups')` / `listAll('forum_threads')` mapped by `GloweForums`

Build `saveCountsByKey` as `{}` for MVP if global counts unavailable (design allows 0). Optionally count from a public aggregate later — do not block.

```javascript
const sources = {
  posts: getAllCommunityPosts(),
  opportunities: getAllOpportunitiesForDisplay(),
  wishes: getOpenWishesForHome(), // thin wrapper
  offers: getOpenOffersForHome(),
  forumGroups: getForumGroupsForHome(),
  forumThreads: getForumThreadsForHome(),
  commentsByPostId: /* from groupCommentsByPost */,
  saveCountsByKey: {},
  isEvent: (opp) => window.GloweEvents && GloweEvents.isEvent(opp)
};
const ranked = GloweHomeFeed.buildHomeFeed(sources, { nowMs: Date.now() });
const page = GloweHomeFeed.pageSlice(ranked, 0, GloweHomeFeed.PAGE_SIZE_FIRST);
root.innerHTML = renderMemberHomeMarkup(page.items.map(renderHomeFeedCard).join('') || emptyHtml);
root._homeFeed = { items: ranked, offset: page.nextOffset, done: page.done };
attachHomeFeedObserver(root);
scheduleMemberHomeTranslation(root);
```

Always add `member-home-community-only` / drop personal hero regardless of viewport (supersedes phone-only AC2 exception).

- [ ] **Step 3: `attachHomeFeedObserver`**

```javascript
function attachHomeFeedObserver(root) {
  const sentinel = root.querySelector('#home-feed-sentinel');
  const grid = root.querySelector('#home-feed-grid');
  const endEl = root.querySelector('#home-feed-end');
  if (!sentinel || !grid || !window.IntersectionObserver) return;
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    const st = root._homeFeed;
    if (!st || st.done) {
      if (endEl) endEl.hidden = false;
      io.disconnect();
      return;
    }
    const page = GloweHomeFeed.pageSlice(st.items, st.offset, GloweHomeFeed.PAGE_SIZE_NEXT);
    grid.insertAdjacentHTML('beforeend', page.items.map(renderHomeFeedCard).join(''));
    st.offset = page.nextOffset;
    st.done = page.done;
    if (page.done && endEl) endEl.hidden = false;
    scheduleMemberHomeTranslation(root);
  }, { rootMargin: '240px 0px' });
  io.observe(sentinel);
  root._homeFeedObserver = io;
}
```

Teardown in `teardownMemberHome`: disconnect observer if present.

- [ ] **Step 4: Locale keys** (all four languages) for: `You're caught up`, `Wish`, `Volunteer Offer`, `Forum`, `Discussion`, `Event` (if missing), empty-state copy if changed.

- [ ] **Step 5: Test + commit**

```bash
cd app && pnpm --filter @kc/glowe-web test -- glowe-home-feed.test.js
git add app/apps/glowe-web/js/app.js
git commit -m "$(cat <<'EOF'
feat(glowe): member home unified progressive discovery feed

Feed-only shell; hot+diversity ranking; 10/+8 infinite scroll.
EOF
)"
```

---

### Task 4: Guest peek (~10) + join CTA

**Files:**
- Modify: `app/apps/glowe-web/index.html` — add mount `#guest-home-feed` near top of marketing main (after hero or replacing a redundant teaser — prefer after hero)
- Modify: `app/apps/glowe-web/js/app.js` — `initGuestHome`

- [ ] **Step 1: HTML mount**

```html
<section id="guest-home-feed" class="guest-home-feed container" aria-label="What is happening on GloWe" hidden></section>
```

Show when guest init completes (remove `hidden`).

- [ ] **Step 2: In `initGuestHome`**, after opportunity featured block (or instead of expanding featured indefinitely), build same `buildHomeFeed` sources (reuse a shared `loadHomeFeedSources()` helper extracted in Task 3), then:

```javascript
const ranked = GloweHomeFeed.buildHomeFeed(sources, { nowMs: Date.now() });
const preview = GloweHomeFeed.pageSlice(ranked, 0, GloweHomeFeed.GUEST_PREVIEW_LIMIT);
const el = document.getElementById('guest-home-feed');
if (el) {
  el.hidden = false;
  el.innerHTML = `
    <div class="section-toolbar"><div><h2>What is happening on GloWe</h2></div></div>
    <div class="member-feed-grid">${preview.items.map(renderHomeFeedCard).join('')}</div>
    <div class="guest-home-feed-cta">
      <p>Join GloWe to see more and take part.</p>
      <button type="button" class="btn btn-primary" onclick="handleGoogleSignIn()">Continue with Google</button>
    </div>`;
  if (window.translateGloweTree) translateGloweTree(el);
}
```

No infinite scroll for guests. Hide `#guest-home-feed` in `initMemberHome` / when member shell shows (`el.hidden = true`).

- [ ] **Step 3: Commit**

```bash
git add app/apps/glowe-web/index.html app/apps/glowe-web/js/app.js app/apps/glowe-web/css/styles.css
git commit -m "$(cat <<'EOF'
feat(glowe): guest home feed peek with join CTA

Ten ranked items; further discovery requires sign-in.
EOF
)"
```

---

### Task 5: SSOT + version bump

**Files:**
- Modify: `docs/SSOT/spec/17_glowe_frontend.md` — FR-GLOWE-016 AC2
- Modify: `docs/SSOT/DECISIONS.md` — append D-entry
- Modify: `docs/SSOT/BACKLOG.md` — add `GLOWE.HOME-FEED` 🟡→✅ in same PR
- Modify: `app/VERSION` → `1.1.4`
- Modify: `app/apps/glowe-web/js/glowe-version.js` → `1.1.4`
- Modify: design status already Approved

- [ ] **Step 1: Rewrite AC2** to state: unified multi-kind feed; hot+diversity; progressive 10/+8; feed-only member home all viewports; guest peek 10 + join CTA; no org profiles; client Phase 1.

- [ ] **Step 2: Decision** — “GloWe Home is a unified discovery feed (client-ranked MVP; server RPC later).”

- [ ] **Step 3: Bump version** via `node scripts/bump-app-version.mjs` from `app/` or edit both files.

- [ ] **Step 4: Full gates**

```bash
cd app && pnpm typecheck && pnpm test && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add docs/SSOT/spec/17_glowe_frontend.md docs/SSOT/DECISIONS.md docs/SSOT/BACKLOG.md app/VERSION app/apps/glowe-web/js/glowe-version.js
git commit -m "$(cat <<'EOF'
docs(ssot): FR-GLOWE-016 AC2 unified home feed + v1.1.4

EOF
)"
```

---

## Spec coverage checklist

| Design requirement | Task |
| ------------------ | ---- |
| Unified card + tag | 2 |
| Kinds: post/opp/event/wish/offer/forum group/thread | 1 + 3 |
| No org profiles | 1 (no source) + 3 |
| Hot = recency + comments + saves | 1 |
| Diversity | 1 |
| Progressive 10/+8 | 1 + 3 |
| Member feed-only all viewports | 3 |
| Remove See all / 6-cap | 3 |
| Guest ~10 + CTA | 4 |
| Spec/decision/version | 5 |
| Phase-2 RPC | Explicitly out of plan |

## Placeholder / consistency self-review

- No TBD steps; weights fixed defaults in Task 1.
- `PAGE_SIZE_*` / `GUEST_PREVIEW_LIMIT` names consistent across tasks.
- `renderHomeFeedCard` / `buildHomeFeed` / `pageSlice` names consistent.
- Save counts may be zero in MVP — called out; does not block AC.
