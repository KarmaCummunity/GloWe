# GloWe MVP — Software Requirements Specification
> Phase B: Live Content Layer | Spec date: 2026-06-29

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and non-functional requirements for GloWe Phase B ("Live Content Layer"). Phase B connects the existing GloWe static frontend to real Supabase data, replacing all placeholder/seed content in `data.js` with live reads and writes through the shared Karma Community (KC) Supabase backend.

### 1.2 Scope

GloWe ("Global Learning, Open Knowledge & Wisdom Exchange") is a static web frontend (HTML/CSS/vanilla JS, ~16 pages) residing at `app/apps/glowe-web/`. It shares the KC Supabase project (`roeefqpdbftlndzsvhfj`) and authenticates via the same `auth.users` identity. All GloWe-owned data lives in the `glowe_*` table namespace.

Phase B scope:
- Wire each page to live Supabase queries via the existing `window.gloweBackend` adapter.
- Add the four new tables required for forums and offers (`glowe_forum_groups`, `glowe_forum_threads`, `glowe_forum_replies`, `glowe_offers`).
- Enforce the `canCreateContent()` write gate on every create flow.
- Deliver volunteer application and offer-support matching flows end-to-end.
- Route direct messaging to the KC chat system (Phase B: link only, no new chat infra).
- Provide basic moderation (report flag) for user-generated content.

Out of scope for Phase B:
- Content convergence with KC native tables (`public.posts`, `public.users`). Data remains in `glowe_*`.
- Push notifications for applications, offers, or forum replies.
- Payment or donation flows.
- Mobile-app GloWe view (GloWe remains web-only).
- Phase C full convergence (KC mobile deprecated, single unified schema).

### 1.3 Definitions and Abbreviations

| Term | Meaning |
|------|---------|
| KC | Karma Community — the shared Supabase backend |
| RLS | Row-Level Security (Postgres/Supabase) |
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |
| AC | Acceptance Criterion |
| UGC | User-Generated Content |
| anon | An unauthenticated visitor (no `auth.users` session) |
| individual | `account_type='individual'`, `approval_status='not_required'` |
| org (pending) | `account_type='organization'`, `approval_status='pending'` |
| org (approved) | `account_type='organization'`, `approval_status='approved'` |
| wishing well post | A `glowe_posts` row with `post_type IN ('wish','need')` |
| content author | The `auth.uid()` who created a row; stored in `user_id` on all UGC tables |

### 1.4 Referenced Documents

- `docs/SSOT/spec/17_glowe_frontend.md` — Phase A spec (FR-GLOWE-001 through FR-GLOWE-005)
- `supabase/migrations/0204_glowe_schema.sql` — initial `glowe_*` schema
- `supabase/migrations/0205_glowe_onboarding.sql` — onboarding columns on `glowe_profiles`
- `supabase/migrations/0206_glowe_org_approval.sql` — approval RPCs
- `app/apps/glowe-web/js/backend.js` — frontend adapter (`window.gloweBackend`)
- `app/apps/glowe-web/js/data.js` — seed/demo data (to be retired by Phase B)
- `docs/SSOT/DECISIONS.md` — D-61 (GloWe convergence direction)

---

## 2. Domain Model

### Core entities and relationships

```
glowe_profiles (1) ──< glowe_projects (many)
glowe_profiles (1) ──< glowe_opportunities (many)
glowe_profiles (1) ──< glowe_posts (many)          -- community posts + wishing well
glowe_posts    (1) ──< glowe_comments (many)
glowe_posts    (1) ──< glowe_offers (many)          -- "offer support" on a wishing well post
glowe_profiles (1) ──< glowe_saved_items (many)
glowe_profiles (1) ──< glowe_applications (many)    -- volunteer applications
glowe_opportunities (1) ──< glowe_applications (many)
glowe_forum_groups  (1) ──< glowe_forum_threads (many)
glowe_forum_threads (1) ──< glowe_forum_replies (many)
glowe_profiles (1) ──< glowe_forum_threads (many)
glowe_profiles (1) ──< glowe_forum_replies (many)
```

**Identity anchor.** Every `glowe_profiles.id` equals `auth.uid()` (same KC identity). There is no separate GloWe user table.

**Post type discriminator.** `glowe_posts.post_type` distinguishes community posts from wishing well entries:
- `post_type IN ('community', 'update', 'event')` — community feed posts
- `post_type IN ('wish', 'need')` — wishing well needs

**Impact area taxonomy.** A curated closed list used as a filter dimension across opportunities, posts, and forum groups: Education, Climate, Social Justice, Tech for Good, Community Building, Health, Food Security, Knowledge Sharing, Civic Innovation, Business-Social Collaboration.

**Volunteer opportunity commitment types.** `commitment IN ('Part-time', 'Flexible', 'Project-based')`.

**Forum groups.** Four seeded groups (not user-created): Education & Knowledge, Environment & Climate Action, Health & Community Care, Rights Safety & Civic Power.

---

## 3. Functional Requirements

---

### FR-GLOWE-006 — Wishing Well (live needs board)

**Status:** ⏳ Planned

**Description.** Replace the `data.js` seed needs on the Wishing Well page with live reads from `glowe_posts` filtered to `post_type IN ('wish','need')`. Authenticated users with content rights may post new needs and offer support on existing ones.

**Acceptance Criteria.**

- AC1. On page load the Wishing Well board fetches and renders all `glowe_posts` rows where `post_type IN ('wish','need')` and `status='active'`, ordered by `created_at DESC`. Seed/demo data from `data.js` is no longer injected.
- AC2. Each need card displays: title, description, need type (one of the nine Wishing Well categories), impact area tag, author display name, author org name (if org account), date posted, and a count of offers received (`glowe_offers` count for that post).
- AC3. The filter bar (need type, impact area, keyword search) applies as client-side filters on the fetched result set. No server round-trip per filter change.
- AC4. "Share a Wish / Need" form persists a new row to `glowe_posts` with `post_type='need'`, the selected category stored in `meta->>'category'`, `status='active'`, and `user_id=auth.uid()`. The form is only rendered when `canCreateContent()` returns true; otherwise a view-only notice is shown.
- AC5. `need_type` must be one of: Volunteers Needed, Resource Request, Partnership Opportunity, Looking for Mentors, Funding Support, Knowledge Sharing, Open Call, Equipment/Space, Visibility/Media. Validated client-side; the backend does not insert invalid values (CHECK constraint on `meta->>'category'` is not required at DB level, but the client enforces it).
- AC6. After successful post the new card appears at the top of the board without a full page reload.
- AC7. An author may delete their own need (soft-delete: `status='closed'`). The card disappears from the active board immediately on the author's client.
- AC8. The "Offer Support" action on a need card (FR-GLOWE-012 AC1) is accessible from the Wishing Well board directly.

**Out of scope.** Need expiry/archival automation, admin moderation queue for needs (deferred to FR-GLOWE-015), rich-media attachments.

---

### FR-GLOWE-007 — Volunteer Network (live opportunities)

**Status:** ⏳ Planned

**Description.** Replace seed opportunities on the Volunteer Network page with live reads from `glowe_opportunities`. Approved organizations may post new opportunities; individuals may apply (FR-GLOWE-012).

**Acceptance Criteria.**

- AC1. On page load all `glowe_opportunities` rows with `status='active'` are fetched and rendered, ordered by `featured DESC, created_at DESC`. Seed data from `data.js` is retired.
- AC2. Each opportunity card renders: title, organization name, org icon URL, location, commitment, duration, field/impact area, and a truncated description. A "Featured" badge appears when `featured=true`.
- AC3. Filter controls (commitment type, field/impact area, keyword) filter the fetched set client-side without a server round-trip.
- AC4. Clicking an opportunity card opens the detail view, which displays the full description plus skills, requirements, responsibilities arrays and an "Apply" button.
- AC5. "Post Opportunity" persists a new row via `insertOwned('opportunities', payload)`. The payload must include at minimum: `title`, `organization`, `location`, `commitment`, `description`. `skills`, `requirements`, `responsibilities` default to empty arrays if omitted. The form is only reachable when `canCreateContent()` is true.
- AC6. `commitment` is validated client-side against `{Part-time, Flexible, Project-based}`. `field` must be one of the ten impact areas.
- AC7. An author may soft-delete their own opportunity (`status='closed'`). Closed opportunities do not appear on the public listing.
- AC8. The opportunity detail page shows the count of submitted applications (visible to the opportunity author only).

**Out of scope.** Organization-only restriction on posting (any approved user may post for MVP), opportunity expiry date enforcement, application status notifications.

---

### FR-GLOWE-008 — Community Feed (live posts)

**Status:** ⏳ Planned

**Description.** Replace seed community posts on the Community page with live reads from `glowe_posts` filtered to `post_type IN ('community','update','event')`. Authenticated users with content rights may create posts and comments.

**Acceptance Criteria.**

- AC1. On page load the Community feed fetches `glowe_posts` where `post_type IN ('community','update','event')` and `status='active'`, ordered by `created_at DESC`, limited to 50 rows on first load (infinite scroll or "Load more" for subsequent pages, using `range()` offset pagination).
- AC2. Each post card renders: author display name, avatar/icon, post body, post type label, impact area tag, timestamp, comment count (from `glowe_comments`), and a save/bookmark action (FR-GLOWE-013).
- AC3. The post composer persists a new `glowe_posts` row. Required fields: `body` (1–2000 chars), `post_type`. Optional: `impact_area`, `title`. `canCreateContent()` must return true; otherwise the composer is replaced by a view-only notice.
- AC4. Clicking a post opens a detail/thread view listing all `glowe_comments` for that post, ordered by `created_at ASC`.
- AC5. A comment is persisted to `glowe_comments` with `post_id`, `user_id=auth.uid()`, and `body` (1–500 chars). `canCreateContent()` is checked before inserting a comment.
- AC6. An author may soft-delete their own post or comment (`status='deleted'`). Deleted items render as "[deleted]" in thread view (placeholder text, not blank) so thread continuity is maintained. They are excluded from card listings.
- AC7. The impact area filter on the Community page filters the fetched set client-side.

**Out of scope.** Post reactions/likes, media attachments, post scheduling, hashtags.

---

### FR-GLOWE-009 — Forums and Discussions

**Status:** ⏳ Planned

**Description.** Wire the Forums page to live data in `glowe_forum_groups`, `glowe_forum_threads`, and `glowe_forum_replies`. The four groups are seeded at migration time; users create threads and replies.

**Acceptance Criteria.**

- AC1. The Forums index page fetches all `glowe_forum_groups` rows and renders each group card with: title, description, icon, tags, and the count of threads in that group.
- AC2. Clicking a group opens the group thread list, showing all `glowe_forum_threads` for that `group_id`, ordered by `updated_at DESC` (most recently active first). Each row shows: thread title, author display name, reply count, last activity timestamp.
- AC3. Clicking a thread renders the thread body and all `glowe_forum_replies` ordered by `created_at ASC`.
- AC4. "Start a Discussion" persists a new `glowe_forum_threads` row with `group_id`, `user_id=auth.uid()`, `title` (5–150 chars), `body` (10–5000 chars). `canCreateContent()` must return true.
- AC5. "Post a Reply" persists a new `glowe_forum_replies` row with `thread_id`, `user_id=auth.uid()`, `body` (1–2000 chars). `canCreateContent()` is checked.
- AC6. When a reply is inserted, `glowe_forum_threads.updated_at` is bumped to `now()` via an `AFTER INSERT` trigger on `glowe_forum_replies` so the thread rises in the group listing.
- AC7. An author may delete their own thread (cascades to replies via FK) or their own reply. A deleted thread is soft-deleted (`status='deleted'`) and hidden from the group listing; replies are hard-deleted (small volume, no continuity concern in a deleted thread).
- AC8. The four seed groups (`Education & Knowledge`, `Environment & Climate Action`, `Health & Community Care`, `Rights Safety & Civic Power`) are inserted in the Phase B migration. Group icons are stored as emoji or static asset paths in the `icon` column. Groups are not user-creatable in Phase B.

**Out of scope.** Thread pinning, thread locking, group creation by users, full-text search within forums.

---

### FR-GLOWE-010 — Organizations Directory (live listing)

**Status:** ⏳ Planned

**Description.** Replace seed organization cards on the Organizations page with live reads from `glowe_profiles` where `account_type='organization'` and `approval_status='approved'`.

**Acceptance Criteria.**

- AC1. The Organizations page fetches all approved org profiles (`account_type='organization'`, `approval_status='approved'`) and renders each card: org name, field, country, description (truncated to 200 chars), and a link to the org's public profile.
- AC2. Filter controls (field/impact area, country, keyword) filter the fetched set client-side.
- AC3. An org's public profile page renders: full description, website link, contact name, active opportunities count (from `glowe_opportunities` where `user_id=org.id` and `status='active'`), and active projects (from `glowe_projects` where `user_id=org.id`).
- AC4. Pending and rejected orgs do not appear in the public directory.
- AC5. The "Join / Follow" button on org cards is a placeholder (no follow entity in Phase B schema); it opens a contact-via-messaging prompt that routes to FR-GLOWE-014.

**Out of scope.** Organization following/subscription, org-managed member roster, org analytics.

---

### FR-GLOWE-011 — Profile Management (Phase B completion)

**Status:** ⏳ Planned

**Description.** The Personal Area (profile page) displays and allows editing of all `glowe_profiles` fields, including the projects sub-list. Phase A delivered onboarding; Phase B completes the profile CRUD loop.

**Acceptance Criteria.**

- AC1. The Personal Area page calls `fetchProfile()` on load and renders all profile fields: display name, about, country, account type, approval status badge, website (if org), and `org_*` fields for org accounts.
- AC2. "Edit Profile" opens a form pre-populated from the fetched profile. On submit, `upsertProfile(delta)` writes only the changed fields. Non-writable fields (`approval_status`, `account_type`) are not sent in the payload.
- AC3. The Projects sub-section fetches `listOwned('projects')` and renders each project: title, description, URL, impact area tag. The list is empty-state-aware ("No projects yet").
- AC4. "Add Project" inserts a new row via `insertOwned('projects', {title, description, url, impact_area})`. Title is required (1–120 chars). On success the list updates without reload.
- AC5. "Remove Project" calls `removeOwned('projects', {id: project.id})` and removes the card from the list optimistically; a failure re-inserts the card and shows an error toast.
- AC6. The public profile URL (`/pages/profile.html?id=<user_id>`) fetches the profile by ID (a public RLS read) and renders the public view (display name, about, country, projects, active opportunities). Own-account actions (Edit, Add Project) are hidden on public views.
- AC7. For an org account whose `approval_status='pending'`, the Personal Area shows a "Pending approval" notice and disables all content-create entry points consistent with FR-GLOWE-003 AC5.

**Out of scope.** Avatar/photo upload (deferred to Phase C storage integration), follower counts, profile analytics.

---

### FR-GLOWE-012 — Applications and Offers (volunteer matching)

**Status:** ⏳ Planned

**Description.** Close the volunteer matching loop: users apply to opportunities via `glowe_applications` and offer support on wishing well needs via `glowe_offers`. Opportunity authors review incoming applications.

**Acceptance Criteria.**

- AC1. **Offer Support (wishing well).** The "Offer Support" modal on a need card collects: `offerer_name` (pre-filled from profile), `offer_description` (what they can offer, 10–500 chars), `contact_info` (email or phone, required). On submit, a new `glowe_offers` row is inserted with `post_id`, `user_id=auth.uid()` (nullable for anon — see AC1a), `offerer_name`, `offer_description`, `contact_info`, `created_at`. `canCreateContent()` is required; anon visitors see a sign-in prompt.
- AC1a. Only authenticated users may submit offers. The "Offer Support" button for anon visitors opens the sign-in modal.
- AC2. The need author can view received offers via a "View Offers" panel (shown only to the row owner via RLS). Each offer row shows offerer name, description, and contact info.
- AC3. **Volunteer Application.** The "Apply" button on an opportunity detail page opens an application modal collecting: `applicant_name` (pre-filled), `applicant_email` (pre-filled from `auth.users.email`), `message` (50–1000 chars), `relevant_experience` (optional, max 500 chars). On submit, a `glowe_applications` row is inserted with `opportunity_id`, `user_id=auth.uid()`, and the above fields plus `status='pending'`.
- AC4. A user cannot submit more than one application per opportunity. If a matching row exists (`opportunity_id + user_id`), the Apply button shows "Application submitted" and is disabled.
- AC5. The opportunity author views incoming applications via an "Applications" panel on the opportunity detail page (RLS: visible only to row owner). Each application shows: applicant name, email, message, experience, submission date, and a status selector (`pending` / `reviewing` / `accepted` / `rejected`). Status updates are persisted immediately via a `PATCH`.
- AC6. Applicants can view the status of their own applications in the Personal Area under a "My Applications" section (reads `glowe_applications` where `user_id=auth.uid()`).
- AC7. `canCreateContent()` is checked before inserting any application or offer row.

**Out of scope.** Email notifications to opportunity authors or applicants, bulk application management, application withdrawal by applicant.

---

### FR-GLOWE-013 — Saved Items (live bookmarks)

**Status:** ⏳ Planned

**Description.** Wire the bookmarks/saved-items feature to live reads and writes in `glowe_saved_items`. Currently the save action writes to the table but the Saved Items page reads from `data.js`.

**Acceptance Criteria.**

- AC1. The "Save" / bookmark icon on opportunity cards, need cards, community post cards, org cards, and forum thread rows calls `insertOwned('saved_items', {item_type, item_id, title, meta, href})` when clicked by an authenticated user. `item_type` values: `'opportunity'`, `'need'`, `'post'`, `'organization'`, `'forum_thread'`.
- AC2. If a matching row already exists (`user_id + item_type + item_id`), the icon shows as "saved" (filled). Clicking again calls `removeOwned('saved_items', {item_type, item_id})` (unsave). State is optimistic; failures revert the icon.
- AC3. On page load each page fetches the user's existing saved items (`listOwned('saved_items')`) to initialize bookmark icon states. Unauthenticated visitors see no bookmark icons or see them disabled.
- AC4. The Saved Items page calls `listOwned('saved_items')` and renders all saved rows grouped by `item_type`, showing title, href link, and a "Remove" action. The page is empty-state-aware.
- AC5. Removing a saved item from the Saved Items page calls `removeOwned('saved_items', {id: row.id})` and removes the card optimistically.

**Out of scope.** Saved-item collections/folders, shared wishlists, export.

---

### FR-GLOWE-014 — Direct Messaging (Phase B: route to KC chat)

**Status:** ⏳ Planned

**Description.** Phase B does not implement a new messaging system. Instead, all "Message" CTAs route authenticated GloWe users to the KC chat interface. Unauthenticated visitors are prompted to sign in.

**Acceptance Criteria.**

- AC1. Every "Message" or "Contact" CTA in GloWe (org profile page, opportunity detail, user profile) opens the KC chat URL for the target user. The KC chat URL pattern is `<main-domain>/chat?to=<user_id>`. The target `user_id` is the `glowe_profiles.id` of the recipient, which equals the same `auth.users.id` used by KC.
- AC2. If the current user is not authenticated, clicking a Message CTA opens the GloWe sign-in modal with a post-sign-in redirect that returns to the originating page.
- AC3. The Messages placeholder page (`pages/messages.html`) introduced in FR-GLOWE-004 AC7 is updated: the "coming soon" text is replaced with a link to `<main-domain>/chat` and a brief explanation that messaging is handled through the Karma Community platform.
- AC4. No new Supabase tables or RPCs are required for this FR. No `glowe_messages` table is created in Phase B.

**Out of scope.** In-GloWe chat UI, GloWe-native DM threads, message notifications, group messaging.

---

### FR-GLOWE-015 — Moderation and Reporting

**Status:** ⏳ Planned

**Description.** Users may flag UGC for review. Flagged items are surfaced in the GloWe Admin page for KC moderators to review and take action (hide or dismiss). Basic auto-hiding applies after a threshold of flags.

**Acceptance Criteria.**

- AC1. A "Report" action (three-dot menu or flag icon) is available on: community posts, wishing well needs, opportunity listings, forum threads, forum replies, and comments. The action is shown only to authenticated users who are not the content author.
- AC2. Clicking "Report" opens a modal with a required reason selector: `Spam`, `Harassment`, `Misinformation`, `Inappropriate content`, `Other`. An optional free-text field (max 300 chars) is included.
- AC3. Submitting a report inserts a row into a new `glowe_reports` table: `reporter_id` (auth.uid()), `target_type` (table name string), `target_id` (UUID of the reported row), `reason` (enum), `note` (text), `created_at`, `status` (default `'open'`). Duplicate reports by the same user on the same target are silently ignored (ON CONFLICT DO NOTHING).
- AC4. Content with 5 or more distinct-reporter open reports is automatically soft-hidden: a DB trigger or RPC sets `status='hidden'` on the target row. Hidden content renders as "[Content under review]" placeholder text, not blank. The author is not notified in Phase B.
- AC5. The GloWe Admin page lists open reports grouped by target, showing: target type, a preview of the content, reporter count, and the most recent reason. Moderators (KC `super_admin` or `moderator` role) may: Dismiss (close all reports for target, content remains visible), or Hide (set target `status='hidden'`, close all reports). Both actions are gated by the same role check as `glowe_set_org_approval` (FR-GLOWE-003 AC1).
- AC6. A `glowe_moderate_content(p_target_type, p_target_id, p_action)` SECURITY DEFINER RPC implements AC5 actions. `p_action IN ('hide','dismiss')`. Non-moderators receive `42501`.
- AC7. RLS on `glowe_reports`: `INSERT` to authenticated users; `SELECT`/`UPDATE` to reviewers only (same role check).

**Out of scope.** Appeal process for hidden content, automated ML-based flagging, user strike/ban system (deferred to KC core moderation), report history visible to reporter.

---

## 4. Non-Functional Requirements

### NFR-GLOWE-001 — Performance

- NFR-GLOWE-001-1. Initial page data load (first Supabase query per page) must complete within 2 seconds on a 10 Mbps connection for datasets up to 200 rows.
- NFR-GLOWE-001-2. All list pages (Wishing Well, Volunteer Network, Community, Forums) fetch a maximum of 50 rows on first load. Subsequent pages use `range()` offset pagination in increments of 25.
- NFR-GLOWE-001-3. Client-side filters (impact area, commitment, keyword) must respond within 100 ms with up to 200 rows in memory (no debounce required below 200 rows; add 300 ms debounce for keyword input regardless).
- NFR-GLOWE-001-4. Write operations (insert, update) must optimistically update the UI before the Supabase call resolves. On error, the UI reverts and an error toast is shown within 500 ms of the failure.
- NFR-GLOWE-001-5. No Supabase query may select `*` on a table with more than 10 columns; always specify the column list to minimize payload.

### NFR-GLOWE-002 — Security and RLS

- NFR-GLOWE-002-1. All new `glowe_*` tables must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and at minimum a deny-all default (no `ALTER TABLE ... FORCE ROW LEVEL SECURITY` bypass for table owner).
- NFR-GLOWE-002-2. Public catalog tables (`glowe_forum_groups`, `glowe_forum_threads`, `glowe_forum_replies`) are readable by `anon` and `authenticated`; write is restricted to `authenticated` with author-ownership checks.
- NFR-GLOWE-002-3. Sensitive tables (`glowe_applications`, `glowe_offers`, `glowe_reports`) are not readable by `anon`. Application and offer reads are restricted to: the row author, or the owner of the target opportunity/post.
- NFR-GLOWE-002-4. All SECURITY DEFINER RPCs must `REVOKE EXECUTE FROM PUBLIC` and `GRANT EXECUTE TO authenticated` (or a narrower role) immediately after creation. No RPC is callable by `anon` unless explicitly required and justified in the migration comment.
- NFR-GLOWE-002-5. `canCreateContent()` in `backend.js` checks both `auth.uid() != null` and `approval_status != 'pending'` before any write. This check is a defense-in-depth client guard; RLS policies are the authoritative enforcement layer.
- NFR-GLOWE-002-6. No user may write to `approval_status` outside of `{not_required, pending}` via direct table mutation (enforced by existing `glowe_profiles_guard_approval` trigger from migration 0205).
- NFR-GLOWE-002-7. The `glowe_supabase_anonkey` (publishable) is the only credential in frontend code. No service role key may appear in `app/apps/glowe-web/**`.

### NFR-GLOWE-003 — Accessibility and i18n

- NFR-GLOWE-003-1. All new UI elements introduced in Phase B must carry appropriate `aria-label` or `aria-labelledby` attributes and be keyboard-navigable (tab order, Enter/Space activation on interactive elements).
- NFR-GLOWE-003-2. All new user-visible English strings introduced in Phase B must be added to `GLOWE_TRANSLATIONS.he` in `js/app.js` with Hebrew translations before the feature ships, so the Hebrew/RTL experience (FR-GLOWE-005) remains complete.
- NFR-GLOWE-003-3. All new date values rendered in the UI must use `Intl.DateTimeFormat` with the current locale (`en` or `he`) rather than raw `toISOString()` output.
- NFR-GLOWE-003-4. Error messages displayed to users must be in the current interface language. Raw Supabase/Postgres error codes or stack traces must never reach the UI.

### NFR-GLOWE-004 — Availability and Deployment

- NFR-GLOWE-004-1. Phase B ships as zero or more additional Supabase migrations (numbered sequentially after `0206`) plus changes to `app/apps/glowe-web/js/`. No new npm packages may be introduced; GloWe is dependency-free (vanilla JS).
- NFR-GLOWE-004-2. Each migration must be backward-compatible with the existing frontend during the deploy window (additive columns, new tables). No destructive SQL (`DROP TABLE`, `DROP COLUMN`) targeting existing `glowe_*` tables without a `migration-safety: allow` justification.
- NFR-GLOWE-004-3. The GloWe static files continue to be built into `dist/glowe/` by `web-postbuild.mjs` and deployed on the same Cloudflare Pages project as the KC web app. No separate deployment pipeline is required for Phase B.
- NFR-GLOWE-004-4. `pnpm typecheck && pnpm test && pnpm lint` (from `app/`) must remain green after all Phase B changes. GloWe JS is excluded from the TypeScript checker (it is plain JS), but the monorepo lint rules apply to any tooling scripts.

---

## 5. Data Model (Phase B additions)

### 5.1 glowe_forum_groups

Seeded at migration time; not user-creatable.

```sql
CREATE TABLE glowe_forum_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text NOT NULL,
  tags        text[] NOT NULL DEFAULT '{}',
  icon        text,                        -- emoji or static path
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE glowe_forum_groups ENABLE ROW LEVEL SECURITY;

-- Public read; no user writes.
CREATE POLICY "public read forum groups"
  ON glowe_forum_groups FOR SELECT TO anon, authenticated USING (true);
```

Seed rows (inserted in same migration):
- `Education & Knowledge` | tags: `['education','learning','knowledge']`
- `Environment & Climate Action` | tags: `['climate','environment','sustainability']`
- `Health & Community Care` | tags: `['health','community','care']`
- `Rights Safety & Civic Power` | tags: `['rights','civic','safety']`

### 5.2 glowe_forum_threads

```sql
CREATE TABLE glowe_forum_threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES glowe_forum_groups(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 150),
  body        text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 5000),
  status      text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','deleted')),
  reply_count int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE glowe_forum_threads ENABLE ROW LEVEL SECURITY;

-- Public read for active threads only.
CREATE POLICY "public read active threads"
  ON glowe_forum_threads FOR SELECT TO anon, authenticated
  USING (status = 'active');

-- Authenticated users insert their own threads.
CREATE POLICY "auth insert thread"
  ON glowe_forum_threads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Author soft-delete only.
CREATE POLICY "author delete thread"
  ON glowe_forum_threads FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (status = 'deleted');
```

Trigger: on `glowe_forum_replies` INSERT, increment `reply_count` and set `updated_at=now()` on the parent `glowe_forum_threads` row.

### 5.3 glowe_forum_replies

```sql
CREATE TABLE glowe_forum_replies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid NOT NULL REFERENCES glowe_forum_threads(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE glowe_forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read replies"
  ON glowe_forum_replies FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "auth insert reply"
  ON glowe_forum_replies FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Author hard-delete.
CREATE POLICY "author delete reply"
  ON glowe_forum_replies FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

### 5.4 glowe_offers

```sql
CREATE TABLE glowe_offers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id          uuid NOT NULL REFERENCES glowe_posts(id) ON DELETE CASCADE,
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  offerer_name     text NOT NULL CHECK (char_length(offerer_name) BETWEEN 1 AND 120),
  offer_description text NOT NULL CHECK (char_length(offer_description) BETWEEN 10 AND 500),
  contact_info     text NOT NULL CHECK (char_length(contact_info) BETWEEN 1 AND 200),
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE glowe_offers ENABLE ROW LEVEL SECURITY;

-- Post author reads incoming offers on their post.
CREATE POLICY "post author reads offers"
  ON glowe_offers FOR SELECT TO authenticated
  USING (
    post_id IN (
      SELECT id FROM glowe_posts WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Authenticated users insert an offer.
CREATE POLICY "auth insert offer"
  ON glowe_offers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
```

### 5.5 glowe_reports

```sql
CREATE TYPE glowe_report_reason AS ENUM (
  'Spam', 'Harassment', 'Misinformation', 'Inappropriate content', 'Other'
);

CREATE TABLE glowe_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL,   -- 'glowe_posts' | 'glowe_opportunities' | 'glowe_comments' |
                               -- 'glowe_forum_threads' | 'glowe_forum_replies'
  target_id   uuid NOT NULL,
  reason      glowe_report_reason NOT NULL,
  note        text CHECK (note IS NULL OR char_length(note) <= 300),
  status      text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','dismissed','actioned')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, target_type, target_id)
);

ALTER TABLE glowe_reports ENABLE ROW LEVEL SECURITY;

-- Reporters insert; no self-read.
CREATE POLICY "auth insert report"
  ON glowe_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Moderators read and update.
CREATE POLICY "moderator manage reports"
  ON glowe_reports FOR ALL TO authenticated
  USING (admin_assert_role(auth.uid(), ARRAY['super_admin','moderator']));
```

Auto-hide trigger: after INSERT on `glowe_reports`, if `COUNT(DISTINCT reporter_id) >= 5` for the same `(target_type, target_id)` with `status='open'`, execute a dynamic `UPDATE <target_type> SET status='hidden' WHERE id = target_id`.

---

## 6. API and RPC Contracts

### 6.1 New backend.js functions

The following functions are to be added to `window.gloweBackend` in `app/apps/glowe-web/js/backend.js`:

```
// Wishing Well
listNeeds(filters)           -- SELECT from glowe_posts where post_type IN ('wish','need')
createNeed(payload)          -- INSERT into glowe_posts
closeNeed(id)                -- UPDATE glowe_posts SET status='closed' WHERE id AND user_id=auth.uid()

// Opportunities
listOpportunities(filters)   -- SELECT from glowe_opportunities
createOpportunity(payload)   -- INSERT into glowe_opportunities
closeOpportunity(id)         -- UPDATE glowe_opportunities SET status='closed'

// Community feed
listPosts(filters)           -- SELECT from glowe_posts where post_type IN ('community','update','event')
createPost(payload)          -- INSERT into glowe_posts
listComments(postId)         -- SELECT from glowe_comments WHERE post_id
createComment(postId, body)  -- INSERT into glowe_comments
softDeletePost(id)           -- UPDATE glowe_posts SET status='deleted'
softDeleteComment(id)        -- UPDATE glowe_comments SET status='deleted'

// Forums
listForumGroups()            -- SELECT from glowe_forum_groups
listThreads(groupId)         -- SELECT from glowe_forum_threads WHERE group_id
getThread(threadId)          -- SELECT thread + replies
createThread(groupId, payload) -- INSERT into glowe_forum_threads
createReply(threadId, body)    -- INSERT into glowe_forum_replies
deleteThread(id)               -- UPDATE glowe_forum_threads SET status='deleted'
deleteReply(id)                -- DELETE from glowe_forum_replies

// Offers
createOffer(postId, payload)   -- INSERT into glowe_offers
listOffersForPost(postId)      -- SELECT from glowe_offers WHERE post_id (author-gated by RLS)

// Applications
applyToOpportunity(oppId, payload)    -- INSERT into glowe_applications
getMyApplications()                   -- SELECT from glowe_applications WHERE user_id=auth.uid()
listApplicationsForOpportunity(oppId) -- SELECT from glowe_applications WHERE opportunity_id (author-gated)
updateApplicationStatus(appId, status) -- UPDATE glowe_applications SET status

// Saved items (existing, confirm signature)
saveItem(item_type, item_id, title, meta, href) -- INSERT into glowe_saved_items
unsaveItem(item_type, item_id)                  -- DELETE from glowe_saved_items
listSavedItems()                                -- SELECT from glowe_saved_items WHERE user_id

// Reporting
reportContent(target_type, target_id, reason, note) -- INSERT into glowe_reports
```

### 6.2 New Supabase RPCs

| RPC | Type | Args | Returns | Role gate |
|-----|------|------|---------|-----------|
| `glowe_moderate_content` | SECURITY DEFINER | `p_target_type text, p_target_id uuid, p_action text` | `void` | `super_admin` or `moderator` |
| `glowe_get_offer_count` | SECURITY INVOKER | `p_post_id uuid` | `bigint` | `anon`, `authenticated` |
| `glowe_get_application_count` | SECURITY INVOKER | `p_opportunity_id uuid` | `bigint` | `authenticated` (author-only via RLS) |

**`glowe_moderate_content` detail:**
- Validates `p_action IN ('hide','dismiss')`.
- `'hide'`: sets `status='hidden'` on the row at `(p_target_type, p_target_id)` via dynamic SQL; updates all open `glowe_reports` for that target to `status='actioned'`.
- `'dismiss'`: updates all open `glowe_reports` for that target to `status='dismissed'`. Content status unchanged.
- Raises `42501` if caller lacks moderator role.
- `REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated;`

### 6.3 Migration sequence

| Migration file | Contents |
|----------------|----------|
| `0207_glowe_forums.sql` | `glowe_forum_groups`, `glowe_forum_threads`, `glowe_forum_replies` tables + RLS + seed groups + `updated_at` trigger |
| `0208_glowe_offers.sql` | `glowe_offers` table + RLS |
| `0209_glowe_reports.sql` | `glowe_report_reason` enum, `glowe_reports` table + RLS + auto-hide trigger + `glowe_moderate_content` RPC |
| `0210_glowe_phase_b_indexes.sql` | Performance indexes: `glowe_posts(post_type, status, created_at)`, `glowe_applications(opportunity_id)`, `glowe_offers(post_id)`, `glowe_forum_threads(group_id, updated_at)`, `glowe_reports(target_type, target_id, status)` |

---

*End of specification.*
