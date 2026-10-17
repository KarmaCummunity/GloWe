-- supabase/tests/0351_items_image_photo_or_details.sql | items photos (optional since 0358) + listing detail RPC

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

select pg_temp.mk_user('00000000-0000-0000-0000-000000351001', 'items_photo');
select set_config('request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000351001', 'role', 'authenticated')::text, true);

-- 1) RPC with an attached photo (no image in details) succeeds at commit-time check.
do $$
declare
  v_kind uuid;
  v_id uuid;
  v_n int;
begin
  select kind_id into v_kind from public.listing_kinds where world_slug = 'items' and slug = 'give_item';
  v_id := public.create_marketplace_listing(
    p_kind_id => v_kind, p_title => 'Chair with photo', p_details => '{"item_condition":"Good"}'::jsonb,
    p_media_paths => array['00000000-0000-0000-0000-000000351001/chair.jpg']);
  execute 'set constraints all immediate';   -- fire the deferred image check now
  execute 'set constraints all deferred';
  select count(*) into v_n from public.listing_media where listing_id = v_id;
  if v_n <> 1 then
    raise exception 'ASSERT FAILED: expected 1 photo, got %', v_n;
  end if;
end $$;

-- 2) Back-compat: image_url in details passes the schema and the rule (no photo).
do $$
declare
  v_kind uuid;
begin
  select kind_id into v_kind from public.listing_kinds where world_slug = 'items' and slug = 'give_item';
  perform public.create_marketplace_listing(
    p_kind_id => v_kind, p_title => 'Lamp with details image',
    p_details => '{"image_url":"https://example.test/lamp.jpg"}'::jsonb,
    p_media_paths => null::text[]);
  execute 'set constraints all immediate';
  execute 'set constraints all deferred';
end $$;

-- 3) 0358: a photo is optional; an items listing with no photo and no details image succeeds.
do $$
declare
  v_kind uuid;
  v_id uuid;
begin
  select kind_id into v_kind from public.listing_kinds where world_slug = 'items' and slug = 'give_item';
  v_id := public.create_marketplace_listing(
    p_kind_id => v_kind, p_title => 'Table without photo', p_details => '{}'::jsonb,
    p_media_paths => null::text[]);
  execute 'set constraints all immediate';
  execute 'set constraints all deferred';
  if v_id is null then
    raise exception 'ASSERT FAILED: items listing without photo should be created';
  end if;
end $$;

-- 4) Removing the last photo of an items listing is allowed (0358).
do $$
declare
  v_id uuid;
begin
  select listing_id into v_id from public.listings where title = 'Chair with photo';
  delete from public.listing_media where listing_id = v_id;
  execute 'set constraints all immediate';
  execute 'set constraints all deferred';
end $$;

-- 5) 0358: listing detail RPC runs (0335 read the missing users.city_id column).
do $$
declare
  v_id uuid;
  v_detail jsonb;
begin
  select listing_id into v_id from public.listings where title = 'Table without photo';
  v_detail := public.get_marketplace_listing_detail(v_id);
  if v_detail is null or v_detail->>'title' <> 'Table without photo' then
    raise exception 'ASSERT FAILED: listing detail missing, got %', v_detail;
  end if;
  if v_detail->'owner'->>'user_id' is null then
    raise exception 'ASSERT FAILED: listing detail owner missing';
  end if;
end $$;

rollback;

\echo '✓ 0351_items_image_photo_or_details.sql passed'
