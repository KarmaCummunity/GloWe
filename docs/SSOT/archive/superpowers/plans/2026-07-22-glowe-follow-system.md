# GloWe Follow System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship real public follow/unfollow on GloWe profiles and org cards, plus tappable Followers/Following lists on Personal Area and any public profile — riding KC `follow_edges` / `users_public` with no new RPCs.

**Architecture:** Pure helpers in `glowe-follow.js` (unit-tested). Thin `kc*` adapters in existing `backend.js` KC block, mirroring `followMethods.ts` / `getFollowState.ts`. UI wiring in `app.js` (replace stubs); new `connections.html` for lists. Guest gate via `GloweGuest`; unfollow via `window.confirm`.

**Tech Stack:** GloWe vanilla JS (`app/apps/glowe-web`), Supabase JS client, Vitest (`pnpm --filter @kc/glowe-web test`), existing KC tables/RLS (`follow_edges`, `users`, `users_public`, `glowe_profiles`).

## Global Constraints

- Branch from latest `origin/dev`: `feat/FR-GLOWE-026-follow-system`.
- No new DB migrations or RPCs.
- No bundler / no importing `@kc/application` from GloWe.
- Pure modules must stay DOM-free (IIFE + `module.exports` like `glowe-messages.js`).
- File size cap ≤300 lines per file — split if approaching the limit.
- UI strings: English source + `GLOWE_TRANSLATIONS.he` keys in `app.js`.
- Private accounts: hide Follow button; show approval-required note (no request flow).
- Pre-push from `app/`: `pnpm typecheck && pnpm test && pnpm lint` (glowe-web suite must pass).
- PR targets `dev`; bump PATCH `1.0.8` → `1.0.9` in `app/VERSION` + `glowe-version.js`.
- Mapped to: FR-FOLLOW-001, FR-FOLLOW-002, FR-FOLLOW-011 (MVP subset); FR-PROFILE-009/010; FR-GLOWE-026 (new).

## File map

| File | Role |
|------|------|
| `app/apps/glowe-web/js/glowe-follow.js` | **Create** — `deriveButtonState`, `followButtonHtml`, `mapFollowListRow`, `connectionsPageUrl`, `mapFollowError` |
| `app/apps/glowe-web/js/__tests__/glowe-follow.test.js` | **Create** — unit tests |
| `app/apps/glowe-web/js/backend.js` | **Modify** — `kcFollow`, `kcUnfollow`, `kcGetFollowState`, `kcListFollowers`, `kcListFollowing`, `kcPublicCounts` |
| `app/apps/glowe-web/js/glowe-guest.js` | **Modify** — add `follow-profile` join action copy |
| `app/apps/glowe-web/js/app.js` | **Modify** — replace stubs, wire buttons/stats, `initConnectionsPage`, HE keys |
| `app/apps/glowe-web/pages/connections.html` | **Create** — list page shell |
| `app/apps/glowe-web/pages/profile.html` | **Modify** — script include for `glowe-follow.js` |
| `app/apps/glowe-web/pages/organizations.html` | **Modify** — script include |
| `app/apps/glowe-web/pages/my-applications.html` | **Modify** — script include (Personal Area) |
| `app/apps/glowe-web/css/styles.css` | **Modify** — follow button + connections list styles |
| `docs/SSOT/DECISIONS.md` | D-183 |
| `docs/SSOT/BACKLOG.md` | GLOWE.C2 |
| `docs/SSOT/spec/17_glowe_frontend.md` | FR-GLOWE-026 |
| `app/VERSION` + `glowe-version.js` | 1.0.9 |

---

### Task 1: Pure follow helpers (TDD)

**Files:**
- Create: `app/apps/glowe-web/js/glowe-follow.js`
- Create: `app/apps/glowe-web/js/__tests__/glowe-follow.test.js`

**Interfaces:**
- Produces:
  - `deriveButtonState(raw, viewerId, targetUserId) → { state, label, showNote }`
  - `followButtonHtml(stateInfo, targetId) → string` (empty string for `self` / `private_account`)
  - `privateNoteHtml() → string`
  - `mapFollowListRow(publicUser, gloweProfile) → { userId, name, avatarUrl, profileHref }`
  - `connectionsPageUrl(userId, tab) → string`
  - `mapFollowError(err) → { code, message }`
  - `isAlreadyFollowingError(err) → boolean`

States (MVP only): `self` | `following` | `not_following_public` | `private_account` | `unavailable`

- [ ] **Step 1: Write failing tests**

Create `glowe-follow.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import GloweFollow from '../glowe-follow.js';

const ME = 'aaaaaaaa-0000-0000-0000-000000000001';
const OTHER = 'bbbbbbbb-0000-0000-0000-000000000002';

describe('deriveButtonState', () => {
  it('returns self when viewer equals target', () => {
    expect(GloweFollow.deriveButtonState({}, ME, ME).state).toBe('self');
  });

  it('returns following when edge exists', () => {
    const raw = {
      target: { userId: OTHER, privacyMode: 'Public', accountStatus: 'active' },
      followingExists: true
    };
    expect(GloweFollow.deriveButtonState(raw, ME, OTHER)).toMatchObject({
      state: 'following', label: 'Following ✓'
    });
  });

  it('returns not_following_public for public target', () => {
    const raw = {
      target: { userId: OTHER, privacyMode: 'Public', accountStatus: 'active' },
      followingExists: false
    };
    expect(GloweFollow.deriveButtonState(raw, ME, OTHER)).toMatchObject({
      state: 'not_following_public', label: '+ Follow'
    });
  });

  it('returns private_account for private target without edge', () => {
    const raw = {
      target: { userId: OTHER, privacyMode: 'Private', accountStatus: 'active' },
      followingExists: false
    };
    expect(GloweFollow.deriveButtonState(raw, ME, OTHER).state).toBe('private_account');
  });

  it('returns unavailable when account is not active', () => {
    const raw = {
      target: { userId: OTHER, privacyMode: 'Public', accountStatus: 'suspended' },
      followingExists: false
    };
    expect(GloweFollow.deriveButtonState(raw, ME, OTHER).state).toBe('unavailable');
  });

  it('returns unavailable when target missing', () => {
    expect(GloweFollow.deriveButtonState({ target: null }, ME, OTHER).state).toBe('unavailable');
  });
});

describe('followButtonHtml', () => {
  it('returns empty for self and private_account', () => {
    expect(GloweFollow.followButtonHtml({ state: 'self' }, OTHER)).toBe('');
    expect(GloweFollow.followButtonHtml({ state: 'private_account' }, OTHER)).toBe('');
  });

  it('renders follow and following buttons', () => {
    const follow = GloweFollow.followButtonHtml(
      { state: 'not_following_public', label: '+ Follow' }, OTHER
    );
    expect(follow).toContain('data-follow-target="' + OTHER + '"');
    expect(follow).toContain('+ Follow');
    const following = GloweFollow.followButtonHtml(
      { state: 'following', label: 'Following ✓' }, OTHER
    );
    expect(following).toContain('follow-btn--following');
  });
});

describe('connectionsPageUrl / mapFollowListRow', () => {
  it('builds encoded connections URL', () => {
    expect(GloweFollow.connectionsPageUrl(OTHER, 'followers'))
      .toBe('connections.html?user=' + encodeURIComponent(OTHER) + '&tab=followers');
  });

  it('maps list row preferring glowe profile name', () => {
    const row = GloweFollow.mapFollowListRow(
      { user_id: OTHER, display_name: 'KC Name', avatar_url: null },
      { id: OTHER, name: 'GloWe Name', avatarUrl: 'https://x/a.png' }
    );
    expect(row).toMatchObject({
      userId: OTHER, name: 'GloWe Name', avatarUrl: 'https://x/a.png',
      profileHref: 'profile.html?id=' + encodeURIComponent(OTHER)
    });
  });
});

describe('mapFollowError', () => {
  it('treats PK conflict as already_following', () => {
    expect(GloweFollow.isAlreadyFollowingError({
      code: '23505', message: 'follow_edges_pkey'
    })).toBe(true);
  });

  it('maps blocked_relationship', () => {
    expect(GloweFollow.mapFollowError({
      message: 'blocked_relationship'
    }).code).toBe('blocked_relationship');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd app/apps/glowe-web && pnpm test -- js/__tests__/glowe-follow.test.js
```

Expected: FAIL — cannot find module / `deriveButtonState is not a function`

- [ ] **Step 3: Implement `glowe-follow.js`**

```javascript
// GloWe follow helpers (FR-GLOWE-026) — pure, DOM-free.
// Mirrors KC GetFollowStateUseCase MVP subset + followMethods error codes.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweFollow = api;
})(typeof self !== 'undefined' ? self : this, function () {
    function deriveButtonState(raw, viewerId, targetUserId) {
        const me = String(viewerId || '');
        const target = String(targetUserId || '');
        if (!me || !target || me === target) {
            return { state: 'self', label: '', showNote: false };
        }
        const r = raw || {};
        const t = r.target;
        if (!t) return { state: 'unavailable', label: '', showNote: false };
        if (r.followingExists) {
            return { state: 'following', label: 'Following ✓', showNote: false };
        }
        if (String(t.accountStatus) !== 'active') {
            return { state: 'unavailable', label: '', showNote: false };
        }
        if (String(t.privacyMode) === 'Private') {
            return { state: 'private_account', label: '', showNote: true };
        }
        return { state: 'not_following_public', label: '+ Follow', showNote: false };
    }

    function followButtonHtml(stateInfo, targetId) {
        const info = stateInfo || {};
        if (info.state === 'self' || info.state === 'private_account' || info.state === 'unavailable') {
            return '';
        }
        const id = String(targetId || '');
        const following = info.state === 'following';
        const cls = 'btn btn-outline btn-small follow-btn' + (following ? ' follow-btn--following' : '');
        const label = info.label || (following ? 'Following ✓' : '+ Follow');
        return '<button type="button" class="' + cls + '" data-follow-target="' + id +
            '" onclick="handleFollowToggle(\'' + id + '\')">' + label + '</button>';
    }

    function privateNoteHtml() {
        return '<p class="follow-private-note">This account requires approval to follow.</p>';
    }

    function connectionsPageUrl(userId, tab) {
        const t = (tab === 'following') ? 'following' : 'followers';
        return 'connections.html?user=' + encodeURIComponent(String(userId || '')) + '&tab=' + t;
    }

    function mapFollowListRow(publicUser, gloweProfile) {
        const p = publicUser || {};
        const g = gloweProfile || {};
        const userId = String(g.id || p.user_id || '');
        const name = (g.name && String(g.name).trim())
            || (p.display_name && String(p.display_name).trim())
            || 'GloWe member';
        return {
            userId: userId,
            name: name,
            avatarUrl: g.avatarUrl || p.avatar_url || '',
            profileHref: 'profile.html?id=' + encodeURIComponent(userId)
        };
    }

    function isAlreadyFollowingError(err) {
        const e = err || {};
        const text = String(e.message || '') + ' ' + String(e.details || '');
        if (e.code === '23505' && text.indexOf('follow_edges_pkey') !== -1) return true;
        return text.indexOf('already_following') !== -1;
    }

    function mapFollowError(err) {
        const e = err || {};
        const text = String(e.message || '') + ' ' + String(e.details || '');
        if (isAlreadyFollowingError(e)) {
            return { code: 'already_following', message: '' };
        }
        if (text.indexOf('blocked_relationship') !== -1 || e.code === '42501') {
            return { code: 'blocked_relationship', message: "Can't follow this profile" };
        }
        if (text.indexOf('self_follow') !== -1) {
            return { code: 'self_follow', message: "Can't follow this profile" };
        }
        return { code: 'unknown', message: 'Something went wrong' };
    }

    return {
        deriveButtonState: deriveButtonState,
        followButtonHtml: followButtonHtml,
        privateNoteHtml: privateNoteHtml,
        connectionsPageUrl: connectionsPageUrl,
        mapFollowListRow: mapFollowListRow,
        isAlreadyFollowingError: isAlreadyFollowingError,
        mapFollowError: mapFollowError
    };
});
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd app/apps/glowe-web && pnpm test -- js/__tests__/glowe-follow.test.js
```

- [ ] **Step 5: Commit**

```bash
git add app/apps/glowe-web/js/glowe-follow.js app/apps/glowe-web/js/__tests__/glowe-follow.test.js
git commit -m "feat(glowe): add pure follow helpers for public follow MVP"
```

---

### Task 2: Backend KC follow adapters

**Files:**
- Modify: `app/apps/glowe-web/js/backend.js` (after `kcFollowCounts`, ~line 978)

**Interfaces:**
- Consumes: existing `kcContext()`, `kcUnwrap()`, `kcCounterpartProfiles()`
- Produces: `kcFollow`, `kcUnfollow`, `kcGetFollowState`, `kcListFollowers`, `kcListFollowing`, `kcPublicCounts` on `window.gloweBackend`

**Parity:** Mirror `followMethods.ts` / `getFollowState.ts`. For list embeds use a compact public column list (not full `USER_PUBLIC_SELECT_COLUMNS` — keep payload small):

`user_id, display_name, avatar_url, privacy_mode, account_status, followers_count, following_count`

- [ ] **Step 1: Add adapters after `kcFollowCounts`**

```javascript
    const FOLLOW_USER_EMBED =
        '(user_id, display_name, avatar_url, privacy_mode, account_status, followers_count, following_count)';

    async function kcFollow(targetUserId) {
        const ctx = await kcContext();
        if (!ctx || !targetUserId) return null;
        const result = await ctx.supabaseClient
            .from('follow_edges')
            .insert({ follower_id: ctx.user.id, followed_id: targetUserId })
            .select('follower_id, followed_id, created_at')
            .single();
        if (result.error) {
            // Idempotent: PK conflict means already following (FR-FOLLOW-001 AC1)
            const text = String(result.error.message || '') + ' ' + String(result.error.details || '');
            if (result.error.code === '23505' && text.indexOf('follow_edges_pkey') !== -1) {
                return {
                    follower_id: ctx.user.id,
                    followed_id: targetUserId,
                    created_at: new Date().toISOString()
                };
            }
            throw result.error;
        }
        return result.data;
    }

    async function kcUnfollow(targetUserId) {
        const ctx = await kcContext();
        if (!ctx || !targetUserId) return false;
        kcUnwrap(await ctx.supabaseClient
            .from('follow_edges')
            .delete()
            .eq('follower_id', ctx.user.id)
            .eq('followed_id', targetUserId), null);
        return true;
    }

    // MVP: users + follow_edges only (skip follow_requests — private hides Follow).
    async function kcGetFollowState(targetUserId) {
        const ctx = await kcContext();
        if (!ctx || !targetUserId) return { target: null, followingExists: false };
        const [targetRes, edgeRes] = await Promise.all([
            ctx.supabaseClient
                .from('users')
                .select('user_id, privacy_mode, account_status')
                .eq('user_id', targetUserId)
                .maybeSingle(),
            ctx.supabaseClient
                .from('follow_edges')
                .select('follower_id')
                .eq('follower_id', ctx.user.id)
                .eq('followed_id', targetUserId)
                .maybeSingle()
        ]);
        if (targetRes.error) throw targetRes.error;
        if (edgeRes.error) throw edgeRes.error;
        const t = targetRes.data;
        return {
            target: t ? {
                userId: t.user_id,
                privacyMode: t.privacy_mode,
                accountStatus: t.account_status
            } : null,
            followingExists: edgeRes.data !== null
        };
    }

    async function kcListFollowers(userId, limit, cursor) {
        const ctx = await kcContext();
        if (!ctx || !userId) return [];
        const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
        let q = ctx.supabaseClient
            .from('follow_edges')
            .select('follower:follower_id' + FOLLOW_USER_EMBED)
            .eq('followed_id', userId)
            .order('created_at', { ascending: false })
            .limit(lim);
        if (cursor) q = q.lt('follower_id', cursor);
        const data = kcUnwrap(await q, []);
        return (data || [])
            .map(function (r) { return r && r.follower; })
            .filter(Boolean);
    }

    async function kcListFollowing(userId, limit, cursor) {
        const ctx = await kcContext();
        if (!ctx || !userId) return [];
        const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
        let q = ctx.supabaseClient
            .from('follow_edges')
            .select('followed:followed_id' + FOLLOW_USER_EMBED)
            .eq('follower_id', userId)
            .order('created_at', { ascending: false })
            .limit(lim);
        if (cursor) q = q.lt('followed_id', cursor);
        const data = kcUnwrap(await q, []);
        return (data || [])
            .map(function (r) { return r && r.followed; })
            .filter(Boolean);
    }

    async function kcPublicCounts(userId) {
        const ctx = await kcContext();
        if (!ctx || !userId) return null;
        const { data, error } = await ctx.supabaseClient
            .from('users_public')
            .select('followers_count, following_count')
            .eq('user_id', userId)
            .maybeSingle();
        if (error || !data) return null;
        return { followers: data.followers_count || 0, following: data.following_count || 0 };
    }
```

Export all six on `window.gloweBackend` next to `kcFollowCounts`.

- [ ] **Step 2: Smoke-check signatures** — `typeof window.gloweBackend.kcFollow === 'function'` after loading any page with backend.js (manual or note in report).

- [ ] **Step 3: Commit**

```bash
git add app/apps/glowe-web/js/backend.js
git commit -m "feat(glowe): expose KC follow adapters on backend"
```

---

### Task 3: Guest gate + CSS + connections page shell

**Files:**
- Modify: `app/apps/glowe-web/js/glowe-guest.js` — add `follow-profile` to `GLOWE_JOIN_ACTIONS`
- Create: `app/apps/glowe-web/pages/connections.html`
- Modify: `app/apps/glowe-web/css/styles.css`

**Interfaces:**
- Consumes: none from Tasks 1–2 (shell only)
- Produces: guest copy key `follow-profile`; page `#connections-content`; CSS classes

- [ ] **Step 1: Guest action copy**

In `GLOWE_JOIN_ACTIONS`:

```javascript
'follow-profile': {
  title: 'Sign in to follow',
  body: 'Sign in with Google to follow profiles and stay updated on their work.'
},
```

- [ ] **Step 2: Create `connections.html`**

Copy structure from `messages.html`. Differences:
- Title: `Connections - GloWe`
- Header: `<h1>Connections</h1>` + short subtitle
- Content: `<div id="connections-content"></div>`
- Scripts (same order as messages, plus `glowe-follow.js` before `app.js`):

```html
<script src="../js/glowe-follow.js"></script>
```

Include: backend-config, backend, data, auth, glowe-guest, glowe-localized-name, glowe-ui-conventions, glowe-follow, glowe-version, app, glowe-translate.

- [ ] **Step 3: CSS**

```css
.follow-btn.follow-btn--following {
    background: var(--surface-muted, #f3f0ec);
}
.follow-private-note {
    font-size: 0.85rem;
    color: var(--text-muted, #6b6560);
    margin: 0.5rem 0 0;
}
.profile-stat-link {
    color: inherit;
    text-decoration: none;
}
.profile-stat-link:hover strong,
.profile-stat-link:focus strong {
    text-decoration: underline;
}
.connections-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
}
.connections-tabs a {
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    text-decoration: none;
    color: inherit;
    border: 1px solid transparent;
}
.connections-tabs a.active {
    border-color: var(--border, #ddd);
    background: var(--surface-muted, #f3f0ec);
    font-weight: 600;
}
.connections-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.connections-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--border, #eee);
}
.connections-row a.connections-row-main {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
    color: inherit;
    text-decoration: none;
}
```

- [ ] **Step 4: Commit**

```bash
git add app/apps/glowe-web/js/glowe-guest.js \
  app/apps/glowe-web/pages/connections.html \
  app/apps/glowe-web/css/styles.css
git commit -m "feat(glowe): connections page shell and follow UI chrome"
```

---

### Task 4: Wire profile, org cards, Personal Area, connections UI

**Files:**
- Modify: `app/apps/glowe-web/js/app.js`
- Modify: `app/apps/glowe-web/pages/profile.html` — include `glowe-follow.js`
- Modify: `app/apps/glowe-web/pages/organizations.html` — include `glowe-follow.js`
- Modify: `app/apps/glowe-web/pages/my-applications.html` — include `glowe-follow.js`

**Interfaces:**
- Consumes: `GloweFollow.*`, `gloweBackend.kcFollow*`, `GloweGuest.requireMemberForAction`
- Produces: `handleFollowToggle`, `initConnectionsPage`, updated profile/org/personal renders

- [ ] **Step 1: Script includes**

Add before `app.js` on profile, organizations, my-applications, connections (already in Task 3):

```html
<script src="../js/glowe-follow.js"></script>
```

(Use correct relative path per page location.)

- [ ] **Step 2: Core helpers in `app.js`**

Add near other social helpers (near `loadFollowCounts`):

```javascript
async function resolveFollowButtonHtml(targetId) {
    if (!targetId || !window.GloweFollow || !backendReady()) return '';
    const me = await window.gloweBackend.currentUser().catch(() => null);
    if (!me) {
        // Guest: still show Follow CTA; click gates via requireMemberForAction
        return GloweFollow.followButtonHtml(
            { state: 'not_following_public', label: '+ Follow' }, targetId
        );
    }
    if (String(me.id) === String(targetId)) return '';
    const raw = await window.gloweBackend.kcGetFollowState(targetId).catch(() => null);
    if (!raw) return '';
    const info = GloweFollow.deriveButtonState(raw, me.id, targetId);
    let html = GloweFollow.followButtonHtml(info, targetId);
    if (info.showNote) html += GloweFollow.privateNoteHtml();
    return html;
}

async function handleFollowToggle(targetId) {
    const proceed = async function () {
        const backend = window.gloweBackend;
        const me = await backend.currentUser().catch(() => null);
        if (!me || !targetId) return;
        const raw = await backend.kcGetFollowState(targetId).catch(() => null);
        const info = GloweFollow.deriveButtonState(raw || {}, me.id, targetId);
        if (info.state === 'following') {
            const nameEl = document.querySelector('[data-follow-name="' + targetId + '"]');
            const name = (nameEl && nameEl.textContent) || 'this profile';
            if (!window.confirm('Stop following ' + name + '?')) return;
            try {
                await backend.kcUnfollow(targetId);
            } catch (e) {
                const mapped = GloweFollow.mapFollowError(e);
                showSuccessModal('Could not unfollow', mapped.message || 'Something went wrong');
                return;
            }
        } else if (info.state === 'not_following_public') {
            try {
                await backend.kcFollow(targetId);
            } catch (e) {
                if (GloweFollow.isAlreadyFollowingError(e)) {
                    /* treat as success */
                } else {
                    const mapped = GloweFollow.mapFollowError(e);
                    showSuccessModal('Could not follow', mapped.message || 'Something went wrong');
                    return;
                }
            }
        } else {
            return;
        }
        await refreshFollowUi(targetId);
    };
    if (window.GloweGuest) {
        window.GloweGuest.requireMemberForAction('follow-profile', {}, proceed);
    } else {
        proceed();
    }
}
window.handleFollowToggle = handleFollowToggle;

async function refreshFollowUi(targetId) {
    const nodes = document.querySelectorAll('[data-follow-slot="' + targetId + '"]');
    const html = await resolveFollowButtonHtml(targetId);
    nodes.forEach(function (n) { n.innerHTML = html; });
    // Refresh counts if present
    const counts = await window.gloweBackend.kcPublicCounts(targetId).catch(() => null);
    if (counts) {
        const f = document.querySelector('[data-followers-count="' + targetId + '"]');
        const g = document.querySelector('[data-following-count="' + targetId + '"]');
        if (f) f.textContent = String(counts.followers);
        if (g) g.textContent = String(counts.following);
    }
    if (typeof personalFollowCounts !== 'undefined') {
        loadFollowCounts().then(function () {
            const grid = document.querySelector('.personal-stats-grid');
            if (grid && typeof renderPersonalArea === 'function') {
                /* soft refresh counts only if on personal area — avoid full re-render if costly */
            }
        });
    }
}
```

- [ ] **Step 3: Replace profile stubs in `_renderProfileContent`**

1. Remove the fake Follow updates button from profile-more-menu (~line with `showSuccessModal('Following ${safeName}'…)`).
2. Remove sidebar "Follow Updates" stub.
3. In `profile-actions`, after Message button, insert:

```html
<span class="follow-slot" data-follow-slot="${profile.id}" data-follow-name="${safeName}"></span>
```

4. After `container.innerHTML = …`, if `!isOwnerView && profile.id`:

```javascript
resolveFollowButtonHtml(profile.id).then(function (html) {
    const slot = container.querySelector('[data-follow-slot="' + profile.id + '"]');
    if (slot) slot.innerHTML = html;
});
```

5. Extend `profile-stats` with follower/following (fetch async or pass counts). Preferred: after render, load `kcPublicCounts(profile.id)` and inject two tappable stats using `GloweFollow.connectionsPageUrl(profile.id, 'followers'|'following')` with `data-followers-count` / `data-following-count`.

- [ ] **Step 4: Org card**

In `renderOrganizationCard` `card-actions`, add:

```html
<span class="follow-slot" data-follow-slot="${organization.id}" data-follow-name="${jsString(organization.name)}"></span>
```

After the organizations list is rendered into the DOM, batch-fill:

```javascript
async function hydrateFollowSlots(root) {
    const slots = (root || document).querySelectorAll('[data-follow-slot]');
    const ids = Array.from(slots).map(function (s) { return s.getAttribute('data-follow-slot'); });
    // sequential is fine for MVP; parallel Promise.all per unique id
    const unique = Array.from(new Set(ids.filter(Boolean)));
    await Promise.all(unique.map(async function (id) {
        const html = await resolveFollowButtonHtml(id);
        document.querySelectorAll('[data-follow-slot="' + id + '"]').forEach(function (s) {
            s.innerHTML = html;
        });
    }));
}
```

Call `hydrateFollowSlots` from organizations page init after cards render.

- [ ] **Step 5: Personal Area stats**

Replace:

```html
<div><strong>${followCounts.followers}</strong><span>Followers</span></div>
<div><strong>${followCounts.following}</strong><span>Following</span></div>
```

with:

```html
<a class="profile-stat-link" href="${GloweFollow.connectionsPageUrl(profile.id, 'followers')}">
  <strong data-followers-count="${profile.id}">${followCounts.followers}</strong><span>Followers</span>
</a>
<a class="profile-stat-link" href="${GloweFollow.connectionsPageUrl(profile.id, 'following')}">
  <strong data-following-count="${profile.id}">${followCounts.following}</strong><span>Following</span>
</a>
```

(Only when `profile.id` and `GloweFollow` exist; else keep plain divs.)

- [ ] **Step 6: `initConnectionsPage`**

```javascript
async function initConnectionsPage() {
    const container = document.getElementById('connections-content');
    if (!container) return;
    if (!gloweIsLoggedIn()) {
        container.innerHTML = '<div class="empty-state"><h3>Sign in to see connections</h3><p>Followers and following lists are available after you sign in.</p><button class="btn btn-primary" type="button" onclick="openModal(\'login-modal\')">Sign up / Sign in</button></div>';
        return;
    }
    if (!backendReady()) {
        container.innerHTML = '<div class="empty-state"><h3>Connections unavailable</h3><p>Please try again shortly.</p></div>';
        return;
    }
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('user');
    const tab = params.get('tab') === 'following' ? 'following' : 'followers';
    if (!userId) {
        container.innerHTML = '<div class="empty-state"><h3>Profile not found</h3><p>Missing user id.</p></div>';
        return;
    }
    container.innerHTML = '<div class="empty-state"><h3>Loading…</h3></div>';
    const backend = window.gloweBackend;
    const profiles = await backend.kcCounterpartProfiles([userId]).catch(() => ({}));
    const ownerName = (profiles[userId] && profiles[userId].name) || 'GloWe member';
    const rows = tab === 'following'
        ? await backend.kcListFollowing(userId).catch(() => [])
        : await backend.kcListFollowers(userId).catch(() => []);
    const ids = rows.map(function (r) { return r.user_id; });
    const gloweProfiles = await backend.kcCounterpartProfiles(ids).catch(() => ({}));
    const tabs = '<div class="connections-tabs">' +
        '<a class="' + (tab === 'followers' ? 'active' : '') + '" href="' + GloweFollow.connectionsPageUrl(userId, 'followers') + '">Followers</a>' +
        '<a class="' + (tab === 'following' ? 'active' : '') + '" href="' + GloweFollow.connectionsPageUrl(userId, 'following') + '">Following</a>' +
        '</div>';
    if (!rows.length) {
        const empty = tab === 'following' ? 'Not following anyone yet' : 'No followers yet';
        container.innerHTML = '<h2>' + escapeHtml(ownerName) + '</h2>' + tabs +
            '<div class="empty-state"><h3>' + empty + '</h3></div>';
        return;
    }
    const list = rows.map(function (r) {
        const mapped = GloweFollow.mapFollowListRow(r, gloweProfiles[r.user_id]);
        return '<div class="connections-row">' +
            '<a class="connections-row-main" href="' + mapped.profileHref + '">' +
            renderEntityMark(mapped.name, 'avatar') +
            '<strong data-follow-name="' + mapped.userId + '">' + escapeHtml(mapped.name) + '</strong></a>' +
            '<span class="follow-slot" data-follow-slot="' + mapped.userId + '" data-follow-name="' + jsString(mapped.name) + '"></span>' +
            '</div>';
    }).join('');
    container.innerHTML = '<h2>' + escapeHtml(ownerName) + '</h2>' + tabs +
        '<div class="connections-list">' + list + '</div>';
    await hydrateFollowSlots(container);
}
```

Wire in `DOMContentLoaded` via `resolveGlowePage`:

```javascript
if (page === 'connections') initConnectionsPage();
```

- [ ] **Step 7: Hebrew keys** in `GLOWE_TRANSLATIONS.he`

```javascript
"+ Follow": "+ עקבו",
"Following ✓": "עוקבים ✓",
"Stop following": "הפסק לעקוב",  // confirm is dynamic; translate static parts if needed
"This account requires approval to follow.": "חשבון זה דורש אישור כדי לעקוב.",
"No followers yet": "אין עוקבים עדיין",
"Not following anyone yet": "לא עוקבים אחרי אף אחד עדיין",
"Sign in to follow": "התחברו כדי לעקוב",
"Sign in with Google to follow profiles and stay updated on their work.": "התחברו עם Google כדי לעקוב אחרי פרופילים ולהישאר מעודכנים בעבודתם.",
"Can't follow this profile": "לא ניתן לעקוב אחרי הפרופיל הזה",
"Could not follow": "לא ניתן לעקוב",
"Could not unfollow": "לא ניתן להפסיק לעקוב",
"Connections": "קשרים",
"Sign in to see connections": "התחברו כדי לראות קשרים",
```

- [ ] **Step 8: Run glowe-web tests**

```bash
cd app/apps/glowe-web && pnpm test
```

Expected: all green including new follow tests.

- [ ] **Step 9: Commit**

```bash
git add app/apps/glowe-web/js/app.js \
  app/apps/glowe-web/pages/profile.html \
  app/apps/glowe-web/pages/organizations.html \
  app/apps/glowe-web/pages/my-applications.html
git commit -m "feat(glowe): wire follow buttons, stats links, and connections list"
```

---

### Task 5: SSOT + version bump + verification

**Files:**
- Modify: `docs/SSOT/DECISIONS.md`, `docs/SSOT/BACKLOG.md`, `docs/SSOT/spec/17_glowe_frontend.md`
- Modify: `app/VERSION`, `app/apps/glowe-web/js/glowe-version.js`
- Add (if not already committed): design + plan under `docs/SSOT/archive/superpowers/`

- [ ] **Step 1: D-183** in `DECISIONS.md`

GloWe follow system rides KC `follow_edges` via thin `backend.js` adapters + `glowe-follow.js` pure helpers (same pattern as D-182 chat). Public follow/unfollow only in v1; private accounts hide Follow. No shared TS package / no new RPCs.

- [ ] **Step 2: BACKLOG** — add near GLOWE.C:

```markdown
| GLOWE.C2 | **GloWe follow system (public MVP)** — real follow/unfollow on profile + org cards; connections lists; KC `follow_edges` | agent-fullstack | ✅ Done | `spec/17_glowe_frontend.md` FR-GLOWE-026; design `docs/SSOT/archive/superpowers/specs/2026-07-22-glowe-follow-system-design.md` |
```

- [ ] **Step 3: FR-GLOWE-026** in `spec/17_glowe_frontend.md`

```markdown
## FR-GLOWE-026 — Follow graph on GloWe (KC-backed, public MVP)

**Status.** ✅ Done — public follow/unfollow on profile + org cards; tappable followers/following on Personal Area and public profiles; `connections.html` lists. Private accounts hide Follow (no request flow). Design: `docs/SSOT/archive/superpowers/specs/2026-07-22-glowe-follow-system-design.md`; D-183.

- AC1. Follow / Following ✓ on public profiles and org cards writes/deletes `follow_edges`.
- AC2. Unfollow confirms with contextual copy.
- AC3. Counts link to connections lists for self and others.
- AC4. Guest follow opens contextual join (`follow-profile`).
- AC5. Private targets: no Follow button + approval note.
```

- [ ] **Step 4: Bump version** `1.0.8` → `1.0.9` in both files (or run `node scripts/bump-app-version.mjs` from `app/` if preferred).

- [ ] **Step 5: Gates**

```bash
cd app && pnpm typecheck
cd app/apps/glowe-web && pnpm test
```

- [ ] **Step 6: Commit**

```bash
git add docs/SSOT/DECISIONS.md docs/SSOT/BACKLOG.md docs/SSOT/spec/17_glowe_frontend.md \
  app/VERSION app/apps/glowe-web/js/glowe-version.js \
  docs/SSOT/archive/superpowers/specs/2026-07-22-glowe-follow-system-design.md \
  docs/SSOT/archive/superpowers/plans/2026-07-22-glowe-follow-system.md
git commit -m "docs(ssot): record GloWe follow system D-183 and FR-GLOWE-026"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Real follow/unfollow on public profiles | 1, 2, 4 |
| Org card Follow | 4 |
| Personal Area tappable counts | 4 |
| Public profile tappable counts | 4 |
| `connections.html` lists | 3, 4 |
| Private → hide + note | 1, 4 |
| Guest gate | 3, 4 |
| Unfollow confirm | 4 |
| Error mapping / idempotent follow | 1, 2 |
| Unit tests | 1 |
| SSOT / version | 5 |

## Follow-up (not in this plan)

- Private follow requests (FR-FOLLOW-003..008)
- Remove follower
- Feed scoped to follows
- Batch follow-state RPC for large org directories
- E2E `glowe-follow.spec.ts`
