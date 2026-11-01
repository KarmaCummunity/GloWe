-- supabase/tests/0522_world_feed_mirror_all_create_worlds.sql | 0522 (FR-FEED-020 AC1 / AC4):
-- every create world mirrors its listings into the main feed (like items and food, 0466), each
-- mirror keeps its world's privacy cap (worlds.default_anonymity_level: rides public, time
-- followers-only), and the time world is active.

begin;

create temp table personas as
select kc_test.create_user('wfm_giver')    as giver,
       kc_test.create_user('wfm_follower') as follower,
       kc_test.create_user('wfm_viewer')   as viewer;

insert into public.follow_edges (follower_id, followed_id)
select follower, giver from personas;

/** Whether the main feed, as seen by p_viewer, lists the given post (refreshes the newest MV). */
create function pg_temp.in_feed(p_viewer uuid, p_post uuid)
returns boolean
language plpgsql
as $$
begin
  perform public.refresh_feed_open_posts_mv(false);
  return exists (
    select 1 from public.feed_ranked_ids(p_viewer, p_page_limit => 100) f where f.post_id = p_post
  );
end $$;

-- 1) Every world with a create form mirrors its listings into the main feed; time is active.
do $$
begin
  perform kc_test.assert_row_count(
    'select 1 from public.worlds where slug in (''items'', ''food'', ''rides'', ''time'', ''housing'') and feed_mirror',
    5, 'items, food, rides, time and housing all mirror into the main feed');
  perform kc_test.assert_true(
    (select enabled from public.app_flags where key = 'world_time_enabled'),
    'the time world is active');
end $$;

-- 2) A ride offer (public world) appears in everyone's main feed as one mirror post.
do $$
declare
  p personas;
  v_listing uuid;
  v_mirror public.posts;
begin
  select * into p from personas;
  v_listing := kc_test.create_ride_offer(p.giver);
  select * into v_mirror from public.posts where listing_id = v_listing;

  perform kc_test.assert_true(v_mirror.post_id is not null, 'a published ride offer gets a mirror post');
  perform kc_test.assert_eq(v_mirror.type, 'Give', 'a ride offer → Give post');
  perform kc_test.assert_eq(v_mirror.visibility, 'Public', 'rides are public by default');
  perform kc_test.assert_eq(v_mirror.category, 'Other', 'a non-items world maps to the Other post category');
  perform kc_test.assert_row_count(
    format('select 1 from public.posts where listing_id = %L', v_listing), 1, 'exactly one mirror per listing');
  perform kc_test.assert_true(pg_temp.in_feed(p.viewer, v_mirror.post_id), 'any member sees the ride in the main feed');
end $$;

-- 3) A time offer is mirrored with the time world's followers-only cap: followers see it in the
--    main feed, other members do not.
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
  perform kc_test.assert_eq(v_mirror.status, 'open', 'open listing → open post');
  perform kc_test.assert_eq(v_mirror.title, 'Two hours of help with groceries', 'the mirror carries the title');
  perform kc_test.assert_eq(v_mirror.visibility, 'FollowersOnly', 'time keeps its followers-only cap');
  perform kc_test.assert_true(pg_temp.in_feed(p.follower, v_mirror.post_id), 'a follower sees the time listing in the main feed');
  perform kc_test.assert_true(not pg_temp.in_feed(p.viewer, v_mirror.post_id), 'a non-follower does not');
end $$;

rollback;

\echo '✓ supabase/tests/0522_world_feed_mirror_all_create_worlds.sql passed'
