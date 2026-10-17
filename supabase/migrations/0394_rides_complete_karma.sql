-- 0394: complete ride trip → handed_over + karma (reuse handoff pattern).

begin;

create or replace function public.complete_ride_trip(p_handoff_id uuid)
returns public.giving_handoffs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.giving_handoffs;
  v_karma int := 5;
begin
  if v_uid is null then raise exception 'auth_required' using errcode = '42501'; end if;
  select * into v_row from public.giving_handoffs
   where handoff_id = p_handoff_id and world_slug = 'rides' for update;
  if not found then raise exception 'handoff_not_found' using errcode = 'P0002'; end if;
  if v_row.owner_id <> v_uid and v_row.recipient_id <> v_uid then
    raise exception 'not_participant' using errcode = '42501';
  end if;
  if v_row.status not in ('reserved', 'confirmed') then
    raise exception 'invalid_status' using errcode = '23514';
  end if;

  update public.giving_handoffs
     set status = 'handed_over', handed_over_at = now(),
         confirmed_at = coalesce(confirmed_at, now())
   where handoff_id = p_handoff_id
  returning * into v_row;

  -- Soft close listing when seats are full after completion.
  update public.listings l
     set status = case
       when (
         select coalesce(sum(h.seats),0) from public.giving_handoffs h
          where h.listing_id = l.listing_id and h.world_slug = 'rides'
            and h.status in ('reserved','confirmed','handed_over')
       ) >= coalesce((l.details->>'seats_available')::int, 1)
       then 'fulfilled' else l.status end,
         updated_at = now()
   where listing_id = v_row.listing_id;

  -- Karma to driver (owner) — best-effort if column exists.
  begin
    update public.users
       set karma_points = greatest(0, coalesce(karma_points, 0) + v_karma),
           updated_at = now()
     where user_id = v_row.owner_id;
  exception when undefined_column then
    null;
  end;

  return v_row;
end;
$$;

revoke all on function public.complete_ride_trip(uuid) from public;
grant execute on function public.complete_ride_trip(uuid) to authenticated;

commit;
