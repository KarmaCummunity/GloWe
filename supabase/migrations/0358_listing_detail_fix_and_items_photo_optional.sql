-- 0358_listing_detail_fix_and_items_photo_optional | QA pass (e2e on dev)
--
-- 1. Bug: get_marketplace_listing_detail (0335) read users.city_id, which does not exist
--    (the column is users.city). plpgsql only fails at run time, so every listing detail
--    page returned 400 and showed "listing not found". Read users.city; the payload key
--    stays 'city_id' so clients are unchanged.
--
-- 2. Product decision (Nave, 2026-10-17): a photo is optional for item listings.
--    Drop the deferred items image check from 0351 (triggers + function). The details
--    schema keeps accepting image_url / image_path for back-compat.

begin;

create or replace function public.get_marketplace_listing_detail(p_listing_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_viewer uuid := auth.uid();
  v_listing public.listings%rowtype;
  v_row public.marketplace_listing_card%rowtype;
  v_media jsonb;
  v_owner jsonb;
begin
  select * into v_listing from public.listings where listing_id = p_listing_id;
  if not found then
    return null;
  end if;

  if not public.is_listing_visible_to(v_listing, v_viewer) then
    return null;
  end if;

  select * into v_row
    from public.marketplace_listing_card c
   where c.listing_id = p_listing_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'storage_path', m.storage_path,
      'sort_order', m.sort_order
    ) order by m.sort_order
  ), '[]'::jsonb)
    into v_media
    from public.listing_media m
   where m.listing_id = p_listing_id;

  select jsonb_build_object(
    'user_id', u.user_id,
    'display_name', u.display_name,
    'avatar_url', u.avatar_url,
    'share_handle', u.share_handle,
    'city_id', u.city
  )
    into v_owner
    from public.users u
   where u.user_id = v_row.owner_id;

  return jsonb_build_object(
    'listing_id', v_row.listing_id,
    'owner_id', v_row.owner_id,
    'world_slug', v_row.world_slug,
    'world_label_en', v_row.world_label_en,
    'world_label_he', v_row.world_label_he,
    'kind_slug', v_row.kind_slug,
    'kind_label_en', v_row.kind_label_en,
    'kind_label_he', v_row.kind_label_he,
    'direction', v_row.direction,
    'title', v_row.title,
    'summary', v_row.summary,
    'details', v_row.details,
    'city_id', v_row.city_id,
    'urgency_level', v_row.urgency_level,
    'availability_status', v_row.availability_status,
    'published_at', v_row.published_at,
    'geo', case when v_row.geo is null then null else extensions.st_asgeojson(v_row.geo)::jsonb end,
    'max_radius_km', (select l.max_radius_km_override from public.listings l where l.listing_id = p_listing_id),
    'media', v_media,
    'owner', v_owner
  );
end;
$$;

revoke all on function public.get_marketplace_listing_detail(uuid) from public;
grant execute on function public.get_marketplace_listing_detail(uuid) to anon, authenticated;

drop trigger if exists listings_items_image_required_ins on public.listings;
drop trigger if exists listings_items_image_required_upd on public.listings;
drop trigger if exists listing_media_items_image_required_del on public.listing_media;
drop function if exists public.listings_items_image_check();

commit;
