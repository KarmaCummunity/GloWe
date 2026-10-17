-- 0399: revoke direct DML; cancel restores availability only for single-seat worlds.

begin;

drop policy if exists giving_handoffs_insert_none on public.giving_handoffs;
revoke insert on public.giving_handoffs from authenticated;
revoke update on public.giving_handoffs from authenticated;

-- Multi-seat / multi-slot worlds keep listing open until capacity exhausted elsewhere.
create or replace function public.cancel_giving_handoff(p_handoff_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.giving_handoffs;
begin
  update public.giving_handoffs
     set status = 'cancelled', cancelled_at = now()
   where handoff_id = p_handoff_id
     and status in ('reserved', 'confirmed')
     and (owner_id = auth.uid() or recipient_id = auth.uid())
  returning * into v_row;
  if not found then raise exception 'handoff_not_found' using errcode = 'P0002'; end if;

  if v_row.world_slug in ('items', 'food') then
    update public.listings
       set availability_status = 'immediate', updated_at = now()
     where listing_id = v_row.listing_id and status = 'open';
  end if;
end;
$$;

commit;
