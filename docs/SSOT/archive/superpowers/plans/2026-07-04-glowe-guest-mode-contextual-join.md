# GloWe Guest Peek & Contextual Join — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let guests browse GloWe read-only, and convert them at the moment they attempt a gated action via one action-tailored "Continue with Google" prompt that auto-registers them and returns them to the action.

**Architecture:** A new client module `js/glowe-guest.js` owns the action registry, a contextual join modal, a single `requireMemberForAction` guard, and pending-intent persistence. Existing scattered gates in `js/app.js` (`canCreateContent` anon branch, apply/RSVP/message login checks) are re-routed through it. On first Google sign-in, `syncSupabaseSession()` (js/auth.js) auto-creates a minimal `glowe_profiles` row and replays the stored intent. Mode A (instant prompt) only; Mode B (progressive) is documented, not built.

**Tech Stack:** Vanilla JS (no bundler), Supabase JS (via existing `window.gloweBackend`), vitest for pure-helper unit tests, existing `openModal`/`closeModal`/`translateGloweTree` infra.

**Spec:** `docs/SSOT/archive/superpowers/specs/2026-07-04-glowe-guest-mode-contextual-join-design.md` (FR-GLOWE-023)

**Working dir for all commands:** repo root unless noted. Tests run from `app/apps/glowe-web`.
**Branch:** `feat/FR-GLOWE-023-guest-contextual-join` (already created off `origin/dev`).

---

## File Structure

- **Create** `app/apps/glowe-web/js/glowe-guest.js` — registry, `buildJoinCopy`, pending-intent helpers, `showJoinPrompt`, `requireMemberForAction`, `resumeGuestIntent`. Pure helpers exported on `window.GloweGuest` for tests.
- **Create** `app/apps/glowe-web/js/__tests__/glowe-guest.test.js` — unit tests for the pure helpers.
- **Modify** `app/apps/glowe-web/js/app.js` — re-route `canCreateContent` anon branch, apply/RSVP/message gates; add Hebrew dict entries in `gloweDict()`.
- **Modify** `app/apps/glowe-web/js/auth.js` — call `ensureProfileFromGoogle` + `resumeGuestIntent` in `syncSupabaseSession`; welcome toast on load.
- **Modify** `app/apps/glowe-web/js/backend.js` — add `ensureProfileFromGoogle(user)`.
- **Modify** `app/apps/glowe-web/index.html` + every file in `app/apps/glowe-web/pages/*.html` — add `<script src="js/glowe-guest.js"></script>` (or `../js/...` for pages) before `app.js`.
- **Modify** SSOT: `docs/SSOT/spec/17_glowe_frontend.md`, `docs/SSOT/BACKLOG.md`, `docs/SSOT/DECISIONS.md`.

---

## Task 1: Scaffold `glowe-guest.js` pure helpers (registry, copy, intent) — TDD

**Files:**
- Create: `app/apps/glowe-web/js/glowe-guest.js`
- Test: `app/apps/glowe-web/js/__tests__/glowe-guest.test.js`

- [ ] **Step 1: Write the failing test**

Create `app/apps/glowe-web/js/__tests__/glowe-guest.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';

// The module attaches helpers to globalThis.window.GloweGuest and reads
// window.sessionStorage. Provide a minimal window before importing it.
const store = {};
globalThis.window = globalThis.window || {};
globalThis.window.sessionStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

await import('../glowe-guest.js');
const { buildJoinCopy, setPendingIntent, takePendingIntent } = globalThis.window.GloweGuest;

describe('buildJoinCopy', () => {
  it('interpolates context for a known action', () => {
    const copy = buildJoinCopy('offer-help', { org: 'Green Roots' });
    expect(copy.title).toBeTruthy();
    expect(copy.body).toContain('Green Roots');
  });

  it('falls back to generic copy for an unknown action', () => {
    const copy = buildJoinCopy('no-such-action', {});
    expect(copy.title).toBeTruthy();
    expect(copy.body).toBeTruthy();
    expect(copy.body).not.toContain('undefined');
  });

  it('omits the placeholder cleanly when context is missing', () => {
    const copy = buildJoinCopy('offer-help', {});
    expect(copy.body).not.toContain('{org}');
    expect(copy.body).not.toContain('undefined');
  });
});

describe('pending intent', () => {
  beforeEach(() => { Object.keys(store).forEach((k) => delete store[k]); });

  it('round-trips and is consumed once', () => {
    setPendingIntent({ action: 'rsvp-event', targetUrl: 'pages/opportunity.html?id=7' });
    const first = takePendingIntent();
    expect(first).toEqual({ action: 'rsvp-event', targetUrl: 'pages/opportunity.html?id=7' });
    expect(takePendingIntent()).toBeNull();
  });

  it('returns null when nothing is stored', () => {
    expect(takePendingIntent()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app/apps/glowe-web && NODE_OPTIONS=--experimental-require-module npx vitest run js/__tests__/glowe-guest.test.js`
Expected: FAIL (cannot find `../glowe-guest.js` / `GloweGuest` undefined).

- [ ] **Step 3: Write minimal implementation**

Create `app/apps/glowe-web/js/glowe-guest.js`:

```js
// FR-GLOWE-023 — Guest peek + contextual join.
// Guests browse read-only; any identity-required action opens a modal whose copy
// is tailored to the attempted action, converts via Google, and resumes the action.
(function () {
  'use strict';

  const PENDING_KEY = 'glowe-pending-intent';

  // Action registry: key -> copy template. {org}/{title} are interpolated from ctx.
  const GLOWE_JOIN_ACTIONS = {
    'create-need':        { title: 'Sign in to post a need', body: 'Browsing GloWe is open to everyone. Sign in with Google to post a need and reach people ready to help.' },
    'create-post':        { title: 'Sign in to post', body: 'Sign in with Google to share a post with the GloWe community.' },
    'create-opportunity': { title: 'Sign in to publish', body: 'Sign in with Google to publish this opportunity and start receiving applications.' },
    'create-thread':      { title: 'Sign in to start a discussion', body: 'Sign in with Google to open a new discussion thread.' },
    'create-reply':       { title: 'Sign in to reply', body: 'Sign in with Google to join this discussion.' },
    'apply-opportunity':  { title: 'Sign in to apply', body: 'Sign in with Google to apply to {org} and track your application.' },
    'rsvp-event':         { title: 'Save your spot', body: 'Sign in with Google to register for {title}.' },
    'offer-help':         { title: 'Ready to lend a hand?', body: 'Sign in with Google to reach {org} and offer your help.' },
    'save-item':          { title: 'Keep this for later', body: 'Sign in with Google to save it to your list.' },
    'send-message':       { title: 'Start the conversation', body: 'Sign in with Google to message {org}.' },
    'open-personal-area': { title: 'Sign in to continue', body: 'Sign in with Google to open your personal area.' },
  };

  const GENERIC_COPY = { title: 'Sign in to continue', body: 'Sign in with Google to do this on GloWe.' };

  // Replace {org}/{title} tokens; drop any unfilled token and collapse leftover spaces.
  function interpolate(text, ctx) {
    return text
      .replace(/\{org\}/g, (ctx && ctx.org) ? ctx.org : '')
      .replace(/\{title\}/g, (ctx && ctx.title) ? ctx.title : '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+\./g, '.')
      .trim();
  }

  function buildJoinCopy(actionKey, ctx) {
    const tpl = GLOWE_JOIN_ACTIONS[actionKey] || GENERIC_COPY;
    return { title: interpolate(tpl.title, ctx), body: interpolate(tpl.body, ctx) };
  }

  function setPendingIntent(intent) {
    try { window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(intent)); } catch (e) { /* ignore */ }
  }

  function takePendingIntent() {
    let raw = null;
    try { raw = window.sessionStorage.getItem(PENDING_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try { window.sessionStorage.removeItem(PENDING_KEY); } catch (e) { /* ignore */ }
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  window.GloweGuest = window.GloweGuest || {};
  Object.assign(window.GloweGuest, {
    GLOWE_JOIN_ACTIONS,
    buildJoinCopy,
    setPendingIntent,
    takePendingIntent,
  });
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app/apps/glowe-web && NODE_OPTIONS=--experimental-require-module npx vitest run js/__tests__/glowe-guest.test.js`
Expected: PASS (3 + 2 tests green).

- [ ] **Step 5: Commit**

```bash
git add app/apps/glowe-web/js/glowe-guest.js app/apps/glowe-web/js/__tests__/glowe-guest.test.js
git commit -m "feat(glowe): add guest join registry + intent helpers (FR-GLOWE-023)"
```

---

## Task 2: Contextual join modal + `requireMemberForAction`

**Files:**
- Modify: `app/apps/glowe-web/js/glowe-guest.js` (add DOM functions)

- [ ] **Step 1: Add the modal + guard to `glowe-guest.js`**

Inside the IIFE, before the `window.GloweGuest` assignment, add:

```js
  // Build (once) and open the contextual join modal for a gated action.
  function showJoinPrompt(actionKey, ctx) {
    const copy = buildJoinCopy(actionKey, ctx);
    let modal = document.getElementById('glowe-join-modal');
    if (!modal) {
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div id="glowe-join-modal" class="modal">
          <div class="modal-content">
            <span class="close-modal" onclick="closeModal('glowe-join-modal')">&times;</span>
            <h2 id="glowe-join-title"></h2>
            <p id="glowe-join-body" class="modal-footer-text"></p>
            <button id="glowe-join-google" class="btn btn-primary btn-block" type="button">Continue with Google</button>
            <button class="btn btn-text btn-block" type="button" onclick="closeModal('glowe-join-modal')">Maybe later</button>
          </div>
        </div>`;
      modal = wrap.firstElementChild;
      document.body.appendChild(modal);
    }
    modal.querySelector('#glowe-join-title').textContent = copy.title;
    modal.querySelector('#glowe-join-body').textContent = copy.body;
    const googleBtn = modal.querySelector('#glowe-join-google');
    googleBtn.onclick = function () {
      // Persist intent so the action resumes after the OAuth round-trip.
      setPendingIntent({ action: actionKey, targetUrl: window.location.href });
      closeModal('glowe-join-modal');
      if (typeof window.handleGoogleSignIn === 'function') window.handleGoogleSignIn();
    };
    if (typeof window.translateGloweTree === 'function') window.translateGloweTree(modal);
    if (typeof window.openModal === 'function') window.openModal('glowe-join-modal');
  }

  // Single guard for identity-required actions. Runs `proceed` for members;
  // otherwise stores intent + opens the tailored prompt and returns false.
  function requireMemberForAction(actionKey, ctx, proceed) {
    const loggedIn = typeof window.isLoggedIn === 'function' && window.isLoggedIn();
    if (loggedIn) { if (typeof proceed === 'function') proceed(); return true; }
    showJoinPrompt(actionKey, ctx || {});
    return false;
  }
```

Add `showJoinPrompt` and `requireMemberForAction` to the `Object.assign(window.GloweGuest, {...})` list.

- [ ] **Step 2: Add Hebrew dict entries in `app.js`**

In `app/apps/glowe-web/js/app.js`, inside the object returned by `gloweDict()` (near the alphabetical entries around line 6167+), add these English→Hebrew pairs (keep the file's existing alphabetical ordering approximately; exact position is not enforced):

```js
        'Continue with Google': 'המשך עם גוגל',
        'Maybe later': 'אולי מאוחר יותר',
        'Sign in to post a need': 'התחברו כדי לפרסם צורך',
        'Browsing GloWe is open to everyone. Sign in with Google to post a need and reach people ready to help.': 'הגלישה ב-GloWe פתוחה לכולם. התחברו עם גוגל כדי לפרסם צורך ולהגיע לאנשים שמוכנים לעזור.',
        'Sign in to post': 'התחברו כדי לפרסם',
        'Sign in with Google to share a post with the GloWe community.': 'התחברו עם גוגל כדי לשתף פוסט עם קהילת GloWe.',
        'Sign in to publish': 'התחברו כדי לפרסם',
        'Sign in with Google to publish this opportunity and start receiving applications.': 'התחברו עם גוגל כדי לפרסם את ההזדמנות ולהתחיל לקבל מועמדויות.',
        'Sign in to start a discussion': 'התחברו כדי לפתוח דיון',
        'Sign in with Google to open a new discussion thread.': 'התחברו עם גוגל כדי לפתוח שרשור דיון חדש.',
        'Sign in to reply': 'התחברו כדי להשיב',
        'Sign in with Google to join this discussion.': 'התחברו עם גוגל כדי להצטרף לדיון.',
        'Sign in to apply': 'התחברו כדי להגיש מועמדות',
        'Ready to lend a hand?': 'מוכנים לעזור?',
        'Save your spot': 'שמרו את מקומכם',
        'Keep this for later': 'שמרו לאחר כך',
        'Sign in with Google to save it to your list.': 'התחברו עם גוגל כדי לשמור לרשימה שלכם.',
        'Start the conversation': 'התחילו את השיחה',
        'Sign in to continue': 'התחברו כדי להמשיך',
        'Sign in with Google to open your personal area.': 'התחברו עם גוגל כדי לפתוח את האזור האישי שלכם.',
        'Sign in with Google to do this on GloWe.': 'התחברו עם גוגל כדי לעשות זאת ב-GloWe.',
        "Welcome — you're browsing as a guest. Sign in with Google anytime to participate.": 'ברוכים הבאים — אתם גולשים כאורח. התחברו עם גוגל בכל רגע כדי להשתתף.',
```

> Note: the `{org}`/`{title}` interpolated strings (apply/rsvp/offer/send-message bodies) are localized at implementation discretion; add Hebrew keys for the *interpolated result* only if the org/title tokens are stable, otherwise leave those three bodies English-source (the MutationObserver will pass through untranslated). Prefer adding a token-free Hebrew fallback if time allows.

- [ ] **Step 3: Manual smoke (deferred to Task 8 browser verification).** No unit test for DOM here; `buildJoinCopy` is already covered.

- [ ] **Step 4: Commit**

```bash
git add app/apps/glowe-web/js/glowe-guest.js app/apps/glowe-web/js/app.js
git commit -m "feat(glowe): contextual join modal + requireMemberForAction guard (FR-GLOWE-023)"
```

---

## Task 3: Wire the script include into every page

**Files:**
- Modify: `app/apps/glowe-web/index.html:471`
- Modify: `app/apps/glowe-web/pages/*.html` (each has its own script block)

- [ ] **Step 1: Add the include in `index.html`**

In `index.html`, immediately before line `<script src="js/app.js"></script>`, add:

```html
    <script src="js/glowe-guest.js"></script>
```

- [ ] **Step 2: Add the include in every page under `pages/`**

For each `app/apps/glowe-web/pages/*.html`, find the line that loads app.js (it uses the `../js/` prefix, e.g. `<script src="../js/app.js"></script>`) and add immediately before it:

```html
    <script src="../js/glowe-guest.js"></script>
```

Find them all with:

```bash
grep -rl 'js/app.js' app/apps/glowe-web/pages/
```

Verify none were missed:

```bash
grep -rL 'glowe-guest.js' app/apps/glowe-web/pages/*.html   # should print nothing
```

- [ ] **Step 3: Commit**

```bash
git add app/apps/glowe-web/index.html app/apps/glowe-web/pages/*.html
git commit -m "chore(glowe): load glowe-guest.js before app.js on all pages (FR-GLOWE-023)"
```

---

## Task 4: Re-route existing gates through `requireMemberForAction`

**Files:**
- Modify: `app/apps/glowe-web/js/app.js` (`canCreateContent` ~55-59; apply ~5324-5327; RSVP ~5460-5462; message trigger ~2581)

- [ ] **Step 1: `canCreateContent` anon branch → tailored prompt**

In `canCreateContent()` (js/app.js ~line 55), replace the `gate.reason === 'anon'` block:

```js
    if (gate.reason === 'anon') {
        showSuccessModal(
            'Sign in to contribute',
            'Browsing GloWe is open to everyone. To publish a need, post, event, or discussion, please sign in or create a free account first.'
        );
    } else {
```

with a contextual prompt (the caller passes no specific key here, so use the generic create key):

```js
    if (gate.reason === 'anon') {
        window.GloweGuest.showJoinPrompt('create-post', {});
    } else {
```

> The `org-unverified` branch (the `else`) is unchanged — that is a signed-in org pending review, not a guest.

- [ ] **Step 2: Apply gate → intent + tailored prompt**

In the apply-button handler (js/app.js ~line 5324), replace:

```js
            if (!isLoggedIn()) {
                sessionStorage.setItem('pendingOpportunityApplication', opportunityId);
                openModal('login-modal');
            } else {
                openModal('apply-modal');
            }
```

with:

```js
            window.GloweGuest.requireMemberForAction(
                'apply-opportunity',
                { org: (opportunity && opportunity.organization) || '' },
                function () { openModal('apply-modal'); }
            );
```

> The old `pendingOpportunityApplication` write is removed here; intent is now stored inside `showJoinPrompt`. Task 5 makes resume re-open the apply modal.

- [ ] **Step 3: RSVP gate → tailored prompt**

In the event registration renderer (js/app.js ~line 5460), replace:

```js
    if (!isLoggedIn()) {
        area.innerHTML = `<button class="btn btn-primary btn-block" type="button" onclick="openModal('login-modal')">Sign in to register</button>`;
        return;
    }
```

with a button that triggers the tailored prompt:

```js
    if (!isLoggedIn()) {
        area.innerHTML = `<button class="btn btn-primary btn-block" type="button" id="glowe-rsvp-join">Save your spot</button>`;
        const btn = area.querySelector('#glowe-rsvp-join');
        if (btn) btn.addEventListener('click', function () {
            window.GloweGuest.requireMemberForAction('rsvp-event', { title: (opportunity && opportunity.title) || '' }, function () {});
        });
        return;
    }
```

- [ ] **Step 4: Message trigger → gated**

Locate the function that opens the message modal (js/app.js, ends with `openModal('message-modal');` ~line 2581). Wrap its body so guests get the prompt. At the top of that function (it receives the target `name`), add:

```js
    if (!(typeof isLoggedIn === 'function' && isLoggedIn())) {
        window.GloweGuest.requireMemberForAction('send-message', { org: name }, function () {});
        return;
    }
```

- [ ] **Step 5: Find any remaining `openModal('login-modal')` guest gates**

```bash
grep -n "openModal('login-modal')" app/apps/glowe-web/js/app.js
```

For each remaining site that gates a guest action (save/bookmark/offer if present), apply the same recipe: pick the closest action key from the registry and wrap with `requireMemberForAction(<key>, <ctx>, <proceed>)`. If a site is a header "Sign up / Sign in" button (not an action), leave it as-is.

- [ ] **Step 6: Commit**

```bash
git add app/apps/glowe-web/js/app.js
git commit -m "feat(glowe): route guest action gates through contextual join (FR-GLOWE-023)"
```

---

## Task 5: Google auto-register + resume-after-join

**Files:**
- Modify: `app/apps/glowe-web/js/backend.js` (add `ensureProfileFromGoogle`)
- Modify: `app/apps/glowe-web/js/glowe-guest.js` (add `resumeGuestIntent`)
- Modify: `app/apps/glowe-web/js/auth.js` (`syncSupabaseSession` success path)

- [ ] **Step 1: `ensureProfileFromGoogle` in backend.js**

In `app/apps/glowe-web/js/backend.js`, next to `upsertProfile` (~line 258), add and export a function that upserts only minimal identity columns (never `account_type`/`onboarding_complete`, so onboarding still enriches):

```js
    // FR-GLOWE-023 — create a minimal profile row from the Google identity on first
    // sign-in so the user is a registered member immediately. Preserves any existing
    // row (onboarding fills the rest). No-op if a profile already exists.
    async function ensureProfileFromGoogle(user) {
        if (!user) return null;
        const existing = await fetchProfile().catch(() => null);
        if (existing) return existing;
        const meta = user.user_metadata || {};
        const payload = {
            id: user.id,
            email: user.email || meta.email || '',
            name: meta.name || meta.full_name || (user.email ? user.email.split('@')[0] : 'GloWe member'),
            avatar_url: meta.avatar_url || meta.picture || '',
        };
        const { data, error } = await supabaseClient
            .from(tbl('profiles'))
            .upsert(payload)
            .select()
            .maybeSingle();
        if (error) { console.warn('ensureProfileFromGoogle failed (non-fatal):', error.message); return null; }
        return data;
    }
```

Add `ensureProfileFromGoogle` to the returned adapter object (near `fetchProfile,` in the `return { ... }` block ~line 609).

- [ ] **Step 2: `resumeGuestIntent` in glowe-guest.js**

Add inside the IIFE (and to the `Object.assign` export list):

```js
  // Resume handlers: re-open the action's entry point after sign-in. Same-page
  // create actions need no navigation; detail-page actions deep-link back first.
  const RESUME_HANDLERS = {
    'apply-opportunity': function () { if (typeof window.openModal === 'function') window.openModal('apply-modal'); },
  };

  // Called after a confirmed signed-in session (js/auth.js). If the guest was on a
  // different URL when they hit the gate, return them there; otherwise re-open the
  // action inline. Mode A: no form input is preserved (that is the future Mode B).
  function resumeGuestIntent() {
    const intent = takePendingIntent();
    if (!intent || !intent.action) return;
    if (intent.targetUrl && intent.targetUrl !== window.location.href) {
      // Re-store so the destination page's load can pick it up, then navigate.
      setPendingIntent(intent);
      window.location.href = intent.targetUrl;
      return;
    }
    const handler = RESUME_HANDLERS[intent.action];
    if (typeof handler === 'function') handler();
  }
```

> RSVP/offer/message resume: after the redirect the guest lands back on the item detail page signed in; the register/offer panel now renders the member state directly (no modal to auto-open), so returning them to `targetUrl` is the resume. Only `apply-opportunity` needs an explicit modal re-open, handled above.

- [ ] **Step 3: Call both in `syncSupabaseSession` success path**

In `app/apps/glowe-web/js/auth.js`, in `syncSupabaseSession()`, the branch after a non-null `supabaseUser` currently does: fetchProfile → set gloweUser → updateAuthUI → maybeShowGloweOnboarding. Insert the auto-register before fetchProfile, and the resume after the onboarding invite:

Replace:

```js
    let profile = null;
    try {
        profile = await window.gloweBackend.fetchProfile();
    } catch (error) {
        profile = null;
    }
```

with:

```js
    // FR-GLOWE-023 — register the member from Google on first sign-in.
    if (typeof window.gloweBackend.ensureProfileFromGoogle === 'function') {
        try { await window.gloweBackend.ensureProfileFromGoogle(supabaseUser); } catch (e) { /* non-fatal */ }
    }

    let profile = null;
    try {
        profile = await window.gloweBackend.fetchProfile();
    } catch (error) {
        profile = null;
    }
```

And after the existing `maybeShowGloweOnboarding` block near the end of the function, add:

```js
    // FR-GLOWE-023 — finish the action the guest attempted before signing in.
    if (window.GloweGuest && typeof window.GloweGuest.resumeGuestIntent === 'function') {
        window.GloweGuest.resumeGuestIntent();
    }
```

- [ ] **Step 4: Remove the now-dead `redirectPendingOpportunity` write path (optional cleanup)**

`handleLogin`/`handleRegister` still reference `pendingOpportunityApplication`. Leave those (they are the email/password fallback, unused in Google-only mode). Do NOT delete `redirectPendingOpportunity` — it is called elsewhere; leaving it is harmless. No change required in this step; noted so the engineer does not chase it.

- [ ] **Step 5: Commit**

```bash
git add app/apps/glowe-web/js/backend.js app/apps/glowe-web/js/glowe-guest.js app/apps/glowe-web/js/auth.js
git commit -m "feat(glowe): auto-register from Google + resume attempted action (FR-GLOWE-023)"
```

---

## Task 6: One-time guest welcome toast

**Files:**
- Modify: `app/apps/glowe-web/js/auth.js` (DOMContentLoaded init)

- [ ] **Step 1: Add the toast helper + call**

In `app/apps/glowe-web/js/auth.js`, add a helper and call it from the existing `DOMContentLoaded` listener (only for signed-out visitors, once per browser):

```js
// FR-GLOWE-023 — greet first-time guests once, then never again.
const GLOWE_GUEST_WELCOMED_KEY = 'glowe-guest-welcomed';
function maybeShowGuestWelcome() {
    if (isLoggedIn()) return;
    if (localStorage.getItem(GLOWE_GUEST_WELCOMED_KEY) === '1') return;
    localStorage.setItem(GLOWE_GUEST_WELCOMED_KEY, '1');
    const msg = "Welcome — you're browsing as a guest. Sign in with Google anytime to participate.";
    if (typeof window.showSuccessModal === 'function') {
        window.showSuccessModal('Welcome to GloWe', msg);
    }
}
```

In the `document.addEventListener('DOMContentLoaded', ...)` body (bottom of auth.js), add after `updateAuthUI();`:

```js
    maybeShowGuestWelcome();
```

- [ ] **Step 2: Commit**

```bash
git add app/apps/glowe-web/js/auth.js
git commit -m "feat(glowe): one-time guest welcome toast (FR-GLOWE-023)"
```

---

## Task 7: SSOT updates

**Files:**
- Modify: `docs/SSOT/spec/17_glowe_frontend.md`
- Modify: `docs/SSOT/BACKLOG.md`
- Modify: `docs/SSOT/DECISIONS.md`

- [ ] **Step 1: Add FR-GLOWE-023 to the spec**

Append a new section after the last FR in `docs/SSOT/spec/17_glowe_frontend.md`:

```markdown
## FR-GLOWE-023 — Guest peek & contextual join

**Status.** ✅ Done — action-tailored join prompts, Google auto-register, resume-after-join.

Guests browse read-only (no entry gate). Any identity-required action opens a
single modal whose copy is tailored to the attempted action (registry in
`js/glowe-guest.js`), with a single **Continue with Google** CTA. On first Google
sign-in a minimal `glowe_profiles` row is created from the Google identity
(`backend.ensureProfileFromGoogle`), and the attempted action resumes
(`resumeGuestIntent`). A one-time welcome toast greets first-time guests.

**Acceptance Criteria.**
- AC1. `requireMemberForAction(actionKey, ctx, proceed)` (js/glowe-guest.js) runs the
  action for members and otherwise opens the contextual join modal; it replaces the
  scattered `openModal('login-modal')` gates for apply / RSVP / message and the
  `canCreateContent()` anon branch.
- AC2. The join modal copy is looked up from `GLOWE_JOIN_ACTIONS` and interpolates
  `{org}`/`{title}`; unknown keys fall back to generic copy (unit-tested:
  `js/__tests__/glowe-guest.test.js`).
- AC3. The single CTA is **Continue with Google** (Google-only auth, FR-GLOWE-001 AC2a).
- AC4. Guest intent (`{action, targetUrl}`) is persisted before the OAuth redirect and
  replayed by `resumeGuestIntent()` from `syncSupabaseSession()` after sign-in.
- AC5. `ensureProfileFromGoogle(user)` upserts a minimal profile (id, name, email,
  avatar) on first sign-in without setting `account_type`/`onboarding_complete`, so
  FR-GLOWE-002 onboarding still enriches non-blockingly.
- AC6. A one-time `glowe-guest-welcomed` localStorage flag shows a welcome toast to
  signed-out first-time visitors only.
- AC7. **Mode B (progressive disclosure)** is explicitly out of scope and must not be
  built without an explicit PM instruction (DECISIONS D-<n>).
```

Also update the file's top `> **Status:**` line to mention FR-GLOWE-023.

- [ ] **Step 2: BACKLOG entry**

In `docs/SSOT/BACKLOG.md`, add a row for FR-GLOWE-023 marked `✅ Done` (FE lane), plus a `⏳ Planned` P2 row: "FR-GLOWE-023 Mode B (progressive disclosure) — blocked on explicit PM go-ahead."

- [ ] **Step 3: DECISIONS entry**

In `docs/SSOT/DECISIONS.md`, append a new `D-<next>` entry: "GloWe guest conversion ships Mode A (instant contextual prompt) now; Mode B (let the guest fill the form, wall at submit, preserve input) is a deferred optimization that must not be implemented without an explicit PM instruction. Rationale: instant is the lower-risk baseline; progressive is a measured conversion optimization."

- [ ] **Step 4: Commit**

```bash
git add docs/SSOT/spec/17_glowe_frontend.md docs/SSOT/BACKLOG.md docs/SSOT/DECISIONS.md
git commit -m "docs(ssot): record FR-GLOWE-023 guest peek + contextual join"
```

---

## Task 8: Verify + PR

- [ ] **Step 1: Run the GloWe unit tests**

Run: `cd app/apps/glowe-web && NODE_OPTIONS=--experimental-require-module npx vitest run`
Expected: all tests PASS (including new `glowe-guest.test.js`).

- [ ] **Step 2: Repo gates from `app/`**

Run: `cd app && pnpm typecheck && pnpm test && pnpm lint`
Expected: green. (GloWe ships only `.js/.html/.css`; the arch/300-line caps do not apply — FR-GLOWE-001 AC6.) If the worktree is a fresh checkout, run `pnpm install` first and copy `.env` per repo setup.

- [ ] **Step 3: Browser verification (signed-out)**

Serve GloWe (`cd app/apps/glowe-web && npx serve . --listen 4321`) or use the preview tools. As a signed-out guest, verify:
- Welcome toast shows once on first load; reload → does not show again.
- Click "Post a Need", "Apply", event "Save your spot", "Message" → each opens the join modal with action-specific copy and a single "Continue with Google" button.
- "Maybe later" closes the modal and leaves the page usable.
- Hebrew: switch language → modal strings render in Hebrew.
- Capture a screenshot of one contextual modal for the PR.

> Full Google OAuth round-trip (auto-register + resume) requires real Google auth; verify the intent is written to `sessionStorage['glowe-pending-intent']` on CTA click via devtools, and confirm `ensureProfileFromGoogle`/`resumeGuestIntent` wiring by code review if live Google sign-in is unavailable in the preview.

- [ ] **Step 4: Push + open PR to `dev`**

```bash
cd app && pnpm typecheck && pnpm test && pnpm lint
git push -u origin feat/FR-GLOWE-023-guest-contextual-join
gh pr create --base dev --head "$(git branch --show-current)" \
  --title "feat(glowe): guest peek + action-tailored contextual join (FR-GLOWE-023)" \
  --body-file .github/.pr-body.md --assignee "@me"
```

PR body must include the `Mapped to spec` line (FR-GLOWE-023) and the SSOT checklist per CLAUDE.md §6.

- [ ] **Step 5: Merge**

```bash
gh pr merge --auto --squash --delete-branch
gh pr checks --watch
```

---

## Notes for the implementer
- **Do NOT build Mode B** (progressive disclosure). It is explicitly PM-gated.
- Keep new logic in `glowe-guest.js`; `app.js` edits are call-site swaps only.
- Vanilla JS, no imports in browser files — helpers are shared via `window.*`.
- User-facing strings are English source + Hebrew dict entries in `gloweDict()`; the i18n MutationObserver translates injected modal DOM automatically, but `showJoinPrompt` also calls `translateGloweTree` explicitly as a backstop.
