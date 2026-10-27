# GloWe Guest Peek & Contextual Join — Design

**Date:** 2026-07-04
**Feature:** FR-GLOWE-023 — Guest peek mode + action-tailored join prompts
**Surface:** `app/apps/glowe-web` (GloWe web frontend, shared KC Supabase backend)
**Status:** ⏳ Design approved (brainstorm), pending implementation plan

---

## 1. Summary

Let anyone experience GloWe with zero friction (read-only "peek"), then convert
them to a member at the exact moment they try to *do* something — with a prompt
tailored to the action they attempted, a one-tap **Continue with Google** that
registers them automatically, and automatic completion of the original action
after sign-in.

This is a **refinement** of gating that already exists, not a greenfield build:
- Anonymous browsing is already the default (there is no login wall).
- `gloweWriteGate()` / `canCreateContent()` (FR-GLOWE-003) already block writes
  for guests + unapproved orgs, but with a **generic** notice.
- Apply / RSVP already open a plain login modal and stash `pendingOpportunity`.

We make those prompts **action-aware and consistent**, extend them to every
gated action, register the guest from Google on the spot, and resume the action.

## 2. Goals / Non-goals

**Goals**
- G1. Guests browse everything read-only, no entry gate on web (deep-link & SEO safe).
- G2. Every identity-required action, when attempted by a guest, shows one
  consistent modal whose copy is tailored to that action.
- G3. Primary (only) CTA is **Continue with Google** — GloWe auth is Google-only
  (FR-GLOWE-001 AC2a). One tap → account created → member.
- G4. The attempted action is **remembered and auto-completed** after sign-in
  (generalizing the existing `pendingOpportunity` pattern).
- G5. On first Google sign-in, a minimal `glowe_profiles` row is created from the
  Google identity so the user is a real registered member immediately.
- G6. A one-time welcome toast greets first-time guests; otherwise browsing is
  visually identical to a member's (transparent guest state).

**Non-goals (this iteration)**
- N1. **Mode B (progressive disclosure)** — letting the guest fill a form/compose
  a message and walling only at final submit. Documented as a future upgrade,
  built **only on explicit PM instruction** (see §8, D-entry).
- N2. Google One Tap / silent auto sign-in. Considered and deferred; the standard
  redirect `signInWithGoogle()` flow is used.
- N3. Any change to the org verification flow (unapproved orgs keep their existing
  "awaiting verification" notice — that is a *member* state, not a guest state).
- N4. A native-app welcome/guest screen (app is future; the web has no entry gate).

## 3. Behavior

### 3.1 Entry (web)
No blocking gate. Guest lands directly on real content. Header keeps the existing
`Continue with Google` affordance. **One-time welcome toast** on first load,
gated by a `localStorage` flag (`glowe-guest-welcomed`):
> "Welcome — you're browsing as a guest. Sign in with Google anytime to participate."
Otherwise the guest state is invisible (decision C+A).

### 3.2 Guest read scope
Allowed without an account: browse all public surfaces (organizations,
opportunities, events, needs, community feed, forums), search, filter, switch
language. Blocked (identity-required) → contextual join prompt:

| Action key            | Trigger                              | Current gate today |
|-----------------------|--------------------------------------|--------------------|
| `create-need`         | Post a Need (Wishing Well)           | `canCreateContent` generic modal |
| `create-post`         | Community post / composer            | `canCreateContent` |
| `create-opportunity`  | Post an opportunity/event            | `canCreateContent` |
| `create-thread`       | Forum / discussion thread            | `canCreateContent` |
| `create-reply`        | Forum reply                          | `canCreateContent` |
| `apply-opportunity`   | Apply to a volunteer opportunity     | plain login modal + `pendingOpportunity` |
| `rsvp-event`          | Register for an event                | "Sign in to register" button |
| `offer-help`          | "I'll help" on a need                | login-gated |
| `save-item`           | Save / bookmark                      | login-gated |
| `send-message`        | Message an organization              | login-gated |
| `open-personal-area`  | Personal Area / Settings / Messages  | `requireGloweMember` bounce |

### 3.3 Conversion moment — contextual join modal (Mode A: instant)
On a gated action, **immediately** open one modal whose title/body are looked up
from an **action registry** keyed by action key, interpolating context (org name,
event/opportunity title, need title) when available. Example copy:
- `offer-help` → "Ready to lend a hand? Sign in with Google to reach **{org}** and offer your help."
- `rsvp-event` → "Save your spot — sign in to register for **{title}**."
- `send-message` → "Start the conversation — sign in to message **{org}**."
- `save-item` → "Keep this for later — sign in to save it to your list."

Single CTA: **Continue with Google** (calls the existing `handleGoogleSignIn()`).
A secondary "Maybe later" closes the modal. No email/password (Google-only).

### 3.4 Remember-intent & resume
Before `signInWithGoogle()` redirects, the modal stores a generic pending intent
in `sessionStorage` (`glowe-pending-intent`): `{ action, targetId, targetUrl }`.
On return from the OAuth redirect, once `syncSupabaseSession()` confirms a signed-in
user, the intent is replayed: navigate to `targetUrl` if needed and re-invoke the
action (e.g. re-open the RSVP/apply/offer flow, now allowed). This subsumes the
existing `pendingOpportunityApplication` / `redirectPendingOpportunity` path,
which is refactored to route through the generic intent.

### 3.5 Auto-registration from Google
Google OAuth already auto-creates the `auth.users` identity (Supabase) and KC's
`handle_new_user` trigger creates `public.users`. What we add: in
`syncSupabaseSession()`, when `fetchProfile()` returns null (first sign-in), call a
new `backend.ensureProfileFromGoogle()` that **upserts a minimal `glowe_profiles`
row** from Google metadata (`id`, `name`, `email`, `avatar_url`). The row is
created **without** `account_type` / `onboarding_complete`, so:
- the user is a real registered member immediately (has a profile row), **and**
- the existing onboarding invite (FR-GLOWE-002) still runs to enrich the profile
  and capture individual-vs-organization — non-blocking, never in the critical path.

Registered non-org users pass `gloweWriteGate()` (`isOrg` is false), so they can
participate the moment they return from Google.

## 4. Architecture

New module **`app/apps/glowe-web/js/glowe-guest.js`** (loaded on every page,
before `app.js`), owning:
- `GLOWE_JOIN_ACTIONS` — the action-key → `{ title, body }` registry (pure data).
- `buildJoinCopy(actionKey, ctx)` — interpolates context into the registry entry
  (pure, unit-tested).
- `pendingIntent` helpers — `setPendingIntent`, `takePendingIntent` (sessionStorage).
- `showJoinPrompt(actionKey, ctx)` — renders/opens the contextual modal (reuses
  existing `openModal`/`closeModal` infra), wires the Google CTA, stores intent.
- `requireMemberForAction(actionKey, ctx, proceed)` — the single guard:
  if `isLoggedIn()` (and, for content, `gloweWriteGate().allowed`), run `proceed`;
  else `showJoinPrompt(...)` and return false.

**Integration seams (minimal-footprint edits in `app.js`):**
- `canCreateContent()` `anon` branch → `showJoinPrompt('create-<type>', ctx)`
  instead of the generic modal. `org-unverified` branch unchanged.
- The apply/RSVP/offer/save/message call sites that currently do
  `if (!isLoggedIn()) { openModal('login-modal') }` → `requireMemberForAction(...)`.
- `resumeGuestIntent()` invoked from `syncSupabaseSession()` success path (auth.js),
  replacing the bespoke `redirectPendingOpportunity()`.

**Backend (`backend.js`):** add `ensureProfileFromGoogle(user)` → upsert minimal
profile columns only (preserves any partial row); no schema/migration change
(columns already exist from `0204`/`0205`). No new RLS.

**Copy / i18n:** all new user-facing strings routed through the existing GloWe
i18n map (Hebrew keys added alongside the English source, per FR-GLOWE-005).

**File-size:** GloWe ships `.js/.html/.css`, exempt from the 300-line `.ts` cap
(FR-GLOWE-001 AC6), but the new module is kept small and focused regardless.
`app.js` is already large (existing tech debt) — we add call-site edits only, no
new logic bulk, keeping the new surface in `glowe-guest.js`.

## 5. Data flow

```
guest clicks gated action
  → requireMemberForAction(key, ctx, proceed)
      ├─ member & allowed → proceed()               (unchanged behavior)
      └─ guest → setPendingIntent({action,target})
                 showJoinPrompt(key, ctx)
                   → "Continue with Google" → handleGoogleSignIn()  (redirect)
                       → OAuth round-trip → page reload
                           → syncSupabaseSession()
                               ├─ ensureProfileFromGoogle()  (first time)
                               ├─ maybeShowGloweOnboarding()  (enrich, non-blocking)
                               └─ resumeGuestIntent() → proceed()   (action completes)
```

## 6. Error handling
- Domain-style: reuse existing GloWe alert/modal helpers; no raw stack traces to UI.
- `ensureProfileFromGoogle` failure is non-fatal — logged, user still browses;
  onboarding remains the fallback to create the profile.
- `resumeGuestIntent` for an unknown/expired action key is a no-op (intent cleared).
- Google sign-in start failure surfaces the existing friendly alert.

## 7. Testing
- **Unit (vitest, `js/__tests__/glowe-guest.test.js`):** `buildJoinCopy` returns
  correct interpolated copy per action key + falls back cleanly for unknown keys;
  `setPendingIntent`/`takePendingIntent` round-trip and single-consume;
  `requireMemberForAction` runs `proceed` when logged in, and does not when logged out.
- **Manual (browser preview, signed-out):** each gated action → correct tailored
  modal → Google CTA present; welcome toast shows once then not again; existing
  member flows unaffected.

## 8. Decisions & future work
- **D-entry (DECISIONS.md):** Mode A (instant prompt) ships now. Mode B
  (progressive disclosure — fill form, wall at submit, preserve input) is a
  planned upgrade that must **not** be implemented without an explicit PM
  instruction. Rationale: instant is the lower-risk conversion baseline; progressive
  is a measured optimization to run once we can compare conversion.
- **BACKLOG.md:** add FR-GLOWE-023 (⏳→🟡→✅) and a P2 note for the Mode B upgrade
  (blocked on PM go-ahead).

## 9. Open questions
- None blocking. Exact per-action microcopy is set at implementation discretion
  ("make it warm and specific"), mirroring FR-GLOWE-002's copy latitude.
