-- 0237_glowe_unified_registration — one registration path for volunteering
-- opportunities and events, with capacity honoured at every decision point.
--
-- Before this migration the two halves of FR-GLOWE-012 had drifted apart:
--
--   Events (start_at set)        Plain opportunities (start_at null)
--   ───────────────────────      ──────────────────────────────────
--   apply  glowe_register_for_event   direct INSERT from the browser
--          → honours registration_mode  → always 'Pending', registration_mode
--          → ignores capacity              ignored entirely
--   decide glowe_decide_event_registration  glowe_update_application_status
--          → capacity-aware waitlist        → no capacity awareness
--
-- Two consequences. First, an organization could not offer a plain volunteering
-- opportunity on "everyone can join" terms — `registration_mode` existed on the
-- row but nothing read it outside the event path, so every applicant landed at
-- 'Pending' regardless. Second, capacity was enforced only when an organizer
-- accepted an event registration by hand; open-mode events could be filled past
-- their stated capacity, and a plain opportunity could always be overfilled.
--
-- This migration collapses both paths onto:
--   • glowe_next_waitlist_position() — the single seat-allocation rule, extracted
--     from the inline logic in migration 0213 and now shared by all three
--     callers, so "what happens when the last seat is taken" is defined once.
--   • glowe_apply_to_opportunity()  — one apply entry point for both kinds.
--     glowe_register_for_event() becomes a thin wrapper so existing callers and
--     the 0212/0213/0214 regression tests keep working unchanged.
--   • glowe_update_application_status() gains the same capacity routing that
--     the event decision RPC already had.
--
-- Mapped to spec: FR-GLOWE-012 AC5-AC8 (unified registration + capacity),
--   FR-GLOWE-007-C. Decision: D-186.

set search_path = public;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Seat allocation — the one rule
-- ═══════════════════════════════════════════════════════════════════════════
-- Returns NULL when a seat is free (caller should Accept), otherwise the next
-- waitlist position (caller should Waitlist). An opportunity with no capacity
-- set is unlimited and always returns NULL.
--
-- SECURITY DEFINER because glowe_applications is RLS-private to its author: an
-- organizer counting seats must be able to see rows they do not own. The
-- function returns only an integer, never another user's data.
create or replace function public.glowe_next_waitlist_position(
  p_opportunity_id text,
  p_capacity       int
)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_capacity is null then null
    when (
      select count(*)
        from public.glowe_applications
       where opportunity_id = p_opportunity_id
         and status = 'Accepted'
    ) < p_capacity then null
    else coalesce((
      select max(waitlist_position)
        from public.glowe_applications
       where opportunity_id = p_opportunity_id
         and status = 'Waitlisted'
    ), 0) + 1
  end;
$$;

comment on function public.glowe_next_waitlist_position(text, int) is
  'NULL when a seat is free, else the next waitlist position. Single source of the GloWe capacity rule. FR-GLOWE-012.';

revoke all on function public.glowe_next_waitlist_position(text, int) from public, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Unified apply entry point
-- ═══════════════════════════════════════════════════════════════════════════
-- Serves both kinds. The caller supplies whichever field set its form collects:
-- events gather contact details, plain opportunities gather availability /
-- skills / motivation. Unused arguments stay null.
--
-- Routing:
--   registration_mode = 'open'   → Accepted, or Waitlisted when capacity is full
--   registration_mode = 'gated'  → Pending, for the owner to decide one by one
create or replace function public.glowe_apply_to_opportunity(
  p_opportunity_id text,
  p_email          text default null,
  p_phone          text default null,
  p_comment        text default null,
  p_availability   text default null,
  p_skills         text default null,
  p_motivation     text default null
)
returns public.glowe_applications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_opp    public.glowe_opportunities;
  v_pos    int;
  v_status text;
  v_row    public.glowe_applications;
begin
  if v_uid is null then
    raise exception 'forbidden: sign in to register' using errcode = '42501';
  end if;

  select * into v_opp from public.glowe_opportunities where id = p_opportunity_id;
  if not found then
    raise exception 'not found: opportunity % does not exist', p_opportunity_id using errcode = 'P0002';
  end if;
  if v_opp.status <> 'active' then
    raise exception 'closed: this listing is not open for registration' using errcode = '22023';
  end if;
  -- Only events have a date to expire against; a plain opportunity is open
  -- until its owner closes or cancels it.
  if v_opp.start_at is not null and coalesce(v_opp.end_at, v_opp.start_at) < now() then
    raise exception 'closed: event has already ended' using errcode = '22023';
  end if;
  if v_opp.user_id = v_uid then
    raise exception 'invalid: you cannot register for your own listing' using errcode = '22023';
  end if;

  if v_opp.registration_mode = 'open' then
    v_pos    := public.glowe_next_waitlist_position(p_opportunity_id, v_opp.capacity);
    v_status := case when v_pos is null then 'Accepted' else 'Waitlisted' end;
  else
    v_pos    := null;
    v_status := 'Pending';
  end if;

  begin
    insert into public.glowe_applications (
      user_id, opportunity_id, status,
      submitted_email, submitted_phone, submitted_comment,
      availability, skills, motivation,
      waitlist_position, decided_at
    ) values (
      v_uid, p_opportunity_id, v_status,
      nullif(btrim(p_email), ''), nullif(btrim(p_phone), ''), nullif(btrim(p_comment), ''),
      nullif(btrim(p_availability), ''), nullif(btrim(p_skills), ''), nullif(btrim(p_motivation), ''),
      v_pos,
      -- Open mode is an immediate decision; gated mode is still awaiting one.
      case when v_status = 'Pending' then null else now() end
    )
    returning * into v_row;
  exception when unique_violation then
    raise exception 'duplicate: you already have an active registration for this listing'
      using errcode = '23505';
  end;

  return v_row;
end $$;

comment on function public.glowe_apply_to_opportunity(text, text, text, text, text, text, text) is
  'Single apply/RSVP entry point for volunteering opportunities and events. Honours registration_mode and capacity. FR-GLOWE-012 AC5.';

revoke all on function public.glowe_apply_to_opportunity(text, text, text, text, text, text, text) from public;
grant execute on function public.glowe_apply_to_opportunity(text, text, text, text, text, text, text) to authenticated;

-- ── Backwards-compatible event wrapper ──────────────────────────────────────
-- Kept so existing callers (backend.registerForEvent) and the 0212/0213/0214
-- regression tests keep working. It adds back the one check the unified RPC
-- cannot make: that the target really is an event.
create or replace function public.glowe_register_for_event(
  p_opportunity_id text,
  p_email          text default null,
  p_phone          text default null,
  p_comment        text default null
)
returns public.glowe_applications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_is_event boolean;
begin
  select start_at is not null into v_is_event
    from public.glowe_opportunities where id = p_opportunity_id;
  if v_is_event is null then
    raise exception 'not found: event % does not exist', p_opportunity_id using errcode = 'P0002';
  end if;
  if not v_is_event then
    raise exception 'invalid: opportunity % is not an event', p_opportunity_id using errcode = '22023';
  end if;

  return public.glowe_apply_to_opportunity(
    p_opportunity_id, p_email, p_phone, p_comment, null, null, null
  );
end $$;

comment on function public.glowe_register_for_event(text, text, text, text) is
  'Event-only wrapper around glowe_apply_to_opportunity(). Retained for existing callers. FR-GLOWE-007-C.';

revoke all on function public.glowe_register_for_event(text, text, text, text) from public;
grant execute on function public.glowe_register_for_event(text, text, text, text) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Decision RPCs adopt the shared seat rule
-- ═══════════════════════════════════════════════════════════════════════════
-- Behaviour-identical to migration 0213, with the inline count/max query
-- replaced by glowe_next_waitlist_position() so the rule lives in one place.
create or replace function public.glowe_decide_event_registration(
  p_registration_id uuid,
  p_decision        text,
  p_note            text default null
)
returns public.glowe_applications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_app    public.glowe_applications;
  v_event  public.glowe_opportunities;
  v_pos    int;
  v_status text;
  v_row    public.glowe_applications;
begin
  if v_uid is null then
    raise exception 'forbidden: sign in' using errcode = '42501';
  end if;
  if p_decision not in ('accept', 'decline') then
    raise exception 'invalid: decision must be accept or decline' using errcode = '22023';
  end if;

  select * into v_app from public.glowe_applications where id = p_registration_id;
  if not found then
    raise exception 'not found: registration does not exist' using errcode = 'P0002';
  end if;

  select * into v_event from public.glowe_opportunities where id = v_app.opportunity_id;
  if v_event.user_id is distinct from v_uid then
    raise exception 'forbidden: not the event organizer' using errcode = '42501';
  end if;

  if v_app.status not in ('Pending', 'Waitlisted') then
    raise exception 'invalid: registration is not awaiting a decision (status %)', v_app.status using errcode = '22023';
  end if;

  if p_decision = 'decline' then
    if nullif(btrim(coalesce(p_note, '')), '') is null then
      raise exception 'invalid: a rejection reason is required' using errcode = '22023';
    end if;
    if char_length(p_note) > 500 then
      raise exception 'invalid: rejection reason too long (max 500)' using errcode = '22023';
    end if;
    update public.glowe_applications
       set status = 'Declined', rejection_note = btrim(p_note),
           decided_at = now(), decided_by = v_uid, waitlist_position = null
     where id = p_registration_id
     returning * into v_row;
    return v_row;
  end if;

  v_pos    := public.glowe_next_waitlist_position(v_app.opportunity_id, v_event.capacity);
  v_status := case when v_pos is null then 'Accepted' else 'Waitlisted' end;
  -- Someone already on the waitlist keeps their place when the accept cannot be
  -- honoured; otherwise the organizer pressing Accept on a full event would send
  -- that person to the back of the queue.
  if v_status = 'Waitlisted' and v_app.waitlist_position is not null then
    v_pos := v_app.waitlist_position;
  end if;

  update public.glowe_applications
     set status = v_status, waitlist_position = v_pos, rejection_note = null,
         decided_at = now(), decided_by = v_uid
   where id = p_registration_id
   returning * into v_row;
  return v_row;
end $$;

revoke all on function public.glowe_decide_event_registration(uuid, text, text) from public;
grant execute on function public.glowe_decide_event_registration(uuid, text, text) to authenticated;

-- Plain volunteering applications gain the same capacity routing. Previously an
-- owner could accept past capacity because this RPC never looked at it, so a
-- 10-seat opportunity and a 10-seat event behaved differently for no reason.
create or replace function public.glowe_update_application_status(
  p_application_id uuid,
  p_decision       text
)
returns public.glowe_applications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_app    public.glowe_applications;
  v_opp    public.glowe_opportunities;
  v_pos    int;
  v_status text;
  v_row    public.glowe_applications;
begin
  if v_uid is null then
    raise exception 'forbidden: sign in' using errcode = '42501';
  end if;
  if p_decision not in ('Accepted', 'Declined') then
    raise exception 'invalid: decision must be Accepted or Declined' using errcode = '22023';
  end if;

  select * into v_app from public.glowe_applications where id = p_application_id;
  if not found then
    raise exception 'not found: application does not exist' using errcode = 'P0002';
  end if;

  select * into v_opp from public.glowe_opportunities where id = v_app.opportunity_id;
  if v_opp.user_id is distinct from v_uid then
    raise exception 'forbidden: not the opportunity owner' using errcode = '42501';
  end if;

  if p_decision = 'Declined' then
    v_status := 'Declined';
    v_pos    := null;
  else
    v_pos    := public.glowe_next_waitlist_position(v_app.opportunity_id, v_opp.capacity);
    v_status := case when v_pos is null then 'Accepted' else 'Waitlisted' end;
    -- Keep an existing waitlist place (see the event RPC above): pressing Accept
    -- on a full listing must not demote the person the owner tried to let in.
    if v_status = 'Waitlisted' and v_app.waitlist_position is not null then
      v_pos := v_app.waitlist_position;
    end if;
  end if;

  update public.glowe_applications
     set status = v_status, waitlist_position = v_pos,
         decided_at = now(), decided_by = v_uid
   where id = p_application_id
   returning * into v_row;
  return v_row;
end $$;

revoke all on function public.glowe_update_application_status(uuid, text) from public;
grant execute on function public.glowe_update_application_status(uuid, text) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Owner inbox exposes the waitlist position
-- ═══════════════════════════════════════════════════════════════════════════
-- Plain opportunities can now produce Waitlisted rows, so the owner's inbox
-- needs the position to promote people in the order they signed up. Adding a
-- column to the RETURNS TABLE changes the function's result type, which
-- CREATE OR REPLACE cannot do — hence the drop. Body is otherwise migration
-- 0220's, with the waitlist group ordered by position instead of by date.
drop function if exists public.glowe_list_applications_for_opportunity(text);

create function public.glowe_list_applications_for_opportunity(p_opportunity_id text)
returns table (
  id                uuid,
  user_id           uuid,
  status            text,
  availability      text,
  skills            text,
  motivation        text,
  waitlist_position int,
  created_at        timestamptz,
  applicant_name    text,
  applicant_avatar  text,
  applicant_email   text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'forbidden: sign in' using errcode = '42501';
  end if;

  select o.user_id into v_owner from public.glowe_opportunities o where o.id = p_opportunity_id;
  if not found then
    raise exception 'not found: opportunity % does not exist', p_opportunity_id using errcode = 'P0002';
  end if;
  if v_owner is distinct from v_uid then
    raise exception 'forbidden: not the opportunity owner' using errcode = '42501';
  end if;

  return query
    select a.id, a.user_id, a.status, a.availability, a.skills, a.motivation,
           a.waitlist_position, a.created_at,
           coalesce(p.display_name, u.display_name) as applicant_name,
           p.avatar_url as applicant_avatar,
           p.email      as applicant_email
      from public.glowe_applications a
      left join public.glowe_profiles p on p.id = a.user_id
      left join public.users u on u.user_id = a.user_id
     where a.opportunity_id = p_opportunity_id
     order by
       case a.status
         when 'Pending'    then 0
         when 'Accepted'   then 1
         when 'Waitlisted' then 2
         when 'Declined'   then 3
         when 'Cancelled'  then 4
         else 5
       end,
       coalesce(a.waitlist_position, 0) asc,
       a.created_at asc;
end $$;

comment on function public.glowe_list_applications_for_opportunity(text) is
  'Opportunity owner applicants inbox, including waitlist_position. FR-GLOWE-012 AC1.';

revoke all on function public.glowe_list_applications_for_opportunity(text) from public;
grant execute on function public.glowe_list_applications_for_opportunity(text) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Supporting index
-- ═══════════════════════════════════════════════════════════════════════════
-- glowe_next_waitlist_position() runs on every apply and every decision, and
-- both of its subqueries filter on (opportunity_id, status).
create index if not exists glowe_applications_opportunity_status_idx
  on public.glowe_applications (opportunity_id, status);
