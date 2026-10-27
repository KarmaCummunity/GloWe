# GloWe MVP — Product Requirements Document
> Phase B: Live Content Layer | Spec date: 2026-06-29 | Status: Draft

---

## 1. Executive Summary

GloWe ("Global Learning, Open Knowledge & Wisdom Exchange") is a global social-impact collaboration platform that sits as a static web frontend on top of the shared Karma Community (KC) Supabase backend. Phase A delivered a working authenticated shell: Google-only OAuth, session isolation from KC, post-sign-in onboarding (individual vs. organization), organization approval workflow, a settings screen, and a full Hebrew/English RTL language switch. All sixteen pages of the original GloWe design are present and visually complete.

Phase B — the Live Content Layer — connects that shell to real, persisted data. The sixteen pages already exist; the task is to replace placeholder and seed content with live reads and writes against the `glowe_*` tables already provisioned in the shared Supabase project. When Phase B is complete, a visitor can browse real organization profiles, post a wish on the Wishing Well, apply to volunteer opportunities, participate in forum discussions, and manage their own profile and saved items — all without a native mobile app.

This document states what Phase B must deliver and why. Detailed acceptance criteria and schema assignments belong in the SRS (Software Requirements Specification) and in `docs/SSOT/spec/17_glowe_frontend.md`.

---

## 2. Problem Statement

The GloWe frontend currently presents a convincing visual experience, but every piece of content is static seed data defined in `data.js`. Users who sign in and complete onboarding cannot do anything meaningful: they cannot post a need, discover real organizations, apply to a real volunteer opportunity, or leave a comment. The platform therefore has no social or practical value to its intended audience — social-impact organizations, volunteers, and professionals seeking global collaboration — regardless of how polished the UI looks.

There is also a trust gap for organizations that have already been approved through the Phase A workflow. They submitted details, were reviewed by an admin, and received approval, yet there is nothing they can do with that status: the create-content paths still write to `localStorage` or silently discard writes because the backend adapter methods are stubs or are never called.

Phase B removes the disconnect between the working auth/onboarding layer and the rest of the product, turning GloWe from a navigable prototype into a live platform.

---

## 3. Vision and Mission

**Vision.** A single global space where social-impact actors — from established NGOs to individual volunteers — can surface unmet needs, discover partners, exchange knowledge, and take coordinated action around the UN Sustainable Development Goals.

**Mission for Phase B.** Ship a live, data-backed MVP that allows real users to create and consume real content across GloWe's core surfaces. Every major page should leave the "static demo" state by the end of Phase B.

**Continuity with Phase A decisions.** Phase B inherits the following invariants established in Phase A (see `DECISIONS.md` D-61 and `spec/17_glowe_frontend.md`):

- All GloWe data lives in `glowe_*`-prefixed tables to avoid colliding with KC's native schema. No KC native tables (e.g. `public.posts`, `public.users`) are written to in Phase B.
- Auth is Google-only; the `window.gloweBackend` adapter (`backend.js`) is the single Supabase boundary for all frontend reads and writes.
- Content creation is gated: an unregistered visitor is view-only; an organization with `approval_status` other than `approved` is view-only. Individuals (`approval_status='not_required'`) have full create rights immediately after onboarding.
- GloWe is served at the `/glowe` sub-path of the main domain with no build step; all assets are vanilla HTML/CSS/JS.

---

## 4. Target Users and Personas

The following account types are already captured in `glowe_profiles.account_type` and drive content-create gating:

**NGO / Nonprofit.** A registered civil-society organization. Joins as `account_type='organization'`, requires admin approval before creating content. Primary activities: posting needs on the Wishing Well, advertising volunteer roles, listing the organization in the directory, and following thematic forum discussions.

**Social Initiative / Project.** An early-stage informal team without legal registration. May self-identify as an organization (same approval path) or as an individual. Primary activities: surfacing resource needs, recruiting volunteers, building a project portfolio under their profile.

**Volunteer.** An individual offering time, skills, or presence. Joins as `account_type='individual'` (immediately approved). Primary activities: browsing volunteer opportunities, applying to roles, participating in community and forum discussions.

**Professional / Service Provider.** An expert offering pro-bono or paid services. Joins as `account_type='individual'`. Primary activities: listing themselves in the volunteer network, sharing knowledge in the community feed and forums, building a professional profile.

**Impact Business.** A company with CSR or ESG goals. Joins as `account_type='organization'` (requires approval). Primary activities: posting partnership opportunities on the Wishing Well, listing CSR initiatives in the organizations directory, connecting with NGOs.

**Unregistered visitor (anonymous).** Can browse all public content (organizations, Wishing Well, volunteer listings, community posts, forum threads) but cannot create, react to, or save any content. Prompted to sign in when they attempt a write action.

---

## 5. Core Feature Requirements

This section describes each Phase B surface at the feature level. Functional requirements with FR-IDs, acceptance criteria, and schema details belong in `spec/17_glowe_frontend.md`. Each subsection references the page(s) it covers and the primary `glowe_*` table(s) involved.

### 5.1 Wishing Well — live needs board

**Pages:** `pages/wishing-well.html`
**Primary table:** `glowe_posts` (post type = wish/need)

The Wishing Well is GloWe's signature feature: a public board where organizations and individuals post specific, time-bound needs that the community can respond to. Phase A left this page rendering static cards from `data.js`.

Phase B must:

- Load and render live wish/need posts from `glowe_posts`, ordered by creation date (newest first), with pagination or infinite scroll.
- Support filtering by need type: Volunteers Needed, Resource Request, Partnership Opportunity, Looking for Mentors, Funding Support, Knowledge Sharing, Open Call, Equipment or Space, Visibility or Media.
- Support search by keyword across post title and description.
- Allow an approved creator to publish a new need via the "Share a Wish" modal, persisting to `glowe_posts` with the chosen need type and optional contact/deadline fields.
- Allow signed-in users to react to (like/support) a need and to leave comments, persisting to `glowe_reactions` and `glowe_comments` respectively.
- Allow signed-in users to save a wish (bookmark), persisting to `glowe_saved_items`.
- Show the author's profile avatar and display name (from `glowe_profiles`) on each card. Clicking the author navigates to their public profile.
- Empty state when no posts match the active filter/search.

The content-create gate (FR-GLOWE-003 AC5) already exists; Phase B wires it to the real submission path.

### 5.2 Volunteer Network — live opportunities

**Pages:** `pages/volunteer-network.html`, `pages/opportunity.html`
**Primary tables:** `glowe_opportunities`, `glowe_applications`

The Volunteer Network lists roles that organizations and initiatives are actively recruiting for. Phase B must:

- Load and render live opportunities from `glowe_opportunities`, with pagination.
- Support filtering by cause area (environment, community, education, advocacy) and by commitment type (Part-time, Flexible, Project-based).
- Support keyword search across opportunity title, description, and required skills.
- Render a full single-opportunity detail page (`opportunity.html`) with description, requirements, commitment, location (remote or physical), deadline, and the posting organization's profile snippet.
- Allow approved creators to post a new opportunity, persisting to `glowe_opportunities`.
- Allow a signed-in individual to apply to an opportunity via a lightweight application form (motivation note, contact info), persisting to `glowe_applications`.
- Prevent duplicate applications: a user who has already applied sees their application status instead of the apply button.
- Allow approved creators to close an opportunity (mark `status='closed'`) so it no longer appears in the active listing but remains accessible via a direct URL for existing applicants.

### 5.3 Community Feed — live posts

**Pages:** `pages/community.html`, `pages/write-post.html`
**Primary table:** `glowe_posts` (post type = community)

The community feed is a general knowledge-sharing and update stream, distinct from the Wishing Well's structured-need format. Phase B must:

- Load and render live community posts from `glowe_posts`, ordered chronologically.
- Support filtering by category/tag (Education, Environment, Health, Advocacy, Technology, Other) if the schema supports it, or by post type.
- Allow approved creators to compose and publish a rich-text post via `write-post.html`, persisting to `glowe_posts`.
- Support comments on posts, persisting to `glowe_comments`.
- Support reactions (like), persisting to `glowe_reactions`.
- Allow signed-in users to save a post, persisting to `glowe_saved_items`.
- Allow the author to delete their own post.

### 5.4 Forums and Discussions — live threads

**Pages:** `pages/forums.html`, `pages/discussion-group.html`
**Primary tables:** `glowe_forums` (or equivalent group table), `glowe_threads`, `glowe_posts`

Forums provide thematic discussion spaces around SDG topic areas (Education, Environment, Health, Rights and Safety, and others). Phase B must:

- Load and render forum groups from the relevant `glowe_*` table, displaying member count, thread count, and a short description for each group.
- Allow a signed-in user to join a group (subscribe/follow).
- Within a group, load and render live threads ordered by latest activity.
- Allow approved creators to start a new discussion thread, persisting to the threads table.
- Allow signed-in users to reply within a thread, persisting replies to `glowe_posts` (or a replies table) linked to the thread.
- Display reply count, last-active timestamp, and thread author on the group listing.
- Support reactions on individual replies.

### 5.5 Organizations Directory — live profiles

**Pages:** `pages/organizations.html`, `pages/profile.html`
**Primary table:** `glowe_profiles` (where `account_type='organization'` and `approval_status='approved'`)

The Organizations directory is the discovery surface for established social-impact actors. Phase B must:

- Load and render approved organizations from `glowe_profiles`, showing name, logo, cause area, country, and a short description.
- Support filtering by type (NGO, Business, Initiative) and by country or region.
- Support keyword search across name and description.
- Render a full public organization profile page (`profile.html`) with all submitted details, active projects (from `glowe_projects`), active opportunities (from `glowe_opportunities`), and recent Wishing Well posts.
- Allow a signed-in user to follow an organization (persisting to `glowe_follows` or equivalent) and to save the organization profile.
- Display follower count on the organization card and profile page.
- Pending or rejected organizations must not appear in this directory. They are only visible through the admin approval flow.

### 5.6 Personal Area — complete profile management

**Pages:** `pages/my-applications.html`, `pages/profile.html` (own profile view)
**Primary tables:** `glowe_profiles`, `glowe_projects`, `glowe_applications`, `glowe_opportunities`

The Personal Area is where a signed-in user manages their identity and tracks their activity on GloWe. In Phase A the profile card was wired to read from `glowe_profiles` after onboarding but write-back (edits, project management) was not implemented. Phase B must:

- Display the signed-in user's profile data (display name, bio, avatar, country, skills, account type, approval status).
- Allow the user to edit their profile and save changes, persisting to `glowe_profiles`.
- Allow the user to upload a profile photo, storing to Supabase Storage and writing the URL to `glowe_profiles`.
- Display the user's projects (from `glowe_projects`) and allow adding, editing, and deleting projects.
- Display the user's volunteer applications (from `glowe_applications`) with status (pending, accepted, rejected) and the linked opportunity title.
- Display the user's own Wishing Well posts and community posts, with quick-access edit and delete controls.
- For organization accounts, display the approval status prominently: pending organizations see a clear explanation of why they cannot create content yet.
- Allow the user to withdraw a pending volunteer application.

### 5.7 Saved Items — live bookmarks

**Pages:** `pages/saved.html`
**Primary table:** `glowe_saved_items`

The saved items page is a personal collection of bookmarked content across all entity types. Phase B must:

- Load and render all rows in `glowe_saved_items` belonging to the current user.
- Resolve each saved item's entity type and ID to a display card (wish post, community post, opportunity, organization profile), fetching display data from the appropriate `glowe_*` table.
- Support filtering by entity type (Wishes, Opportunities, Organizations, Community Posts).
- Allow the user to unsave any item directly from this page.
- Handle dangling references gracefully (if the original entity was deleted, show a "no longer available" placeholder rather than an error).

### 5.8 Applications and Offers — volunteer matching

**Pages:** `pages/opportunity.html` (applicant-side), `pages/my-applications.html` (applicant tracking), and the organization's own profile/opportunity management view.
**Primary table:** `glowe_applications`

This is the matching layer that connects volunteers with opportunity postings. Phase B must:

- Allow an organization (approved) to view the list of applicants for each of their opportunities, showing applicant name, submitted note, and submission date.
- Allow an organization to mark an application as accepted or rejected, persisting to `glowe_applications.status`.
- Notify the applicant of a status change (a passive in-page indicator on next visit is sufficient for Phase B; push notifications are out of scope).
- Enforce that only the posting organization's owner can view and decide on their own applications (RLS).

### 5.9 Direct Messaging — Phase B stub

**Pages:** `pages/messages.html`

Direct messaging between users is a Phase C concern (routing through the KC Realtime chat infrastructure). Phase B preserves the messages page as a signed-in placeholder. The only Phase B work here is ensuring the "message this organization" or "message this user" CTAs on profile and opportunity pages correctly route to the placeholder with appropriate context (e.g., a pre-filled subject referencing the entity), rather than going nowhere or throwing an error.

No message persistence is required in Phase B.

---

## 6. User Flows

This section describes the key end-to-end journeys a user takes across Phase B features, narrated at the experience level.

### 6.1 Volunteer discovers and applies to an opportunity

A volunteer visits GloWe, is already signed in and onboarded as an individual. They navigate to the Volunteer Network and filter by "Education" and "Flexible" commitment. They see a listing of real opportunities fetched from Supabase. They click into an opportunity that matches their skills, read the full description and requirements on the opportunity detail page, and click "Apply." A lightweight modal collects a motivation note and confirms their contact email (pre-filled from their profile). On submit, a row is created in `glowe_applications`. They return to the Volunteer Network and the opportunity button now reads "Applied" with a timestamp. They can track the status from My Applications.

### 6.2 Organization posts a need on the Wishing Well

An organization admin, whose account was approved by a KC moderator (FR-GLOWE-003), visits the Wishing Well. They click "Share a Wish." The modal — already present in the UI — is now wired to the backend. They fill in a title, select "Partnership Opportunity" as the need type, write a description, set an optional deadline, and submit. The new card appears at the top of the Wishing Well board immediately (optimistic insert or hard reload). Other visitors can now see it, react to it, comment on it, or save it for later.

### 6.3 New visitor browses without signing in

An anonymous visitor lands on the home page and navigates to the Volunteer Network. They can see all active opportunities (public read via RLS). They filter by cause area and find a relevant listing. They click "Apply" and are prompted to sign in with Google. After signing in and completing the onboarding step (first time), they return to the opportunity detail and the Apply button is now active.

### 6.4 User manages their profile and projects

A signed-in individual goes to My Applications (Personal Area). They see their profile card with their current display name, bio, and country. They click "Edit Profile," update their bio and add a skill tag, and save. The update persists to `glowe_profiles` and the card re-renders with the new data. They then click "Add Project," enter a project name, description, and a link, and save. The project appears in their public profile as well.

### 6.5 User explores the Organizations directory

A signed-in user navigates to the Organizations directory. The page renders real approved organization cards from Supabase. They search for "education Kenya" and the results filter to matching organizations. They click an organization card and land on a full profile page showing the organization's description, active projects, open opportunities, and recent Wishing Well posts. They click "Follow" and the organization is added to their follows (persisted to `glowe_follows`). They also save the profile for later reference.

### 6.6 Forum participation

A signed-in user navigates to Forums and sees a list of thematic groups with real member and thread counts. They click the "Environment" group and see a list of live discussion threads. They read through a thread with several replies and click "Reply," composing a response. On submit, their reply appears at the bottom of the thread. Another user, visiting the same thread minutes later, sees the new reply.

### 6.7 Saved items collection

A signed-in user has been browsing and saving content across multiple sessions (wishes, a community post, and two organization profiles). They navigate to Saved Items and see all four saved items, each showing a preview card with the entity type labeled. They unsave the community post they have already read, and it disappears from the list. The three remaining items stay in the collection and are still clickable to their original pages.

---

## 7. Success Metrics

The following metrics define whether Phase B has delivered its intended value. They should be measurable from Supabase analytics and basic event logging within four weeks of Phase B launch.

**Activation**
- At least 80% of users who complete onboarding (Phase A) visit at least one live-content page (Wishing Well, Volunteer Network, Community, or Organizations) in their first session after Phase B launches.
- At least 30% of signed-in individual users perform at least one write action (react, comment, save, or apply) within their first three sessions.

**Content creation**
- At least one new wish/need post per approved organization per month (for organizations that have been approved and active in the first month).
- At least five volunteer opportunity applications submitted in the first month post-launch.
- The Wishing Well board has at least 10 live posts (not seed/demo data) within the first two weeks of Phase B.

**Retention signal**
- Users who follow at least one organization or save at least one item return to GloWe within 14 days at a higher rate than users who do not.

**Error rate**
- Zero Supabase RLS violations surfaced to end users (write attempts that should have succeeded but fail due to policy error).
- Zero instances of a signed-in approved user being blocked by the view-only gate erroneously.

**Phase A continuity**
- Org approval rate: 100% of submitted organization applications are reviewed (approved or rejected) within 72 hours of submission, as measured by `glowe_profiles.org_reviewed_at - org_submitted_at`.

---

## 8. Out of Scope (Phase C: Schema Convergence)

The following items are explicitly excluded from Phase B to keep scope bounded. They belong to Phase C, whose goal is full schema convergence — migrating GloWe's content onto KC's native tables and positioning GloWe as the primary frontend.

- **Cross-frontend content visibility.** GloWe posts, wishes, and organizations are not visible in the KC mobile app. The `glowe_*` tables remain separate from `public.posts` and `public.users`. Content convergence (DB views, entity-by-entity migration) is Phase C work.
- **Real-time messaging.** Integrating `pages/messages.html` with KC's Supabase Realtime chat infrastructure is Phase C. Phase B ships a stub only.
- **Push notifications.** No mobile or web push for application status changes, new replies, or follows. In-page indicators are sufficient for Phase B.
- **Karma points integration.** GloWe actions (volunteering, posting wishes, completing projects) do not feed KC's native Karma points system in Phase B.
- **KC-native auth methods.** Phone OTP, email/password, and multi-provider sign-in remain out of scope. GloWe stays Google-only.
- **Content moderation tools for GloWe content.** The KC admin portal (`admin.html` in KC) does not surface GloWe-specific content for moderation in Phase B. Moderation of GloWe content is handled through the GloWe admin page (organization approval only) and manual Supabase dashboard access.
- **Analytics dashboard.** No in-platform statistics page for GloWe usage data. Supabase dashboard serves this role for Phase B.
- **Paid features, donations, or premium tiers.** All GloWe content is free to browse and participate in.
- **Native mobile GloWe app.** GloWe remains web-only in Phase B.
- **GloWe as primary frontend (KC mobile deprecated).** That is the Phase C end-state (see `DECISIONS.md` D-61).

---

## 9. Technical Constraints

The following constraints are fixed by decisions made in Phase A and the architecture of the shared KC infrastructure. They are not negotiable in Phase B without a new DECISIONS.md entry and PM sign-off.

**Static frontend, no build step.** GloWe is vanilla HTML/CSS/JS. There is no React, no TypeScript, no bundler, and no SSR. All logic runs in the browser. The `window.gloweBackend` adapter (`js/backend.js`) is the exclusive Supabase boundary; no component or page script imports Supabase directly.

**Table prefix and RLS.** All GloWe tables use the `glowe_` prefix (provisioned in migration `0204_glowe_schema.sql`). Phase B may add new migrations for new tables or columns, all prefixed `glowe_`. RLS policies on every new table must follow the pattern established in `0204`: catalog tables are public-read, owner-write; personal tables (`glowe_saved_items`, `glowe_applications`) are owner-only.

**Single Supabase project, shared auth.** GloWe shares `auth.users` with KC. A new KC mobile user and a new GloWe user are the same identity. The `glowe_profiles` row is keyed on `auth.uid()`. GloWe's Supabase client uses `storageKey: 'glowe-auth-v1'` to isolate its session token from KC's `sb-<ref>-auth-token`; `signOut` uses `scope: 'local'` to avoid revoking KC's server-side session.

**Sub-path hosting, no separate domain.** GloWe is served at `<main-domain>/glowe` via Cloudflare Pages. Asset paths must remain relative. The build pipeline (`web-postbuild.mjs`) copies `app/apps/glowe-web/**` into `dist/glowe/` at deploy time. Phase B introduces no changes to the hosting or CI pipeline unless a new asset type requires it.

**Content-create gating is a hard invariant.** The `canCreateContent()` guard (FR-GLOWE-003 AC5) must be enforced at every write choke point in `js/app.js`. New Phase B features that introduce write paths must run the same guard before persisting. The gating logic is: the user must be signed in AND must not be an organization with `approval_status` other than `approved`.

**Backend adapter is the only mutation surface.** All reads and writes go through `window.gloweBackend`. No page script calls `supabase` directly. Phase B adds new adapter methods to `backend.js` for each new entity type; it does not create parallel Supabase client instances.

**File size cap.** Although the arch checker does not enforce the 300-line cap on `.html/.js/.css` files, `js/app.js` is already large. Phase B work should extract new entity modules (e.g. `js/wishing-well.js`, `js/volunteer-network.js`) rather than continuing to grow `app.js`. This is an engineering quality constraint, not an AC.

**KC clean architecture layers are untouched.** GloWe's `.js` files are outside the `packages/` monorepo layers. No Phase B change may import from `@kc/domain`, `@kc/application`, or `@kc/infrastructure-supabase`. GloWe remains entirely self-contained under `app/apps/glowe-web/`.

**Migrations ship in the same PR as their consumers.** Any new `glowe_*` table or column introduced to support a Phase B feature must be delivered in the same PR as the frontend code that uses it, not in a separate migration-only PR.

---

## 10. Open Questions

The following questions are unresolved at the time of this PRD. They must be answered before implementation of the affected feature begins. Owner = PM unless noted.

1. **Schema for forum groups and threads.** Is there an existing `glowe_forums` or `glowe_threads` table in migration `0204`, or does Phase B need to add it? If the table does not exist, what are the required columns and cardinality (one thread to many replies, or a flat post list with a `thread_id` FK)? *Owner: engineering, check `supabase/migrations/0204_glowe_schema.sql` before estimating.*

2. **Follow / subscribe model.** Does GloWe need a `glowe_follows` table (user follows organization or forum group), or is this deferred? If follows are in scope for Phase B, what is the read surface — does a user's home page or feed change based on who they follow, or is follow count purely cosmetic in Phase B?

3. **Reactions model.** Is a simple like/support reaction per entity (one row per user per entity in `glowe_reactions`) sufficient, or does the UX require multiple reaction types? The existing Wishing Well UI appears to show a single "heart/support" interaction; confirm the intended behavior.

4. **Rich text in posts and threads.** The post composer (`write-post.html`) appears to support some formatting. Does Phase B need to persist and render Markdown or HTML, or is plain text sufficient? Plain text is significantly simpler and removes XSS risk; Markdown requires a client-side renderer and sanitizer.

5. **Image / file attachments.** Can a Wishing Well post or community post include an image? If yes, Phase B must wire Supabase Storage for upload and serve signed or public URLs. If no, attachments are deferred to Phase C.

6. **Opportunity application flow — organization visibility.** When an organization views applicants, should they see the applicant's full GloWe profile, or only the submitted motivation note and contact info? This affects what data is fetched and displayed in the organization's management view.

7. **Forum moderation.** Can any signed-in user report a forum post or comment for review? Is there a Phase B moderation queue, or are reported items simply flagged for a KC moderator to review in the Supabase dashboard?

8. **Profile photo storage bucket.** Which Supabase Storage bucket should profile photos be uploaded to — an existing KC bucket (e.g. `avatars`) or a new `glowe-avatars` bucket with its own access policy? Using an existing bucket risks cross-namespace collisions; a new bucket is clean but requires a new migration.

9. **Organization self-edit after approval.** Can an approved organization edit its org fields (name, description, sector) after approval, or does an edit require re-review? This is a product policy question that affects whether the approval guard must be rerun after profile edits.

10. **Pagination strategy.** Is cursor-based pagination (using Supabase's `range()` or `lt(created_at, cursor)`) required for all listing pages, or is simple offset pagination acceptable for Phase B given expected data volumes? Cursor pagination is more correct for infinite scroll; offset pagination is simpler and adequate for paginated page controls.
