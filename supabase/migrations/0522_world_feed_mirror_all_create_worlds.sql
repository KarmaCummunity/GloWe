-- 0522_world_feed_mirror_all_create_worlds | FR-FEED-020 AC1 / AC4 · D5 · PM decision 2026-11-01 (world feeds)
--
-- The main feed shows every create category (product book §7.3, D5). Items and food already
-- reach it through one mirror post per listing (0466, D-206); this turns the same mirror on
-- for rides, time and housing, backfills their published open listings, and switches the
-- time world to active (product book §5.4 "MVP, live"). Housing stays a portal until ID
-- verification ships (PM decision 2026-11-01, D30): its flag is not touched here, and a
-- housing listing (publishable only with world permission, D30) is mirrored like any other.

begin;

-- ── 1. Every create world mirrors its listings into the main feed ────────────────────
update public.worlds
   set feed_mirror = true
 where slug in ('rides', 'time', 'housing')
   and not feed_mirror;

-- ── 2. Backfill: published open native listings of the newly mirrored worlds ────────
do $$
declare
  r public.listings%rowtype;
begin
  for r in
    select l.*
      from public.listings l
     where l.world_slug in ('rides', 'time', 'housing')
       and l.origin = 'native'
       and l.status = 'open'
       and l.moderation_status = 'published'
       and not exists (select 1 from public.posts p where p.listing_id = l.listing_id)
     order by l.created_at
  loop
    begin
      perform public.listing_feed_mirror_upsert(r);
    exception when others then
      raise warning 'world feed mirror backfill: listing % skipped: %', r.listing_id, sqlerrm;
    end;
  end loop;
end $$;

-- ── 3. Time is an active world (D60) ─────────────────────────────────────────────────
update public.app_flags set enabled = true where key = 'world_time_enabled';

commit;
