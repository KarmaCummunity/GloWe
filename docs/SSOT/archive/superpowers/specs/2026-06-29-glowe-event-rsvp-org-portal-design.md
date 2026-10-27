# GloWe Events — Publishing, RSVP & Organizer Portal
> Spec date: 2026-06-29 | Status: 🟡 In progress | Author: PM brainstorm session
> Maps to **FR-GLOWE-007** (events extend opportunities) + **FR-GLOWE-012** (registration lifecycle). Decision: **D-66**.

> **⚠️ Reconciliation note (D-66, supersedes §5 separate-table sketch).**
> This feature is built as an **additive extension of the existing tables**, not as new
> `glowe_events` / `glowe_event_registrations` tables. An **Event** is a `glowe_opportunities`
> row with `start_at` set plus event-metadata columns; an **RSVP** is a `glowe_applications`
> row plus registration columns. The rich behaviors below (open/gated approval, capacity/waitlist,
> organizer portal, link-reveal timing) are delivered **incrementally** on those two tables.
> Where the prose below says "`glowe_events` row" read "opportunity (event) row"; where it says
> "`glowe_event_registrations` row" read "`glowe_applications` row". **Status vocabulary** uses the
> DB set on `glowe_applications.status`: `Pending` (≈ the prose's *pending*), `Accepted` (*approved*),
> `Declined` (*rejected*), `Waitlisted`, `Cancelled`. Schema foundation: migration `0211`. The
> canonical, additive data model is in **§5** as rewritten below.

---

## 1. Overview

Approved organizations can create events (physical or digital) and configure how attendees register and receive event details. Individuals browse and register for events. Each organization gets a self-service **mini organizer portal** — scoped to their own content — mirroring the KC super-admin portal but limited to their events and registrations.

This feature introduces the **Event** content type to GloWe alongside Post (FR-GLOWE-008) and Need/Wishing Well (FR-GLOWE-006).

---

## 2. Actors

| Actor | Precondition | Capabilities |
|-------|-------------|--------------|
| Approved organization | `glowe_profiles.approval_status = 'approved'` AND `account_type = 'organization'` | Create / edit / cancel events; review registrants; approve / reject (gated mode); send messages |
| Individual | `glowe_profiles.account_type = 'individual'` OR any authenticated user | Browse events; register; cancel own registration; view "My Events" |
| Anonymous visitor | Not authenticated | Browse and view events (read-only); prompted to sign in on register attempt |

---

## 3. Phase Split

| Phase | Scope |
|-------|-------|
| **Phase 1** | Event creation, open + gated registration, fixed registration fields, 1:1 KC chat for post-approval communication, My Events for individuals, Org mini-portal (event list, registrant management, approve/reject, event cancellation) |
| **Phase 2** | Group channels (announcement + discussion modes), custom org-defined registration questions, waitlist UI, digital-link reveal timing control |

All ACs below are Phase 1 unless explicitly tagged **[Phase 2]**.

---

## 4. Functional Requirements

### FR-GLOWE-007-A — Event creation

**Who:** Approved organizations only (blocked by existing `canCreateContent()` gate, FR-GLOWE-003 AC5).

**Acceptance Criteria:**

- **AC1. Create form fields**
  - Required: title (≤ 120 chars), description (≤ 2000 chars), event type (`physical` | `digital`), start date + time, end date + time (end ≥ start).
  - Physical-only: location address (free text, ≤ 300 chars).
  - Digital-only: event link (URL, ≤ 500 chars); link visibility toggle: `immediate` (link shown to approved registrants as soon as they are approved) | `before_event` (link shown only N hours before start — org sets N: 1 / 2 / 6 / 24).
  - Optional for both: cover image (Supabase Storage, same upload pattern as `glowe_profiles` avatar), capacity limit (positive integer; absent = unlimited).

- **AC2. Registration settings** — org configures per event:
  - Registration mode: `open` (RSVP is instant-approved) | `gated` (org manually approves each registrant).
  - Registration form fields: org enables any combination of `email` (pre-filled from profile, editable) | `phone` | `free_comment`. Name is always included from `glowe_profiles.display_name` (read-only on form, not a configurable field).
  - **[Phase 2]** Communication mode: `one_to_one` (default) | `group_announcement` | `group_discussion`. Phase 1 delivers `one_to_one` only; the column is stored but not exposed in UI.

- **AC3. Persistence** — on submit, a new `glowe_events` row is created with `status = 'published'`. The form is validated client-side before write; server-side CHECK constraints enforce `event_type IN ('physical','digital')`, `registration_mode IN ('open','gated')`, and `end_at > start_at`.

- **AC4. Edit event** — the org can edit any field of an unpast event from the organizer portal. Changing `registration_mode` from `open` → `gated` after registrations exist is allowed; existing `approved` registrations remain approved. Changing `gated` → `open` auto-approves all `pending` registrations.

- **AC5. View-only enforcement** — an unapproved org or anonymous visitor who reaches the create-event path sees the existing view-only notice (FR-GLOWE-003 AC5) and cannot submit.

---

### FR-GLOWE-007-B — Event discovery

**Who:** Any visitor.

- **AC1.** A new `pages/events.html` page lists published, non-cancelled events ordered by `start_at ASC` (soonest first). Paginated (20 per page).
- **AC2.** Each card shows: cover image (or placeholder), title, org name + avatar, event type badge (physical / digital), date, location or "Online", registration mode badge (open / gated), capacity status (`X / Y spots` or `Unlimited`).
- **AC3.** Filters: event type (physical / digital), registration mode (open / gated), date range (this week / this month / all).
- **AC4.** Clicking a card opens the event detail page (`pages/event.html?id=<uuid>`).
- **AC5.** Event detail page shows all creation-form data plus: registrant count (for open events) or "Registration by approval" (for gated), the organizer's profile snippet (name + avatar → links to their profile), and a **Register** CTA (sign-in gated for anonymous visitors).
- **AC6.** Past events (`end_at < now()`) and cancelled events (`status = 'cancelled'`) are excluded from the listing but remain accessible at their direct URL.

---

### FR-GLOWE-007-C — Registration flow (individual)

- **AC1. Open mode** — individual clicks Register, sees the registration form (name read-only, enabled fields per org config), submits → `glowe_event_registrations` row created with `status = 'approved'`. Confirmation shown inline; event card updates to show their registration status.
- **AC2. Gated mode** — same flow, but row created with `status = 'pending'`. Individual sees "Your registration is pending review by the organizer."
- **AC3. Duplicate prevention** — if the user already has a row for this event (any status), the Register button is replaced by their current status indicator. Re-registration after rejection is allowed (creates a new `pending` row; previous row is archived with `status = 'rejected_archived'`).
- **AC4. Capacity enforcement** — when `capacity` is set and approved-registrant count equals capacity:
  - Open mode: new registrant is placed on the waitlist (`status = 'waitlisted'`, `waitlist_position` column set).
  - Gated mode: registrant enters `pending`; if approved while at capacity, they go to `waitlisted`.
  - Waitlist is FIFO. When an approved registrant cancels, the first `waitlisted` row auto-advances to `approved` and is notified (a passive in-page indicator on next visit; push/email out of scope Phase 1).
- **AC5. Registration form** — displayed fields: display name (read-only), email (pre-filled, editable if enabled), phone (if enabled), free comment (if enabled). All enabled fields except name are optional unless the org marks them required (Phase 1: all enabled non-name fields are optional).
- **AC6. Cancellation** — any individual can cancel their own registration from "My Events" while `status IN ('approved', 'pending', 'waitlisted')`. Row moves to `status = 'cancelled'`. Waitlist advances automatically if applicable.

---

### FR-GLOWE-007-D — Post-approval communication (Phase 1: 1:1 KC chat)

- **AC1.** When an org approves a gated registrant (FR-GLOWE-007-E AC2), the system opens (or finds existing) a 1:1 KC chat between the org's `auth.uid()` and the registrant's `auth.uid()` using the existing `rpc_find_or_create_chat` RPC, with `anchor_post_id = NULL` (profile-chat pattern, per DECISIONS.md D-61 chat reuse note).
- **AC2.** A system seed message is sent from the org to the chat: `"ברוך/ברוכה הבא/ה לאירוע «{event title}»! נשמח לשתף אתך בפרטים."` This seeds the thread without requiring the org to type manually. The org can then send additional messages (link, instructions, etc.) via KC's existing chat UI.
- **AC3.** For open-mode events, no chat is opened automatically on registration. The org can initiate 1:1 chat from the registrant list in the organizer portal.
- **AC4. Digital link delivery** — for digital events with `link_visibility = 'immediate'`, the system seed message (AC2) includes the event link. For `link_visibility = 'before_event'`, the link is NOT in the seed message; the org is responsible for sending it manually or via a scheduled message (out of scope Phase 1 — the org gets a reminder in the portal: "Remember to share the event link {N}h before the event").
- **AC5. [Phase 2] Group channels** — when `communication_mode` is `group_announcement` or `group_discussion`, a `glowe_event_channels` row is created on event publish. On approval (or on open-RSVP), the registrant is added to `glowe_event_channel_members`. The org sends to the channel from the organizer portal. In `group_announcement` mode, only the org can post; in `group_discussion`, all members can.

---

### FR-GLOWE-007-E — Organizer portal — event management

**Who:** The org that created the event (RLS: `glowe_events.org_profile_id = auth.uid()`'s profile id).

The mini organizer portal is a new section inside the org's Personal Area / profile, accessible via a "Manage Events" tab (web only, Phase 1).

- **AC1. Event list** — shows all events created by this org, grouped by status: Upcoming (`start_at > now()`) / Ongoing / Past / Cancelled. Each row: title, date, registration mode, registrant count (approved only), capacity status.
- **AC2. Registrant management** — clicking an event opens a registrant table showing: registrant display name, account type, submission date, form responses (email / phone / comment), current status badge.
  - Gated mode: **Approve** and **Reject** action buttons per `pending` row.
  - All modes: **Message** button opens 1:1 KC chat with that registrant.
  - Sortable by submission date (default) and status.
  - Exportable to CSV (Phase 2).
- **AC3. Approve action** — sets `status = 'approved'`, timestamps `decided_at`, triggers AC1-AC4 of FR-GLOWE-007-D (chat seed). If at capacity, auto-routes to `waitlisted` instead (AC4 of FR-GLOWE-007-C applies).
- **AC4. Reject action** — org must provide a rejection reason (free text, ≤ 500 chars, required). Sets `status = 'rejected'`, stores reason in `glowe_event_registrations.rejection_note`. A passive in-page notification is shown to the registrant on their next visit to "My Events" (push/email out of scope Phase 1).
- **AC5. Cancel event** — org clicks "Cancel Event" → confirmation dialog. Sets `glowe_events.status = 'cancelled'`. All `pending` and `approved` and `waitlisted` registrations receive a notification:
  - 1:1 mode: system message sent to each open chat thread (or a new chat seeded if none exists): `"האירוע «{event title}» בוטל. מצטערים על אי הנוחות."`.
  - **[Phase 2]** Group mode: a system message is posted to the event channel.
- **AC6. Portal access gate** — the "Manage Events" tab is only visible to approved orgs (same `canCreateContent()` guard). Unapproved orgs see a pending-approval notice.

---

### FR-GLOWE-007-F — My Events (individual)

- **AC1.** "My Events" is a tab or section in the individual's Personal Area, listing all their registrations across all events, ordered by event `start_at DESC`.
- **AC2.** Each row shows: event title (links to event detail), org name, event date, event type, registration status badge (`approved` | `pending` | `waitlisted` | `rejected` | `cancelled` [event cancelled]).
- **AC3.** For `rejected` rows, a "See reason" expand shows `rejection_note`.
- **AC4.** For `approved` rows on digital events with `link_visibility = 'immediate'`, the event link is shown inline.
- **AC5.** Cancel button available for `approved` | `pending` | `waitlisted` rows. Confirmation dialog warns that cancellation frees a waitlist spot.

---

## 5. Data Model (additive — D-66, migration `0211`)

No new tables. Events and RSVPs are additive columns on the existing
`glowe_opportunities` and `glowe_applications` tables, which keep their FR-GLOWE-007
public-read + owner-write and FR-GLOWE-012 owner-only RLS respectively.

### Event metadata on `glowe_opportunities`

```sql
alter table public.glowe_opportunities
  add column start_at          timestamptz,   -- set ⇒ this opportunity is an Event
  add column end_at            timestamptz,
  add column event_type        text,          -- 'physical' | 'digital'
  add column event_link        text,          -- digital events
  add column link_visibility   text not null default 'immediate', -- 'immediate' | 'before_event'
  add column link_reveal_hours int,           -- when link_visibility = 'before_event'
  add column capacity          int,           -- null = unlimited
  add column registration_mode text not null default 'gated',     -- 'open' | 'gated'
  add column status            text not null default 'active';     -- 'active' | 'cancelled' | 'closed'
-- CHECK: event_type ∈ {physical,digital}; link_visibility ∈ {immediate,before_event};
--        registration_mode ∈ {open,gated}; status ∈ {active,cancelled,closed};
--        capacity is null or > 0; end_at is null or start_at is null or end_at >= start_at.
```

`location` already exists (used for physical events). `org_icon`/`title`/`description`
are reused as-is. Cover image and the per-event form-field toggles / `communication_mode`
are **Phase 2** and not added yet (YAGNI — added when their UI ships).

### Registration lifecycle on `glowe_applications`

```sql
alter table public.glowe_applications
  add column submitted_email   text,
  add column submitted_phone   text,
  add column submitted_comment text,
  add column waitlist_position int,           -- server-managed (set only when Waitlisted)
  add column rejection_note    text,          -- server-managed (org on Declined)
  add column decided_at        timestamptz,   -- server-managed
  add column decided_by        uuid references auth.users(id) on delete set null;
-- status CHECK (NOT VALID): status ∈ {Pending,Accepted,Declined,Waitlisted,Cancelled}.
-- Partial unique index (opportunity_id, user_id) WHERE status not in ('Cancelled','Declined')
--   ⇒ one active RSVP per (event,user), re-RSVP allowed after Cancelled/Declined.
```

### Status guard (migration `0211`)

`glowe_applications_guard_status` — a `BEFORE INSERT/UPDATE` `SECURITY INVOKER` trigger:
- client INSERT must be `Pending` and may not set the server-managed fields;
- client UPDATE may only move `status → Cancelled` and may not touch server-managed fields;
- privileged writers (`SECURITY DEFINER` RPCs) bypass via `current_user not in ('authenticated','anon')`.

Mirrors the posts client-status guard (migration `0199`). Organizer decisions
(accept / decline + reason, capacity routing, open-mode instant-accept) run through
`SECURITY DEFINER` RPCs (later slices) that bypass the guard, so the org never writes
applicant rows directly under RLS.

### Phase 2 (schema sketch, not implemented)

```sql
-- Group channels for communication_mode != 'one_to_one' reuse KC's public.chats /
-- public.messages where possible (D-61 convergence), not a new glowe_* channel table.
-- Per-event registration form-field toggles + cover_image_url added with their UI.
```

### RLS summary (unchanged from FR-GLOWE-007 / FR-GLOWE-012)

| Table | Read | Write |
|-------|------|-------|
| `glowe_opportunities` (incl. events) | Public | Owner org only (`user_id = auth.uid()`) |
| `glowe_applications` (incl. RSVPs) | Owner-only (registrant) | Registrant insert / cancel own; organizer decisions via `SECURITY DEFINER` RPC |

Organizer reads of *other users'* RSVPs and all decisions go through `SECURITY DEFINER`
RPCs (`glowe_list_event_registrations`, `glowe_decide_event_registration` — later slices),
gated to the event owner. Pattern mirrors `glowe_set_org_approval` (FR-GLOWE-003).

---

## 6. Out of Scope (Phase 1)

- Push / email notifications for approval, rejection, waitlist advancement, or event cancellation.
- Calendar export (`.ics` / "Add to Google Calendar").
- Public attendee list (no social proof "X people are going").
- Group channels (`communication_mode != 'one_to_one'`).
- Custom registration questions.
- Digital-link auto-send N hours before event (org sends manually via chat).
- CSV export of registrant list.
- Event draft state (events are published immediately on create; a `draft` status can be added in Phase 2).
- Mobile app org portal (web only).
- Recurring events.
- Ticket pricing / paid events.

---

## 7. Open Questions (to resolve before Phase 2)

1. **Group channel persistence**: should `glowe_event_channel_messages` reuse `public.messages` (KC schema) or stay in the `glowe_*` namespace? Reusing KC infra is the convergence direction (D-61) but requires a nullable FK that doesn't break KC's RLS.
2. **Link reveal automation**: for `link_visibility = 'before_event'`, does the org want an automated send (requires a pg_cron / Edge Function) or a manual reminder + portal prompt only?
3. **Waitlist visibility**: should waitlisted registrants know their position in the queue, or just "you're on the waitlist"?
