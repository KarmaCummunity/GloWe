# GloWe follow system (KC graph, MVP public-only)

**Date:** 2026-07-22  
**Status:** Approved for implementation (PM 2026-07-22)  
**Approach:** Extend existing GLOWE module pattern + `backend.js` KC block (no RPCs, no build step)  
**Maps to:** FR-FOLLOW-001, FR-FOLLOW-002, FR-FOLLOW-011 (MVP subset); FR-PROFILE-009/010 (list surfaces); FR-GLOWE-010/011 (profile + org discovery)  
**Decision:** D-183 (to be recorded at implementation)  
**Builds on:** D-61 (shared KC Supabase identity), chat slice pattern (`glowe-messages.js` + `kc*` adapters)

## Problem

GloWe already shares KC's follow graph at the data layer (`follow_edges`, `users_public` counters via `handle_new_user`), and `backend.js` exposes `kcFollowCounts()` for the signed-in user's Personal Area. However:

1. **Follow buttons are stubs** — `_renderProfileContent()` shows `showSuccessModal('Following …')` in two places (~profile-more-menu and sidebar) with no API call.
2. **Org cards have no follow** — `renderOrganizationCard()` only offers View Profile / Reach Out / Save.
3. **Counts are not interactive** — Personal Area shows followers/following but they are not links; public `profile.html` stats omit follower counts entirely.
4. **No list pages** — KC mobile ships followers/following lists (`ListFollowersUseCase`, `followers.tsx`); GloWe has nothing equivalent.

KC already implements the full follow domain in TypeScript (`packages/application`, `infrastructure-supabase/users/follow/*`). GloWe is vanilla JS with no bundler — the chat Realtime slice (D-182) established the pattern: thin `backend.js` adapters mirroring KC infrastructure + pure `glowe-*.js` helpers.

## Goals (GloWe-focused MVP)

| Goal | Detail |
|------|--------|
| **Real follow/unfollow** | Public profiles only — `follow_edges` INSERT/DELETE via RLS |
| **Surfaces** | Profile hero actions, org directory cards, tappable counts (own + others) |
| **Lists** | `connections.html?user=<id>&tab=followers\|following` |
| **Reuse existing code** | Extend KC block in `backend.js`; mirror `followMethods.ts` / `getFollowState.ts`; guest gate via `GloweGuest.requireMemberForAction`; unfollow via `window.confirm` (existing destructive-action pattern) |
| **Localized names** | List rows use `glowe_profiles` + `GloweLocalizedName` (same as chat counterparts) |
| **Testable** | Pure logic in `glowe-follow.js` + vitest |

## Non-goals (this slice)

- Follow requests, approve/reject, cooldown UI (private-profile flows — FR-FOLLOW-003..008)
- Remove follower (FR-FOLLOW-009)
- Feed filtering by follows
- KC mobile changes
- New migrations or RPCs
- Read receipts / notifications UI (KC triggers still fire server-side)

### Private accounts (v1 behavior)

If target `privacy_mode = 'Private'`: **hide** Follow button; show short copy: *"This account requires approval to follow."* No request CTA in v1.

---

## Architecture (anchored to existing code)

```
┌──────────────────────────────────────────────────────────────────┐
│ app.js                                                           │
│  renderFollowButton(targetId)  ← profile-actions + org card      │
│  handleFollowToggle(targetId)  ← guest gate + confirm unfollow     │
│  initConnectionsPage()         ← connections.html                  │
│  Personal Area stat links      ← existing personal-stats-grid     │
└────────────┬───────────────────────────────┬─────────────────────┘
             │                               │
┌────────────▼────────────┐     ┌────────────▼────────────────────┐
│ glowe-follow.js (new)   │     │ pages/connections.html (new)    │
│ deriveButtonState       │     │ ?user=&tab=followers|following  │
│ mapFollowListRow        │     └─────────────────────────────────┘
│ followButtonHtml        │
└────────────┬────────────┘
             │
┌────────────▼────────────────────────────────────────────────────┐
│ backend.js — existing KC section (kcContext / kcUnwrap)         │
│  kcFollowCounts()          [exists]                             │
│  kcFollow(targetId)        [new] ← followEdge                   │
│  kcUnfollow(targetId)      [new] ← unfollowEdge                 │
│  kcGetFollowState(target)  [new] ← fetchFollowStateRaw          │
│  kcListFollowers(userId)   [new] ← listFollowers                │
│  kcListFollowing(userId)   [new] ← listFollowing                │
│  kcPublicCounts(userId)    [new] ← users_public one row         │
└────────────┬────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────────┐
│ KC Supabase (existing)                                          │
│ follow_edges · users · users_public · glowe_profiles            │
└─────────────────────────────────────────────────────────────────┘
```

**Parity contract:** GloWe adapters mirror:
- `app/packages/infrastructure-supabase/src/users/follow/followMethods.ts`
- `app/packages/infrastructure-supabase/src/users/follow/getFollowState.ts`
- `app/packages/application/src/follow/GetFollowStateUseCase.ts` (MVP subset)
- `app/packages/infrastructure-supabase/src/users/follow/mapFollowError.ts` (error codes)

---

## File map

| File | Change |
|------|--------|
| `js/glowe-follow.js` | **Create** — pure state machine, list row mapping, button HTML helper |
| `js/__tests__/glowe-follow.test.js` | **Create** — unit tests |
| `js/backend.js` | **Extend** KC block after `kcFollowCounts` |
| `js/app.js` | **Modify** — replace stubs, wire buttons, stats links, `initConnectionsPage` |
| `pages/connections.html` | **Create** — list page (shell like `messages.html`) |
| `css/styles.css` | **Modify** — follow button states, connections list, tappable stat pills |
| `docs/SSOT/DECISIONS.md` | D-183 at implementation |
| `docs/SSOT/BACKLOG.md` | GLOWE.C2 row |
| `docs/SSOT/spec/17_glowe_frontend.md` | New FR-GLOWE-026 or extend FR-GLOWE-011 |

---

## Backend adapters (`backend.js`)

All methods use existing `kcContext()` + `kcUnwrap()`. Signed-out → `null` / `[]`.

### `kcFollow(targetUserId)`

```js
// INSERT into follow_edges { follower_id: me, followed_id: target }
// Idempotent: unique violation on PK → success (FR-FOLLOW-001 AC1)
```

### `kcUnfollow(targetUserId)`

```js
// DELETE from follow_edges WHERE follower_id = me AND followed_id = target
```

### `kcGetFollowState(targetUserId)`

Parallel queries (mirror `fetchFollowStateRaw`):
- `users`: `privacy_mode`, `account_status`
- `follow_edges`: edge exists?
- (Skip `follow_requests` queries in v1 — private targets never show Follow)

Returns raw object for `GloweFollow.deriveButtonState(raw, meId, targetId)`.

### `kcListFollowers(userId, limit = 50, cursor?)` / `kcListFollowing(userId, …)`

Mirror `listFollowers` / `listFollowing` embed:

```js
.select(`follower:follower_id(${USER_PUBLIC_COLUMNS})`)  // inline column list from userPublicColumns.ts
```

Then enrich with `kcCounterpartProfiles(ids)` for GloWe display names.

### `kcPublicCounts(userId)`

```js
.from('users_public').select('followers_count, following_count').eq('user_id', userId).maybeSingle()
```

### Error mapping (client-side)

Map Postgres messages to user-visible toasts (no stack traces):

| Signal | UX |
|--------|-----|
| `already_following` / PK 23505 on `follow_edges_pkey` | Treat as success |
| `blocked_relationship` / RLS 42501 | Toast: "Can't follow this profile" |
| `self_follow_forbidden` | Never shown (button hidden for self) |
| Other | Toast: "Something went wrong" |

---

## Pure helpers (`glowe-follow.js`)

### `deriveButtonState(raw, viewerId, targetUserId)`

Port of `GetFollowStateUseCase` — **MVP states only:**

| State | Label | Action |
|-------|-------|--------|
| `self` | (hidden) | — |
| `following` | Following ✓ | unfollow (confirm) |
| `not_following_public` | + Follow | follow |
| `private_account` | (hidden) | show note only |
| `unavailable` | (disabled) | `account_status !== 'active'` |

Skip: `request_pending`, `cooldown_after_reject`, `not_following_private_no_request`.

### `followButtonHtml(state, targetId, options?)`

Returns `<button>` with `data-follow-target`, classes `.follow-btn`, `.follow-btn--following`, etc.

### `mapFollowListRow(publicUser, gloweProfile, viewerId)`

→ `{ userId, name, avatarUrl, profileHref, followState? }`

### `connectionsPageUrl(userId, tab)`

→ `connections.html?user=${encodeURIComponent(userId)}&tab=${tab}`

---

## UI wiring (`app.js`)

### Profile page (`_renderProfileContent`)

1. **Remove** fake buttons at profile-more-menu and sidebar "Profile actions".
2. **Add** `renderFollowButton(profile.id)` in `profile-actions` (visible, next to Message) when `!profile.isOwnerView`.
3. **Add** follower/following counts to `profile-stats` (fetch `kcPublicCounts(profile.id)`); wrap in links to `connectionsPageUrl`.
4. On load: `kcGetFollowState(profile.id)` → render button state.

### Org card (`renderOrganizationCard`)

Add compact Follow button in `card-actions` (outline, small) — same `renderFollowButton(organization.id)`.

Batch follow-state fetch on organizations page init (optional optimization): load states for visible org IDs.

### Personal Area (`renderPersonalArea`)

Change existing stats (~7045–7046):

```html
<a href="connections.html?user=${profile.id}&tab=followers">…</a>
<a href="connections.html?user=${profile.id}&tab=following">…</a>
```

Uses existing `loadFollowCounts()` / `getFollowCountsForView()` for numbers.

### Follow toggle handler

```js
async function handleFollowToggle(targetId) {
  GloweGuest.requireMemberForAction('follow-profile', {}, async () => {
    const state = await backend.kcGetFollowState(targetId);
    const btn = GloweFollow.deriveButtonState(state, me.id, targetId);
    if (btn.state === 'following') {
      if (!window.confirm(`Stop following ${name}?`)) return;  // FR-FOLLOW-002 AC1
      await backend.kcUnfollow(targetId);
    } else {
      await backend.kcFollow(targetId);
    }
    refreshFollowButton(targetId);
    refreshCountsForProfile(targetId);
  });
}
```

Optimistic UI: flip button label immediately; rollback on error toast.

### Connections page (`connections.html`)

- Query: `user` (required UUID), `tab` (`followers` | `following`, default `followers`).
- Header: owner display name + tab switcher.
- List: avatar, localized name, link to `profile.html?id=…`.
- Per-row Follow button for rows that are not self (reuse helper).
- Empty state: "No followers yet" / "Not following anyone yet".
- Guest: sign-in prompt (same pattern as `messagesPageReady`).

---

## CSS (minimal)

- `.follow-btn` / `.follow-btn--following` — outline vs filled (match existing `.btn` tokens).
- `.profile-stat-link` — tappable stat pill (hover underline).
- `.connections-tabs` — tab bar (mirror personal-area nav style).
- `.connections-row` — list row (avatar + name, like forum leader row).

---

## i18n

Add to `GLOWE_TRANSLATIONS.he`:

- `+ Follow` / `Following ✓`
- `Stop following …?` (confirm — use template with name)
- `Followers` / `Following` (may already exist)
- `No followers yet` / `Not following anyone yet`
- `This account requires approval to follow.`
- Error toasts

---

## Testing

### Unit (`glowe-follow.test.js`)

- `deriveButtonState`: self, following, public-not-following, private, unavailable
- `connectionsPageUrl` encoding
- `mapFollowListRow` with/without glowe profile

### Manual QA

- Follow org from directory → count increments on profile
- Unfollow with confirm → count decrements
- Personal Area links → correct lists
- Other user's profile → their followers list visible
- Private account → no Follow button
- Guest tap → join prompt
- Blocked user → friendly toast

### E2E (stretch)

`glowe-follow.spec.ts` — persona A follows persona B, assert button + count. Not blocking v1.

---

## SSOT updates (same PR as code)

1. `BACKLOG.md` — `GLOWE.C2` GloWe follow system → ✅
2. `DECISIONS.md` — D-183
3. `spec/17_glowe_frontend.md` — FR-GLOWE-026 (or AC under FR-GLOWE-011)
4. Bump `app/VERSION` PATCH

---

## Follow-up (separate designs)

- Private profile follow requests (FR-FOLLOW-003..008)
- Remove follower
- Feed scoped to follows
- Batch follow-state on large org directory pages (perf)
