-- 0396: book / complete / rate knowledge lessons via giving_handoffs.

begin;

create or replace function public.book_knowledge_slot(p_listing_id uuid)
returns public.giving_handoffs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_l public.listings;
  v_cap int;
  v_taken int;
  v_row public.giving_handoffs;
  v_start timestamptz;
  v_end timestamptz;
begin
  if v_uid is null then raise exception 'auth_required' using errcode = '42501'; end if;
  select * into v_l from public.listings
   where listing_id = p_listing_id and world_slug = 'knowledge' and status = 'open';
  if not found then raise exception 'listing_not_available' using errcode = 'P0002'; end if;
  if not public.is_listing_visible_to(v_l, v_uid) then
    raise exception 'listing_not_available' using errcode = 'P0002';
  end if;
  if v_l.owner_id = v_uid then raise exception 'own_listing' using errcode = '23514'; end if;
  if v_l.direction <> 'give' then raise exception 'not_offer' using errcode = '23514'; end if;

  v_cap := coalesce((v_l.details->>'slots_available')::int, 1);
  select coalesce(count(*), 0)::int into v_taken
    from public.giving_handoffs
   where listing_id = p_listing_id and world_slug = 'knowledge'
     and status in ('reserved', 'confirmed', 'handed_over');
  if v_taken >= v_cap then raise exception 'slots_exhausted' using errcode = 'P0001'; end if;

  v_start := (v_l.details->>'slot_starts_at')::timestamptz;
  v_end := (v_l.details->>'slot_ends_at')::timestamptz;

  insert into public.giving_handoffs (
    listing_id, owner_id, recipient_id, world_slug, status,
    seats, slot_starts_at, slot_ends_at, confirm_by
  ) values (
    p_listing_id, v_l.owner_id, v_uid, 'knowledge', 'reserved',
    1, v_start, v_end, now() + interval '24 hours'
  )
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.complete_knowledge_session(p_handoff_id uuid)
returns public.giving_handoffs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.giving_handoffs;
begin
  if v_uid is null then raise exception 'auth_required' using errcode = '42501'; end if;
  select * into v_row from public.giving_handoffs
   where handoff_id = p_handoff_id and world_slug = 'knowledge' for update;
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

  begin
    update public.users
       set karma_points = greatest(0, coalesce(karma_points, 0) + 4),
           updated_at = now()
     where user_id = v_row.owner_id;
  exception when undefined_column then null;
  end;

  return v_row;
end;
$$;

-- Ratings already via giving_handoff_ratings (0380); ensure insert policy for rides/knowledge.
drop policy if exists giving_handoff_ratings_insert_participant on public.giving_handoff_ratings;
create policy giving_handoff_ratings_insert_participant on public.giving_handoff_ratings
  for insert to authenticated
  with check (
    rater_id = (select auth.uid())
    and exists (
      select 1 from public.giving_handoffs h
       where h.handoff_id = giving_handoff_ratings.handoff_id
         and h.status = 'handed_over'
         and (h.owner_id = (select auth.uid()) or h.recipient_id = (select auth.uid()))
         and giving_handoff_ratings.ratee_id in (h.owner_id, h.recipient_id)
         and giving_handoff_ratings.ratee_id <> (select auth.uid())
    )
  );

revoke all on function public.book_knowledge_slot(uuid) from public;
revoke all on function public.complete_knowledge_session(uuid) from public;
grant execute on function public.book_knowledge_slot(uuid) to authenticated;
grant execute on function public.complete_knowledge_session(uuid) to authenticated;

commit;
