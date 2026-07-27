-- supabase/tests/0213_glowe_event_organizer_decisions.sql
-- Regression for migration 0213 (FR-GLOWE-007-E organizer portal).
--
-- Verifies glowe_list_event_registrations + glowe_decide_event_registration:
--   • organizer lists their event's registrations (non-owner is blocked)
--   • accept a Pending registration → Accepted, decided_at/decided_by stamped
--   • accept past capacity → Waitlisted with a FIFO waitlist_position
--   • decline requires a reason (empty blocked); with a reason → Declined + note
--   • a rejection reason over 500 chars is blocked
--   • deciding an already-decided registration is blocked
--   • a non-owner cannot decide; anonymous cannot list
--
-- Wrapped in a rolled-back transaction; ON_ERROR_STOP=1 means any raise fails CI.

begin;

create or replace function pg_temp.mk_user(p_id uuid, p_handle text)
returns void language plpgsql as $$
begin
  insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role)
  values (p_id, p_handle || '@test.local', now(),
          jsonb_build_object('full_name', 'Display ' || p_handle),
          jsonb_build_object('provider', 'google'),
          'authenticated', 'authenticated');
  update public.users
     set share_handle = p_handle, display_name = 'Display ' || p_handle,
         account_status = 'active'
   where user_id = p_id;
end $$;

create or replace function pg_temp.expect_blocked(p_sql text, variadic p_expects text[])
returns void language plpgsql as $$
declare v_blocked boolean := false;
begin
  begin
    execute p_sql;
  exception when others then
    v_blocked := true;
    if not exists (select 1 from unnest(p_expects) e where sqlerrm like '%' || e || '%') then
      raise exception 'ASSERT FAILED: expected one of %, got: %', p_expects, sqlerrm;
    end if;
  end;
  if not v_blocked then
    raise exception 'ASSERT FAILED: statement should have been blocked: %', p_sql;
  end if;
end $$;

-- Helper: act as a given user.
create or replace function pg_temp.act_as(p_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', p_id::text, 'role', 'authenticated')::text, true);
end $$;

-- Seed: an org (owner) and three registrants.
do $$
begin
  perform pg_temp.mk_user('00000000-0000-0000-0000-0000000213a1', 'glowe_org13');
  -- Since migration 0236 only an APPROVED organization may publish an event,
  -- so the owner needs a matching glowe_profiles row (it was implicit before).
  insert into public.glowe_profiles (id, display_name, account_type, approval_status, onboarding_complete)
  values ('00000000-0000-0000-0000-0000000213a1', 'Org Thirteen', 'organization', 'approved', true);

  perform pg_temp.mk_user('00000000-0000-0000-0000-0000000213b1', 'glowe_reg13a');
  perform pg_temp.mk_user('00000000-0000-0000-0000-0000000213b2', 'glowe_reg13b');
  perform pg_temp.mk_user('00000000-0000-0000-0000-0000000213b3', 'glowe_reg13c');
end $$;

-- Org publishes a gated event with capacity 1.
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000213a1');
set local role authenticated;
insert into public.glowe_opportunities
  (id, user_id, title, organization, location, start_at, end_at, event_type, registration_mode, status, capacity)
values
  ('opportunity-evt0213', '00000000-0000-0000-0000-0000000213a1', 'Capacity Workshop', 'Org Thirteen',
   'Tel Aviv', now() + interval '7 days', now() + interval '7 days' + interval '2 hours', 'physical', 'gated', 'active', 1);

-- Three registrants RSVP (gated → Pending).
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000213b1');
set local role authenticated;
select public.glowe_register_for_event('opportunity-evt0213');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000213b2');
set local role authenticated;
select public.glowe_register_for_event('opportunity-evt0213');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000213b3');
set local role authenticated;
select public.glowe_register_for_event('opportunity-evt0213');

-- ── Organizer reads the list ──
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000213a1');
set local role authenticated;
do $$
declare v_count int; v_named int;
begin
  select count(*), count(*) filter (where registrant_name is not null)
    into v_count, v_named
    from public.glowe_list_event_registrations('opportunity-evt0213');
  if v_count <> 3 then
    raise exception 'ASSERT FAILED: organizer should see 3 registrations, got %', v_count;
  end if;
  if v_named < 3 then
    raise exception 'ASSERT FAILED: registrant names should be joined, got % named', v_named;
  end if;
end $$;

-- ALLOWED: accept reg13a → Accepted with decided_at/decided_by.
do $$
declare v public.glowe_applications; v_id uuid;
begin
  select id into v_id from public.glowe_list_event_registrations('opportunity-evt0213')
   where user_id = '00000000-0000-0000-0000-0000000213b1';
  v := public.glowe_decide_event_registration(v_id, 'accept');
  if v.status <> 'Accepted' then
    raise exception 'ASSERT FAILED: accept should set Accepted, got %', v.status;
  end if;
  if v.decided_at is null or v.decided_by <> '00000000-0000-0000-0000-0000000213a1' then
    raise exception 'ASSERT FAILED: accept should stamp decided_at/decided_by';
  end if;
end $$;

-- ALLOWED: accept reg13b at capacity → Waitlisted with a position.
do $$
declare v public.glowe_applications; v_id uuid;
begin
  select id into v_id from public.glowe_list_event_registrations('opportunity-evt0213')
   where user_id = '00000000-0000-0000-0000-0000000213b2';
  v := public.glowe_decide_event_registration(v_id, 'accept');
  if v.status <> 'Waitlisted' then
    raise exception 'ASSERT FAILED: accept past capacity should Waitlist, got %', v.status;
  end if;
  if coalesce(v.waitlist_position, 0) < 1 then
    raise exception 'ASSERT FAILED: waitlisted row should carry a waitlist_position';
  end if;
end $$;

-- BLOCKED: decline without a reason.
do $$
declare v_id uuid;
begin
  select id into v_id from public.glowe_list_event_registrations('opportunity-evt0213')
   where user_id = '00000000-0000-0000-0000-0000000213b3';
  perform pg_temp.expect_blocked(
    format($f$select public.glowe_decide_event_registration(%L, 'decline')$f$, v_id),
    'rejection reason is required');
  -- BLOCKED: reason over 500 chars.
  perform pg_temp.expect_blocked(
    format($f$select public.glowe_decide_event_registration(%L, 'decline', %L)$f$, v_id, repeat('x', 501)),
    'too long');
end $$;

-- ALLOWED: decline reg13c with a reason → Declined + rejection_note.
do $$
declare v public.glowe_applications; v_id uuid;
begin
  select id into v_id from public.glowe_list_event_registrations('opportunity-evt0213')
   where user_id = '00000000-0000-0000-0000-0000000213b3';
  v := public.glowe_decide_event_registration(v_id, 'decline', 'Not a fit for this session');
  if v.status <> 'Declined' or v.rejection_note <> 'Not a fit for this session' then
    raise exception 'ASSERT FAILED: decline should set Declined + rejection_note, got % / %', v.status, v.rejection_note;
  end if;
end $$;

-- BLOCKED: deciding an already-Accepted registration again.
do $$
declare v_id uuid;
begin
  select id into v_id from public.glowe_list_event_registrations('opportunity-evt0213')
   where user_id = '00000000-0000-0000-0000-0000000213b1';
  perform pg_temp.expect_blocked(
    format($f$select public.glowe_decide_event_registration(%L, 'accept')$f$, v_id),
    'not awaiting a decision');
  -- BLOCKED: invalid decision keyword.
  perform pg_temp.expect_blocked(
    format($f$select public.glowe_decide_event_registration(%L, 'maybe')$f$, v_id),
    'decision must be accept or decline');
end $$;

-- ── A non-owner cannot read or decide ──
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000213b1');
set local role authenticated;
select pg_temp.expect_blocked(
  $q$select * from public.glowe_list_event_registrations('opportunity-evt0213')$q$,
  'not the event organizer');
-- b1 reads only their own row (owner-only RLS), then tries to decide it — the
-- RPC must still reject because b1 does not own the event.
do $$
declare v_id uuid;
begin
  select id into v_id from public.glowe_applications
   where opportunity_id = 'opportunity-evt0213' and user_id = '00000000-0000-0000-0000-0000000213b1';
  perform pg_temp.expect_blocked(
    format($f$select public.glowe_decide_event_registration(%L, 'accept')$f$, v_id),
    'not the event organizer');
end $$;

-- BLOCKED: anonymous cannot list.
reset role;
select set_config('request.jwt.claims', jsonb_build_object('role', 'anon')::text, true);
set local role anon;
select pg_temp.expect_blocked(
  $q$select * from public.glowe_list_event_registrations('opportunity-evt0213')$q$,
  'sign in', 'permission denied');

do $$
begin
  raise notice '0213 OK: organizer list + accept/decline/capacity-routing verified';
end $$;

reset role;
rollback;

\echo '✓ 0213 glowe event organizer decisions regression test passed'
