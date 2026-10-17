-- supabase/tests/0350_world_rules_on_change_only.sql | 0350 follow-up to 0266

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

select pg_temp.mk_user('00000000-0000-0000-0000-000000350001', 'legacy_items');

-- Simulate a legacy image-less items listing (created before 0266 existed).
alter table public.listings disable trigger listings_enforce_world_rules;
insert into public.listings (
  listing_id, owner_id, world_slug, kind_id, direction, title, origin, moderation_status, details
)
select '00000000-0000-0000-0000-0000003500a1', '00000000-0000-0000-0000-000000350001',
       'items', kind_id, 'give', 'Legacy chair', 'native', 'published', '{}'::jsonb
  from public.listing_kinds where world_slug = 'items' and slug = 'give_item';
alter table public.listings enable trigger listings_enforce_world_rules;

-- 1) Status-only updates (pause → resume → fulfill → admin-remove) succeed.
do $$
declare
  v_id uuid := '00000000-0000-0000-0000-0000003500a1';
  v_status text;
begin
  update public.listings set status = 'cancelled', updated_at = now() where listing_id = v_id;
  update public.listings set status = 'open', updated_at = now() where listing_id = v_id;
  update public.listings set status = 'closed', updated_at = now() where listing_id = v_id;
  update public.listings set status = 'removed_admin', updated_at = now() where listing_id = v_id;
  select status into v_status from public.listings where listing_id = v_id;
  if v_status <> 'removed_admin' then
    raise exception 'ASSERT FAILED: status-only updates should succeed, got %', v_status;
  end if;
end $$;

-- 2) Changing details on that legacy listing still enforces the image rule.
do $$
begin
  begin
    update public.listings set details = '{"item_condition":"Good"}'::jsonb
     where listing_id = '00000000-0000-0000-0000-0000003500a1';
    raise exception 'ASSERT FAILED: details change without image should fail';
  exception when check_violation then
    if sqlerrm <> 'items_image_required' then
      raise exception 'ASSERT FAILED: expected items_image_required, got %', sqlerrm;
    end if;
  end;
end $$;

-- 3) A new items listing without an image is still rejected on INSERT.
do $$
begin
  begin
    insert into public.listings (
      owner_id, world_slug, kind_id, direction, title, origin, moderation_status, details
    )
    select '00000000-0000-0000-0000-000000350001', 'items', kind_id, 'give', 'No image',
           'native', 'published', '{}'::jsonb
      from public.listing_kinds where world_slug = 'items' and slug = 'give_item';
    raise exception 'ASSERT FAILED: items insert without image should fail';
  exception when check_violation then
    if sqlerrm <> 'items_image_required' then
      raise exception 'ASSERT FAILED: expected items_image_required, got %', sqlerrm;
    end if;
  end;
end $$;

rollback;

\echo '✓ 0350_world_rules_on_change_only.sql passed'
