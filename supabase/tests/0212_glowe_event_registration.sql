-- supabase/tests/0212_glowe_event_registration.sql
-- Regression for migration 0212 (FR-GLOWE-007-C registration flow).
--
-- Verifies the glowe_register_for_event SECURITY DEFINER RPC:
--   • open-mode event → registrant row is instantly 'Accepted' (decided_at set)
--   • gated-mode event → registrant row is 'Pending'
--   • a plain (non-event) opportunity is rejected
--   • a cancelled event is rejected
--   • a past event is rejected
--   • a second active registration for the same (event, user) is rejected
--   • re-registration is allowed after the prior row is Cancelled
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

-- Seed: an org (author) and two registrants.
do $$
begin
  perform pg_temp.mk_user('00000000-0000-0000-0000-0000000212a1', 'glowe_org12');
  -- Since migration 0236 only an APPROVED organization may publish an event,
  -- so the author needs a matching glowe_profiles row (it was implicit before).
  insert into public.glowe_profiles (id, display_name, account_type, approval_status, onboarding_complete)
  values ('00000000-0000-0000-0000-0000000212a1', 'Org Twelve', 'organization', 'approved', true);

  perform pg_temp.mk_user('00000000-0000-0000-0000-0000000212b1', 'glowe_reg12');
  perform pg_temp.mk_user('00000000-0000-0000-0000-0000000212b2', 'glowe_reg12b');
end $$;

-- Org publishes: an open event, a gated event, a plain opportunity, a past event,
-- and a cancelled event.
select set_config('request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-0000000212a1', 'role', 'authenticated')::text, true);
set local role authenticated;

insert into public.glowe_opportunities
  (id, user_id, title, organization, location, start_at, end_at, event_type, registration_mode, status)
values
  ('opportunity-evt0212-open', '00000000-0000-0000-0000-0000000212a1', 'Open Beach Cleanup', 'Org Twelve',
   'Tel Aviv', now() + interval '7 days', now() + interval '7 days' + interval '3 hours', 'physical', 'open', 'active'),
  ('opportunity-evt0212-gate', '00000000-0000-0000-0000-0000000212a1', 'Gated Workshop', 'Org Twelve',
   'Haifa', now() + interval '8 days', now() + interval '8 days' + interval '2 hours', 'physical', 'gated', 'active'),
  ('opportunity-evt0212-cancel', '00000000-0000-0000-0000-0000000212a1', 'Cancelled Meetup', 'Org Twelve',
   'Online', now() + interval '9 days', now() + interval '9 days' + interval '1 hour', 'digital', 'open', 'cancelled'),
  ('opportunity-evt0212-past', '00000000-0000-0000-0000-0000000212a1', 'Past Event', 'Org Twelve',
   'Online', now() - interval '9 days', now() - interval '9 days' + interval '1 hour', 'digital', 'open', 'active');

insert into public.glowe_opportunities (id, user_id, title, organization)
values ('opportunity-evt0212-plain', '00000000-0000-0000-0000-0000000212a1', 'Plain Role', 'Org Twelve');

-- ── Registrant uses the RPC ──
reset role;
select set_config('request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-0000000212b1', 'role', 'authenticated')::text, true);
set local role authenticated;

-- ALLOWED: open event → instant Accepted with decided_at stamped and contact stored.
do $$
declare v public.glowe_applications;
begin
  v := public.glowe_register_for_event('opportunity-evt0212-open', 'reg12@test.local', '050-1112222', 'See you there');
  if v.status <> 'Accepted' then
    raise exception 'ASSERT FAILED: open mode should accept instantly, got %', v.status;
  end if;
  if v.decided_at is null then
    raise exception 'ASSERT FAILED: open accept should stamp decided_at';
  end if;
  if v.submitted_email <> 'reg12@test.local' or v.submitted_phone <> '050-1112222' then
    raise exception 'ASSERT FAILED: contact fields not stored';
  end if;
end $$;

-- ALLOWED: gated event → Pending, no decided_at.
do $$
declare v public.glowe_applications;
begin
  v := public.glowe_register_for_event('opportunity-evt0212-gate');
  if v.status <> 'Pending' then
    raise exception 'ASSERT FAILED: gated mode should be Pending, got %', v.status;
  end if;
  if v.decided_at is not null then
    raise exception 'ASSERT FAILED: gated Pending must not stamp decided_at';
  end if;
end $$;

-- BLOCKED: a non-event opportunity cannot be registered.
select pg_temp.expect_blocked(
  $q$select public.glowe_register_for_event('opportunity-evt0212-plain')$q$,
  'is not an event');
-- BLOCKED: a cancelled event.
select pg_temp.expect_blocked(
  $q$select public.glowe_register_for_event('opportunity-evt0212-cancel')$q$,
  'not open for registration');
-- BLOCKED: a past event.
select pg_temp.expect_blocked(
  $q$select public.glowe_register_for_event('opportunity-evt0212-past')$q$,
  'already ended');
-- BLOCKED: a missing event.
select pg_temp.expect_blocked(
  $q$select public.glowe_register_for_event('opportunity-nope')$q$,
  'does not exist');

-- BLOCKED: a second active registration for the open event hits the unique index.
select pg_temp.expect_blocked(
  $q$select public.glowe_register_for_event('opportunity-evt0212-open')$q$,
  'already have an active registration');

-- ALLOWED: registrant cancels their open registration, then re-registers.
update public.glowe_applications set status = 'Cancelled'
 where opportunity_id = 'opportunity-evt0212-open'
   and user_id = '00000000-0000-0000-0000-0000000212b1';
do $$
declare v public.glowe_applications;
begin
  v := public.glowe_register_for_event('opportunity-evt0212-open');
  if v.status <> 'Accepted' then
    raise exception 'ASSERT FAILED: re-register after cancel should accept, got %', v.status;
  end if;
end $$;

-- ── A second user is independent ──
reset role;
select set_config('request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-0000000212b2', 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare v public.glowe_applications;
begin
  v := public.glowe_register_for_event('opportunity-evt0212-open');
  if v.status <> 'Accepted' then
    raise exception 'ASSERT FAILED: second user open register should accept, got %', v.status;
  end if;
end $$;

-- BLOCKED: anonymous (no jwt sub) cannot register.
reset role;
select set_config('request.jwt.claims', jsonb_build_object('role', 'anon')::text, true);
set local role anon;
select pg_temp.expect_blocked(
  $q$select public.glowe_register_for_event('opportunity-evt0212-open')$q$,
  'sign in to register', 'permission denied');

do $$
begin
  raise notice '✓ 0212: event registration RPC routes open→Accepted / gated→Pending and validates event state';
end $$;

reset role;
rollback;

\echo '✓ 0212 glowe event registration regression test passed'
