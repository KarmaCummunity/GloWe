-- Regression for migration 0243 — GloWe hot-path indexes exist.
--
-- Asserts presence, not plan shape: at the row counts this suite runs against,
-- the planner will correctly prefer a sequential scan regardless, so asserting
-- "uses an index scan" would be a test that fails for the right reason on an
-- empty database. Presence is the durable contract; the plan follows from it
-- once the tables have data.
begin;
select plan(12);

-- glowe_comments — the aggregate in glowe_home_feed had no index at all.
select has_index('public', 'glowe_comments', 'glowe_comments_post_created_idx',
  'glowe_comments (post_id, created_at) — backs the home-feed comment aggregate');
select has_index('public', 'glowe_comments', 'glowe_comments_user_idx',
  'glowe_comments (user_id) — FK index');

-- glowe_posts — only a partial wish-open index existed before.
select has_index('public', 'glowe_posts', 'glowe_posts_created_idx',
  'glowe_posts (created_at desc) — feed ordering');
select has_index('public', 'glowe_posts', 'glowe_posts_type_created_idx',
  'glowe_posts (post_type, created_at desc) — per-branch feed seek');
select has_index('public', 'glowe_posts', 'glowe_posts_user_idx',
  'glowe_posts (user_id) — FK index, listOwned');

-- glowe_opportunities — nothing existed.
select has_index('public', 'glowe_opportunities', 'glowe_opportunities_created_idx',
  'glowe_opportunities (created_at desc)');
select has_index('public', 'glowe_opportunities', 'glowe_opportunities_active_created_idx',
  'glowe_opportunities live rows only (partial)');
select has_index('public', 'glowe_opportunities', 'glowe_opportunities_user_idx',
  'glowe_opportunities (user_id) — FK index, listOwned');

-- glowe_profiles — orgs were covered, individuals were not.
select has_index('public', 'glowe_profiles', 'glowe_profiles_individuals_idx',
  'glowe_profiles individuals (partial) — listMembers');

-- FK indexes behind listOwned / saved list / my applications.
select has_index('public', 'glowe_projects', 'glowe_projects_user_idx',
  'glowe_projects (user_id) — FK index');
select has_index('public', 'glowe_saved_items', 'glowe_saved_items_user_idx',
  'glowe_saved_items (user_id) — owner reads');
select has_index('public', 'glowe_applications', 'glowe_applications_user_created_idx',
  'glowe_applications (user_id, created_at desc) — my-applications list');

select * from finish();
rollback;
