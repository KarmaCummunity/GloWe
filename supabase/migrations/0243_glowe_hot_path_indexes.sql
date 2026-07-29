-- 0243_glowe_hot_path_indexes — index the GloWe read paths before launch.
--
-- Purely additive: indexes only, no DDL on columns, no data change, no RLS or
-- grant change. Every statement is `if not exists`, so re-running is a no-op.
--
-- WHY NOW. At today's row counts every one of these is a sequential scan that
-- costs nothing, which is exactly why their absence is invisible. The cost
-- appears non-linearly with real content, and by then it appears on the home
-- page of a live product. Twelve indexes are cheap insurance; a slow launch is
-- not.
--
-- WHAT WAS MISSING. Audited against the actual query shapes in
-- `js/backend.js` and `public.glowe_home_feed` (migration 0240):
--
--   * `glowe_comments (post_id)` — the single worst gap. `glowe_home_feed`
--     opens with `select post_id, count(*) from glowe_comments group by
--     post_id`, an aggregate over the WHOLE table, on every home-page load.
--     `loadPostComments()` also fetches by post. No index existed at all.
--   * `glowe_posts (created_at desc)` — only a PARTIAL index existed
--     (`glowe_posts_wish_open_idx`, `where post_type='wish' and
--     status='open'`). The feed's community branch (`post_type` null/''/
--     'community') and its offer branch were unindexed.
--   * `glowe_opportunities (created_at desc)` — none. Read by the feed and by
--     `listAll('opportunities')`.
--   * `glowe_profiles` individuals — partial indexes existed for organizations
--     (approved + pending) but `listMembers()` filters `account_type =
--     'individual'` with nothing behind it.
--   * Foreign keys used by `listOwned()` — `user_id` on posts, opportunities,
--     projects, comments, plus `glowe_saved_items(user_id)`. An unindexed FK
--     also forces a sequential scan on every cascade delete from auth.users.
--
-- NOT `concurrently`: Supabase runs each migration inside a transaction, and
-- `create index concurrently` cannot run there. These tables are small today,
-- so a plain build takes milliseconds. Matches the convention in 0204-0242.
--
-- Mapped to spec: docs/SSOT/spec/17_glowe_frontend.md FR-GLOWE-030.

set search_path = public;

-- ── glowe_comments ──────────────────────────────────────────────────────────
-- Serves both the `group by post_id` aggregate in glowe_home_feed and the
-- per-post comment fetch. Ordered so a single post's comments come out sorted.
create index if not exists glowe_comments_post_created_idx
  on public.glowe_comments (post_id, created_at asc);

create index if not exists glowe_comments_user_idx
  on public.glowe_comments (user_id);

-- ── glowe_posts ─────────────────────────────────────────────────────────────
-- Feed ordering across every branch. The existing wish-open partial index stays
-- (it is narrower and still wins for the Wishing Well board); this one covers
-- the community and offer branches that had nothing.
create index if not exists glowe_posts_created_idx
  on public.glowe_posts (created_at desc);

-- The feed splits glowe_posts three ways by post_type. This composite lets each
-- branch seek straight to its slice already ordered, instead of scanning the
-- table and sorting.
create index if not exists glowe_posts_type_created_idx
  on public.glowe_posts (post_type, created_at desc);

create index if not exists glowe_posts_user_idx
  on public.glowe_posts (user_id);

-- ── glowe_opportunities ─────────────────────────────────────────────────────
create index if not exists glowe_opportunities_created_idx
  on public.glowe_opportunities (created_at desc);

-- The feed excludes cancelled/closed rows, so keep the index to live ones only:
-- smaller, and it stays small as cancelled rows accumulate.
create index if not exists glowe_opportunities_active_created_idx
  on public.glowe_opportunities (created_at desc)
  where coalesce(status, 'active') not in ('cancelled', 'closed');

create index if not exists glowe_opportunities_user_idx
  on public.glowe_opportunities (user_id);

-- ── glowe_profiles ──────────────────────────────────────────────────────────
-- listMembers(): account_type = 'individual' ordered by created_at desc.
create index if not exists glowe_profiles_individuals_idx
  on public.glowe_profiles (created_at desc)
  where account_type = 'individual';

-- ── glowe_projects ──────────────────────────────────────────────────────────
create index if not exists glowe_projects_user_idx
  on public.glowe_projects (user_id);

-- ── glowe_saved_items ───────────────────────────────────────────────────────
-- Owner-only RLS reads every row by user_id on the saved list.
create index if not exists glowe_saved_items_user_idx
  on public.glowe_saved_items (user_id);

-- ── glowe_applications ──────────────────────────────────────────────────────
-- listMyRegistrations() / my-applications page: the user's own rows, newest
-- first. The existing (opportunity_id, status) index serves the owner-side
-- review screen instead, and does not help this direction.
create index if not exists glowe_applications_user_created_idx
  on public.glowe_applications (user_id, created_at desc);
