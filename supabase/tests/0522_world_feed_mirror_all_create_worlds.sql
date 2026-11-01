-- supabase/tests/0522_world_feed_mirror_all_create_worlds.sql | 0522 (FR-FEED-020 AC1 / AC4):
-- a published time listing gets one mirror post in the main feed, like items and food (0466);
-- every create world mirrors; the time world is active.

begin;

create temp table personas as
select kc_test.create_user('wfm_giver')  as giver,
       kc_test.create_user('wfm_viewer') as viewer;

-- 1) Every world with a create form mirrors its listings into the main feed.
do $$
begin
  perform kc_test.assert_row_count(
    'select 1 from public.worlds where slug in (''items'', ''food'', ''rides'', ''time'', ''housing'') and feed_mirror',
    5, 'items, food, rides, time and housing all mirror into the main feed');
  perform kc_test.assert_true(
    (select enabled from public.app_flags where key = 'world_time_enabled'),
    'the time world is active');
end $$;

-- 2) A time offer published through the app's RPC appears in the main feed as one mirror post.
do $$
declare
  p personas;
  v_listing uuid;
  v_mirror public.posts;
begin
  select * into p from personas;
  perform kc_test.act_as(p.giver);
  v_listing := public.create_marketplace_listing(
    p_kind_id => kc_test.listing_kind_id('time', 'volunteer_shift'),
    p_title   => 'Two hours of help with groceries',
    p_summary => 'Weekday mornings',
    p_details => '{"duration_minutes":120}'::jsonb,
    p_lat     => 31.9510,
    p_lng     => 34.8881
  );
  select * into v_mirror from public.posts where listing_id = v_listing;

  perform kc_test.assert_true(v_mirror.post_id is not null, 'a published time listing gets a mirror post');
  perform kc_test.assert_eq(v_mirror.type, 'Give', 'a time offer → Give post');
  perform kc_test.assert_eq(v_mirror.status, 'open', 'open listing → open post');
  perform kc_test.assert_eq(v_mirror.title, 'Two hours of help with groceries', 'the mirror carries the title');
  perform kc_test.assert_eq(v_mirror.category, 'Other', 'a non-items world maps to the Other post category');
  perform kc_test.assert_row_count(
    format('select 1 from public.posts where listing_id = %L', v_listing), 1, 'exactly one mirror per listing');

  perform public.refresh_feed_open_posts_mv(false);
  perform kc_test.assert_true(
    exists (select 1 from public.feed_ranked_ids(p.viewer, p_page_limit => 100) f where f.post_id = v_mirror.post_id),
    'another member sees the time listing in the main feed');
end $$;

rollback;

\echo '✓ supabase/tests/0522_world_feed_mirror_all_create_worlds.sql passed'
