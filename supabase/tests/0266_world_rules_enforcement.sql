-- supabase/tests/0266_world_rules_enforcement.sql | Issue #849

begin;

create or replace function pg_temp.mk_user(p_id uuid, p_handle text)
returns void language plpgsql as $$
begin
  insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role)
  values (p_id, p_handle || '@test.local', now(),
          jsonb_build_object('full_name', 'Display ' || p_handle),
          jsonb_build_object('provider', 'email'),
          'authenticated', 'authenticated');
  update public.users
     set share_handle = p_handle, display_name = 'Display ' || p_handle,
         account_status = 'active', privacy_mode = 'Public'
   where user_id = p_id;
end $$;

do $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000266001';
begin
  perform pg_temp.mk_user(v_user, 'food_rules');
  begin
    insert into public.listings (
      owner_id, world_slug, kind_id, direction, title, origin, moderation_status, details
    )
    select v_user, 'food', kind_id, 'give', 'Soup', 'native', 'published',
           '{"image_url":"https://example.test/f.jpg"}'::jsonb
      from public.listing_kinds where world_slug = 'food' and slug = 'give_food';
    raise exception 'ASSERT FAILED: food without expiry should fail';
  exception when others then
    if sqlstate <> '23514' then raise; end if;
  end;
end $$;

do $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000266002';
begin
  perform pg_temp.mk_user(v_user, 'ride_cap');
  begin
    insert into public.listings (
      owner_id, world_slug, kind_id, direction, title, origin, moderation_status,
      details, expires_at
    )
    select v_user, 'rides', kind_id, 'give', 'Ride offer', 'native', 'published',
           jsonb_build_object('cost_share_ils', 999, 'image_url', 'https://example.test/r.jpg'),
           now() + interval '1 day'
      from public.listing_kinds where world_slug = 'rides' and slug = 'ride_offer';
    raise exception 'ASSERT FAILED: ride cost cap should fail';
  exception when others then
    if sqlstate <> '23514' then raise; end if;
  end;
end $$;

rollback;

\echo '✓ 0266_world_rules_enforcement.sql passed'
