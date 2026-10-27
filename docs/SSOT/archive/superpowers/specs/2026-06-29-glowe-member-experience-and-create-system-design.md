# GloWe Member Experience & Unified Create — Design

**Date:** 2026-06-29
**Status:** Approved (brainstorming) → ready for implementation plan
**Spec ID:** FR-GLOWE-016
**Domain doc:** `docs/SSOT/spec/17_glowe_frontend.md`
**Council-reviewed:** 2026-06-29 (architecture / product / pragmatism / spec-quality) + chat-infra reuse research.

## 1. Goal

Turn GloWe from a marketing demo into a real logged-in member product **without rebuilding
content surfaces Phase B already specs, and without throwaway code**. A signed-in member should:

1. Stay signed in coherently — logout must fully reset identity and revert the home.
2. Land on a **personalized home** instead of the guest marketing page.
3. Create content through **one adaptive `+` entry point** whose options match their account type,
   each routing into an **existing** GloWe surface (Wishing Well, Volunteer Network, Community Feed).
4. Connect through two register semantics: **RSVP** to an event, and **"I'll help"** on a need that
   opens a 1:1 chat — reusing **KC's real shared chat backend** (`public.chats`/`public.messages`),
   not a parallel store.

The create system is a **declarative type registry** so adding a type / field / permission is one
table entry — the seam that lets the platform grow cheaply. This is the **member-experience shell**,
a layer over the existing Phase-B FRs, not a replacement (§3). Org self-registration + admin
verification is a separate workstream, already partially built (§11).

## 2. Scope

**In scope (FR-GLOWE-016):**
- **A.** Logout / session-integrity fix.
- **B.** Adaptive logged-in home: members get a **unified "what's happening" feed + a "Your activity"
  rail** (seeded by their own creates); guests keep the marketing home. (Per-segment personalization
  is deferred to Phase B real content — see §6.)
- **C.** Unified create system: the `+` FAB (phone center) / "Create" header button (desktop), the
  account-type-adaptive create menu (declarative registry), and per-type forms routing into existing
  surfaces.
- **D.** Two register semantics: Event → RSVP (→ My Applications); Need → "I'll help" → 1:1 chat on
  KC's shared chat backend (vanilla-JS adapter + thin thread UI).

**Out of scope (owned by other FRs / later):**
- Page-level read/persist wiring of each surface to Supabase — that is Phase B (FR-006/007/008). This
  FR provides the entry point + routing, reusing whatever persistence each surface currently has
  (mock/localStorage today; `glowe_*` tables when Phase B lands).
- Org self-registration flow + admin approval portal (§11).
- Media uploads on posts (text-only now; record reserves a `media` field).
- Org-side roster/management of RSVPs and need-helpers (FR-GLOWE-012 territory).
- Realtime, read receipts, block integration polish in the GloWe chat UI — backend supports them;
  GloWe UI ships text thread + send first, realtime subscribe as a fast follow.

## 3. Relationship to Phase B (the critical reconciliation)

GloWe content is **mock/localStorage today**; Phase B (FR-006…015) replaces each surface with live
`glowe_*` reads/writes. This FR must **not** invent a parallel content store. The create registry maps
every type onto an **existing surface + its eventual Supabase target**, so Phase B swaps the
persistence adapter, not the create system.

| Create type (PM taxonomy) | Account types | Existing surface | Phase-B FR | Eventual Supabase target |
|---|---|---|---|---|
| **Post** (FB-style, like+comment) | organization | Community Feed (`community.html`, `write-post.html`) | FR-GLOWE-008 | `glowe_posts` `post_type='community'` |
| **Event** (opportunity **with date+location**, RSVP) | organization | Volunteer Network (`volunteer-network.html`, `opportunity.html`) | FR-GLOWE-007 | `glowe_opportunities` (+ required `date`,`location`); RSVP → `glowe_applications` |
| **Need** (help request, "I'll help") | organization, individual | Wishing Well (`wishing-well.html`) | FR-GLOWE-006 | `glowe_posts` `post_type='wish'`; help → `glowe_offers` + chat |
| **Volunteer offer** (capability) | individual | Community Feed (as offer card) | new (small add) | `glowe_posts` **`post_type='offer'`** |
| **Chat** (Need "I'll help" thread) | both | Messages (`messages.html`) | **supersedes FR-GLOWE-014** | **reuse KC `public.chats`/`public.messages`** |

Implications:
- **Event** = an FR-007 opportunity with a date. For *this* milestone it is a client-side
  **validation profile** (date+location made required) and RSVP reuses the FR-007/FR-011 application
  flow. **Update (D-66):** the events feature now grows beyond a pure validation profile — see
  `docs/SSOT/archive/superpowers/specs/2026-06-29-glowe-event-rsvp-org-portal-design.md`. It stays **additive on
  `glowe_opportunities`/`glowe_applications` (still no new tables)**, but adds event-metadata and
  registration-lifecycle columns (migration `0211`), so an Event *is* distinguishable from a plain
  opportunity by `start_at`/`event_type`. Home/cards may still render events as opportunities; a
  dedicated events surface is delivered in later EVT slices.
- **Need** = an FR-006 wish. "I'll help" = an FR-006/FR-012 offer (upsert, honoring FR-012's
  `unique(post_id,user_id)`) **plus** opening a chat (§8.2).
- **Volunteer offer** is the one genuinely new content shape: a new `post_type='offer'` discriminator
  on `glowe_posts`. **This requires extending FR-006's `post_type` value set (and its eventual CHECK)
  from `{'wish','community'}` to include `'offer'`** — FR-006 AC must be amended, not silently assumed.
- **Chat** reuses KC's shared chat backend (§8.2). This **supersedes the outreach-post model proposed
  in FR-GLOWE-014** and aligns with the convergence vision (D-61: GloWe rides KC infra, entity-by-entity;
  chat is identity-keyed, and identity is already shared, so it converges cleanly with zero new tables).
  Record as a new `D-*` decision.

## 4. Current-state facts (verified in code)

- **Routing** (`app.js`): `resolveGlowePage(pathname)` → logical page key (extension-agnostic, dev
  clean-URL safe). Shipped (FR-GLOWE-004 AC8).
- **Auth/session** (`auth.js`): `isLoggedIn()`/`getCurrentUser()` read localStorage `gloweUser`.
  `logout()` removes `gloweUser` + legacy key, calls `updateAuthUI()` + `refreshPersonalAreaIfVisible()`,
  and redirects to `../index.html` **only** when the path contains `my-applications`. **Bug confirmed
  still live on dev.**
- **Profile** (`app.js`): `getPersonalProfile()` merges registered profile + cached
  `PERSONAL_PROFILE_KEY`. Account type = `profile.accountType` (`'organization'`|`'individual'`).
- **Write gate** (`app.js`): `gloweWriteGate()` → `{allowed, reason}` (blocks `'anon'` and
  `'org-unverified'`); `canCreateContent()` wraps it with notices. **Reused as-is.**
- **Persistence today**: `saveCommunityPost` exists; **there is no wish saver** (`handleWishSubmit`
  only opens a modal) and **`toPostRow`/`prepareTablePayload` in `backend.js` drop any `post_type`** —
  so wiring Need/Offer requires (a) a net-new wish/offer writer and (b) extending the post payload
  whitelist to carry `post_type`. Not "pure reuse"; scoped accordingly.
- **Chat (KC)**: `public.chats` (PK `chat_id`, `participant_a<participant_b`, `anchor_post_id uuid
  references public.posts(post_id)` **nullable**, `is_support_thread`) + `public.messages`
  (`kind in('user','system')`, `body` 1–2000, `status in('pending','delivered','read')`). Open = client
  insert of canonical pair (RLS `chats_insert_self`); `rpc_chat_mark_read(p_chat_id)`,
  `rpc_chat_unread_total()`, `rpc_unread_counts_for_chats(uuid,uuid[])`; realtime channels
  `chat:<id>` / `inbox:<uid>`. All `grant authenticated`. `backend.js` exposes **zero** chat today;
  `messages.html` is a placeholder.
- **Global UI**: header + 4-item bottom nav injected at runtime on every page.
- **Home** (`initFeaturedOpportunities`): one static marketing page, identical for everyone.

## 5. Part A — Logout / session integrity

**Problem.** After logout the member still saw their profile and the home did not revert. Three
distinct defects compounded: (a) `logout()` only redirected from `my-applications`, never cleared the
cached profile, and member-only pages had no signed-out guard; (b) `logout()` fired the async Supabase
`signOut()` **without awaiting it** and redirected immediately, so the session under the
`glowe-auth-v1` storageKey survived and the next page's session bridge re-mirrored the previous member
back into `gloweUser`/`glowePersonalProfile`; (c) the session bridge's signed-out branch cleared only
`gloweUser`, leaving the cached `glowePersonalProfile` — so surfaces that read `getPersonalProfile()`
(e.g. the Community sidebar) kept rendering the previous member's name even though the header showed
"Sign in".

**Design.**
1. **One identity-clear path.** A `clearGloweIdentity()` helper removes **all** identity keys
   (`gloweUser`, legacy user key, and `PERSONAL_PROFILE_KEY`). Both `logout()` and the signed-out
   branch of `syncSupabaseSession()` call it, so they can never drift. Demo/seed content keys stay.
2. **Await sign-out before nav.** `logout()` is `async`: it clears local identity, then **awaits**
   `gloweBackend.signOut()` (and drops the `glowe-auth-v1` session key as a backstop) **before**
   redirecting, so the live Supabase session can't be re-mirrored on the next load.
3. `logout()` **always** redirects to the guest home via an `inPages`-aware relative path (correct on
   local `.html` and dev clean URLs), from any page. The full navigation inherently tears down any open
   create/chat modal — no separate modal-close step needed.
4. **Session bridge re-render.** When `syncSupabaseSession()` finds no Supabase user but the page was
   rendered as logged-in (`wasLoggedIn`), it clears identity **and reloads** the page so any
   already-rendered member content (read synchronously at load, before this async bridge resolves)
   re-renders as anonymous. After the reload `gloweUser` is gone → `wasLoggedIn` is false → no loop.
   Because `logout()` clears identity *before* triggering `signOut()`, this reload never fires during an
   explicit logout (which redirects on its own).
5. **Route guard** `requireGloweMember()` at the top of the Personal Area init (`my-applications`):
   if `!isLoggedIn()` it redirects to the guest home and returns `false` so the init aborts (no stale
   body render). **Scope note:** `settings` and `messages` keep their FR-004 AC2 graceful sign-in
   prompts, and `profile` is the **public** profile view (`?id=`), so none of those are force-guarded —
   only the Personal Area is.
6. The adaptive home (Part B) keys off `isLoggedIn()` at render time → guest home renders after the
   post-logout redirect.

**Pure unit:** the `inPages`-aware home-href resolution + `resolveGlowePage`; the guard is a thin branch.

## 6. Part B — Adaptive logged-in home

**Approach.** Branch inside the home init on `isLoggedIn()`. Guests keep the existing marketing home
untouched. Members get a personalized view in the same page container — no new route, no duplicated shell.

**Why unified, not per-segment (council).** Per-segment rails filtered by `causes`/`field`/`country`
over today's handful of demo records would render mostly **empty rails** — a worse first impression than
the marketing home. So day-one ships:
- A personal hero ("Hi {first name}" + a primary **Create** CTA that opens the same menu as `+`).
- **"Your activity"** rail — the content the member created (posts/events/needs/offers). This is the
  day-one delight: *you see your own create appear instantly*.
- **One unified "What's happening on GloWe" feed** (recency-mixed across opportunities/needs/posts),
  capped, with a "See all" into each surface.
- Every empty state is a **creation CTA** ("No needs yet — post the first one →", wired to `+`), so
  emptiness becomes the primary action, never a dead zone.

**Selectors are pure and Phase-B-safe.** `(catalog, profile) → items[]` filters survive the Supabase
swap unchanged. The per-segment personalization (the account-type rails) is **deferred** to when Phase B
provides real content; the selector seam is already in place for it.

**Reuse.** Cards render through existing renderers (opportunity/post/org/wish/offer cards).

## 7. Part C — Modular create system

### 7.1 Type registry (declarative table — the modular seam)

A single **declarative** registry drives the create menu, permissions, and form fields. Persistence is a
small dispatch to each surface's saver (no per-entry closures — council YAGNI trim).

```js
// One row per content type — DATA, not behavior.
{
  id: 'event',
  label: 'Event',                       // English; Hebrew via GLOWE_TRANSLATIONS.he
  icon: '<svg…>',
  accent: '#…',
  permittedAccountTypes: ['organization'],
  surface: 'volunteer-network',         // existing destination page
  requiredFields: ['title','date','location','description'],
  optionalFields: ['audience'],
  registerSemantics: 'rsvp',            // 'rsvp' | 'help-chat' | null
}
```

`getCreateOptionsForAccount(profile)` is a **pure function** (registry + profile → option list): org →
[post, event, need]; individual → [offer, need]; anon/unknown/empty → []. A small `persistCreate(typeId,
draft)` dispatches to the right surface saver (community-post saver, opportunity saver, the net-new
wish/offer writer); `validateCreate(typeId, values)` checks `requiredFields`. Adding a type = one table
row + (if it needs a new destination) one saver — no edits across menu/permission/form call sites.

### 7.2 The content types

| id | label | account types | required fields | register | routes to |
|---|---|---|---|---|---|
| `post` | Post | organization | title, body | — | Community Feed (FR-008) |
| `event` | Event | organization | title, date, location, description | `rsvp` | Volunteer Network (FR-007) |
| `need` | Need | organization, individual | title, details | `help-chat` | Wishing Well (FR-006) |
| `offer` | Volunteer offer | individual | skills, availability, location | — | Community Feed as offer card |

Notes: **Post** text-only, likeable+commentable (`media` reserved). **Event** physical OR digital — a
**webinar link counts as `location`** (field accepts URL or place); requires date/time. **Need** by both
types; "I'll help" → offer + chat (§8.2). **Offer** is displayed, not registered-to.

### 7.3 Permission enforcement

The menu lists only types whose `permittedAccountTypes` include the member's `accountType`. Before opening
a form, `canCreateContent()` runs: anon → "Sign in to contribute"; unverified org → "Awaiting
verification"; else proceed — wiring the create system to the existing gate for free. Unknown/missing
account type → empty option list (no crash).

### 7.4 Entry points & modal

- **Phone:** a center **`+` FAB** in the bottom nav; the 4 items split 2+2 around an elevated circular
  primary button (standard Instagram-style pattern). Tap → create bottom sheet.
- **Desktop:** a **"Create"** button in the header user-menu opens the same modal (centered). Both call
  one `openCreateMenu()`.
- **Create menu:** each option = an accent-iconed row generated from the registry. Selecting → that
  type's form (modal step) → `validateCreate` → `persistCreate` → success toast + redirect to the surface
  where it appears. **No new orphan pages.**
- Forms render only that type's required+optional fields → tailored cards.

## 8. Part D — Register semantics

### 8.1 Event → RSVP
"Register" reuses the existing application flow (writes an application referencing the event), surfacing
in **My Applications** (FR-011 AC8 / FR-007 AC5). Anon → existing sign-in pending-action. Org-side roster
out of scope (FR-012).

### 8.2 Need → "I'll help" → 1:1 chat on KC's shared backend
Clicking "I'll help" on a need: (1) upserts an **offer** (FR-006/FR-012 semantics, honoring
`unique(post_id,user_id)`), and (2) opens/resumes a **chat with the publisher** on KC's real chat
backend, then navigates to the thread — mirroring KC's "message the publisher" pattern. Anon → sign-in
pending-action first.

**Reuse of KC chat (no new tables, no throwaway):**
- New `backend.js` chat adapter: `findOrCreateChat(otherUserId, anchorPostId=null)` (canonical-pair
  select-then-insert on `public.chats`, allowed by RLS `chats_insert_self`), `sendMessage(chatId, body)`
  (insert into `public.messages`), `getMessages(chatId)`, `markRead(chatId)` (`rpc_chat_mark_read`),
  `getUnreadTotal()` (`rpc_chat_unread_total`).
- **Anchor caveat:** `chats.anchor_post_id` FKs to `public.posts`, so a `glowe_posts` need id cannot be
  the anchor. Open with **`anchor_post_id = NULL`** (the FR-CHAT-006 profile-flow pattern) and **seed a
  first message** carrying the need title for context (e.g. "{need title} — אני אשמח לעזור"). **Zero
  schema change.**
- `messages.html` (`initMessagesPage`) becomes a **real thread list + thread + composer** over
  `public.chats`/`public.messages`. Text-only first; realtime subscribe (`chat:<id>`) as a fast follow.
- `buildIllHelpSeed(needTitle)` and the canonical-pair ordering are **pure**, unit-tested. Idempotency
  is provided by the canonical `unique(participant_a, participant_b)` chat row (re-clicking "I'll help"
  resumes the same chat) — no app-level dedupe key needed.

This is the chat the PM asked for, built on real shared infrastructure.

## 9. Data model

**Reused (no new store where a surface already has one):** community posts, opportunities, wishes
(once the wish writer lands), applications, `gloweUser`, `PERSONAL_PROFILE_KEY`. **Chat reuses KC
`public.chats`/`public.messages` — no GloWe chat tables.**

**New / changed, minimal:**
| item | shape / change | notes |
|---|---|---|
| volunteer offers | `glowe_posts` `post_type='offer'` (mock store today) | extends FR-006 `post_type` CHECK to add `'offer'` |
| post payload | `backend.js` `toPostRow`/whitelist must carry `post_type` | required for Need/Offer/Post discriminator |
| chat | (none — KC tables) | adapter only |

## 10. Error handling & edge cases

- All create + register actions pass through `canCreateContent()` first (anon / unverified-org notices).
- `validateCreate` blocks submission on missing required fields with inline errors; no silent saves.
- **Unknown/missing account type** → `getCreateOptionsForAccount` returns `[]`; `+` shows a friendly
  "complete your profile" notice; no crash.
- **Anon hitting RSVP or "I'll help"** → existing sign-in pending-action; the action resumes post-login.
- **Logout while a create or chat modal is open** → the full-page redirect tears the modal down; no
  separate close step.
- **"I'll help" idempotency** via the canonical unique chat row; offer write is upsert-on-conflict.
- Logout fully clears identity; member-only pages guard and redirect.
- Empty states on every home rail + the thread list, each wired to a creation CTA.
- All user-visible strings are English; Hebrew via `GLOWE_TRANSLATIONS.he` (Hebrew-source CI scan stays
  green — no inline Hebrew in source).

## 11. Relationship to the verification workstream (not built here)

Reused, not modified: `gloweWriteGate()` blocks unverified-org publishing; `admin.html`+`initAdminPage()`
exist (FR-GLOWE-003). Full org self-registration + admin approve/reject portal + "unverified = view-only"
polish is a **separate** workstream. This FR only consumes the existing gate.

## 12. Module boundaries

- **session** — `logout()`, `requireGloweMember()` (auth.js).
- **home feed** — pure selectors + member-vs-guest composition (app.js home init).
- **create registry** — the declarative table + `getCreateOptionsForAccount`, `validateCreate`,
  `persistCreate`, `openCreateMenu` (a bounded section; functions stay global for inline handlers).
- **register semantics** — event RSVP (reuses applications) + need "I'll help" (offer upsert + chat open).
- **chat** — the `backend.js` chat adapter over KC `public.chats`/`public.messages` + `initMessagesPage`
  thread UI.

The registry table is the seam: adding a type touches one row (+ optional saver), and the row names the
surface + Supabase discriminator so Phase B swaps persistence without touching the create UI.

## 13. Testing

- **Pure helpers unit-tested in node** (like `resolveGlowePage`): `getCreateOptionsForAccount`,
  `validateCreate`, home-feed selectors, the canonical-pair chat ordering, `buildIllHelpSeed`.
- **Browser verification on the local static server** (JS/HTML/CSS isn't covered by typecheck/lint): sign
  in as individual and as organization; confirm correct create options, each form's required-field
  enforcement, created content appears on its surface + home "Your activity", Event RSVP shows in My
  Applications, Need "I'll help" opens a real chat thread + a sent message persists, logout reverts to
  guest home and blocks member-only pages.

## 14. Acceptance Criteria (FR-GLOWE-016)

- **AC1 — Session integrity.** `logout()` clears all identity keys via `clearGloweIdentity()` (incl.
  `PERSONAL_PROFILE_KEY`), **awaits** the Supabase `signOut()` (clearing the `glowe-auth-v1` session) so
  it can't be re-mirrored, and redirects to the guest home from any page (the full nav tears down any
  open modal). The session bridge (`syncSupabaseSession`) clears the **same** keys on a signed-out
  session and reloads any page that was rendered as logged-in, so no surface (e.g. the Community sidebar)
  shows the previous member after sign-out or session expiry. The Personal Area (`my-applications`)
  redirects to home when signed out; `settings`/`messages` keep their FR-004 AC2 sign-in prompts and
  `profile` stays public — they are not force-guarded. The home renders the guest view post-logout.
- **AC2 — Adaptive home.** Signed-in members see, in place of the marketing home: a personal hero, a
  **"Your activity"** rail listing their own creates, and a unified **"What's happening"** feed (≤ a fixed
  cap per section, each with a "See all" link and a named creation-CTA empty state). Guests still see the
  marketing home. (Per-segment personalization is explicitly deferred to Phase B.)
- **AC3 — Adaptive create menu.** A `+` FAB (phone, center of bottom nav) and a "Create" header button
  (desktop) open one menu listing only the member's permitted types: organization → Post/Event/Need;
  individual → Volunteer-offer/Need; anon → sign-in prompt; unverified org → awaiting-verification prompt;
  unknown/missing account type → complete-profile notice (no crash).
- **AC4 — Tailored forms → existing surfaces.** Each type enforces its required fields (post: text;
  event: date + location incl. webinar link; need: details; offer: skills) and persists into the existing
  surface (Post→Community, Event→Volunteer Network, Need→Wishing Well, Offer→Community as an offer card),
  appearing in the home "Your activity" rail. No new orphan list pages.
- **AC5 — Event RSVP.** Registering for an event records an application visible in My Applications; anon is
  routed through sign-in and the RSVP resumes.
- **AC6 — Need help-chat on KC backend.** "I'll help" upserts an offer (no duplicate per
  `unique(post_id,user_id)`) and opens/resumes a 1:1 chat with the publisher on `public.chats`/
  `public.messages` (anchor null + seeded context message); `messages.html` shows a real thread list +
  thread with a working composer that persists a `messages` row; re-clicking "I'll help" resumes the same
  chat (no second thread).
- **AC7 — Modular registry.** Create options, permissions, and form fields derive from a single
  declarative content-type table; a unit test that registers a throwaway type asserts it appears in
  `getCreateOptionsForAccount` for its permitted account types **without editing any other call site**.
