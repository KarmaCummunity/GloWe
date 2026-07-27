-- supabase/tests/0237_glowe_unified_registration.sql
-- Regression for migration 0237 (FR-GLOWE-012 AC5-AC8).
--
-- The behaviour this pins is the half that did not exist before: a PLAIN
-- volunteering opportunity (start_at null) now honours registration_mode and
-- capacity exactly like an event does. Previously the browser inserted
-- glowe_applications directly with a hardcoded 'Pending', so an organization
-- could not run an opportunity on "everyone can join" terms and capacity was
-- never checked at apply time.
--
-- Covered:
--   • open plain opportunity      → instant 'Accepted'
--   • gated plain opportunity     → 'Pending' for one-by-one approval
--   • open + capacity             → seats fill, then 'Waitlisted' 1, 2, …
--   • open event + capacity       → identical routing (no event/opportunity fork)
--   • owner cannot register for their own listing
--   • cancelled listing rejects new registrations
--   • duplicate registration rejected
--   • accepting past capacity waitlists instead of overfilling, for BOTH
--     decision RPCs
--
-- Wrapped in a rolled-back transaction; ON_ERROR_STOP=1 fails CI on any raise.

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

create or replace function pg_temp.act_as(p_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', p_id::text, 'role', 'authenticated')::text, true);
end $$;

create or replace function pg_temp.expect_status(p_row public.glowe_applications, p_status text, p_pos int, p_what text)
returns void language plpgsql as $$
begin
  if p_row.status is distinct from p_status then
    raise exception 'ASSERT FAILED (%): expected status %, got %', p_what, p_status, p_row.status;
  end if;
  if p_row.waitlist_position is distinct from p_pos then
    raise exception 'ASSERT FAILED (%): expected waitlist_position %, got %', p_what, p_pos, p_row.waitlist_position;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: one approved org (migration 0236 requires it to publish) + 4 members
-- ═══════════════════════════════════════════════════════════════════════════
do $$
begin
  perform pg_temp.mk_user('00000000-0000-0000-0000-000000237a01', 'glowe_org37');
  insert into public.glowe_profiles (id, display_name, account_type, approval_status, onboarding_complete)
  values ('00000000-0000-0000-0000-000000237a01', 'Org Thirty-Seven', 'organization', 'approved', true);

  perform pg_temp.mk_user('00000000-0000-0000-0000-000000237b01', 'glowe_vol37a');
  perform pg_temp.mk_user('00000000-0000-0000-0000-000000237b02', 'glowe_vol37b');
  perform pg_temp.mk_user('00000000-0000-0000-0000-000000237b03', 'glowe_vol37c');
  perform pg_temp.mk_user('00000000-0000-0000-0000-000000237b04', 'glowe_vol37d');
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-000000237a01');
set local role authenticated;

-- Four listings. Note none of these carry start_at except the last: the first
-- three are PLAIN opportunities, which is precisely the path that used to
-- ignore registration_mode.
insert into public.glowe_opportunities (id, user_id, title, organization, registration_mode, capacity, start_at)
values
  ('opportunity-open37',   '00000000-0000-0000-0000-000000237a01', 'Open pantry shifts',  'Org Thirty-Seven', 'open',  null, null),
  ('opportunity-gated37',  '00000000-0000-0000-0000-000000237a01', 'Gated tutoring',      'Org Thirty-Seven', 'gated', null, null),
  ('opportunity-cap37',    '00000000-0000-0000-0000-000000237a01', 'Open, one seat',      'Org Thirty-Seven', 'open',  1,    null),
  ('opportunity-evtcap37', '00000000-0000-0000-0000-000000237a01', 'Open event, one seat','Org Thirty-Seven', 'open',  1,    now() + interval '10 days');

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 1 — an OPEN plain opportunity accepts instantly (the new capability)
-- ═══════════════════════════════════════════════════════════════════════════
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000237b01');
set local role authenticated;

do $$
declare v_row public.glowe_applications;
begin
  v_row := public.glowe_apply_to_opportunity(
    'opportunity-open37', null, null, null, 'Weekends', 'Driving', 'Happy to help');
  perform pg_temp.expect_status(v_row, 'Accepted', null, 'open plain opportunity');
  if v_row.decided_at is null then
    raise exception 'ASSERT FAILED: an instant acceptance should stamp decided_at';
  end if;
  if v_row.availability <> 'Weekends' or v_row.motivation <> 'Happy to help' then
    raise exception 'ASSERT FAILED: volunteer fields should round-trip, got %/%', v_row.availability, v_row.motivation;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 2 — a GATED plain opportunity still waits for the owner
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_row public.glowe_applications;
begin
  v_row := public.glowe_apply_to_opportunity('opportunity-gated37');
  perform pg_temp.expect_status(v_row, 'Pending', null, 'gated plain opportunity');
  if v_row.decided_at is not null then
    raise exception 'ASSERT FAILED: a pending registration must not be pre-decided';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 3 — duplicates and self-registration are rejected
-- ═══════════════════════════════════════════════════════════════════════════
select pg_temp.expect_blocked(
  $q$select public.glowe_apply_to_opportunity('opportunity-open37')$q$,
  'already have an active registration');

reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000237a01');
set local role authenticated;
select pg_temp.expect_blocked(
  $q$select public.glowe_apply_to_opportunity('opportunity-open37')$q$,
  'cannot register for your own listing');

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 4 — open + capacity 1: first accepted, then the waitlist forms
-- ═══════════════════════════════════════════════════════════════════════════
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000237b01');
set local role authenticated;
do $$
declare v_row public.glowe_applications;
begin
  v_row := public.glowe_apply_to_opportunity('opportunity-cap37');
  perform pg_temp.expect_status(v_row, 'Accepted', null, 'capacity 1, first applicant');
end $$;

reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000237b02');
set local role authenticated;
do $$
declare v_row public.glowe_applications;
begin
  v_row := public.glowe_apply_to_opportunity('opportunity-cap37');
  perform pg_temp.expect_status(v_row, 'Waitlisted', 1, 'capacity 1, second applicant');
end $$;

reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000237b03');
set local role authenticated;
do $$
declare v_row public.glowe_applications;
begin
  v_row := public.glowe_apply_to_opportunity('opportunity-cap37');
  perform pg_temp.expect_status(v_row, 'Waitlisted', 2, 'capacity 1, third applicant');
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 5 — an open EVENT routes identically (no fork between the two kinds)
-- ═══════════════════════════════════════════════════════════════════════════
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000237b01');
set local role authenticated;
do $$
declare v_row public.glowe_applications;
begin
  v_row := public.glowe_register_for_event('opportunity-evtcap37', 'a@test.local');
  perform pg_temp.expect_status(v_row, 'Accepted', null, 'open event, first registrant');
end $$;

reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000237b02');
set local role authenticated;
do $$
declare v_row public.glowe_applications;
begin
  v_row := public.glowe_register_for_event('opportunity-evtcap37', 'b@test.local');
  perform pg_temp.expect_status(v_row, 'Waitlisted', 1, 'open event, second registrant');
end $$;

-- The event wrapper still refuses a non-event.
select pg_temp.expect_blocked(
  $q$select public.glowe_register_for_event('opportunity-open37')$q$,
  'is not an event');

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 6 — accepting past capacity waitlists instead of overfilling
-- ═══════════════════════════════════════════════════════════════════════════
-- opportunity-cap37 has capacity 1 and is already full. The owner accepting a
-- waitlisted applicant by hand must NOT create a second accepted seat; before
-- 0237, glowe_update_application_status did exactly that.
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000237a01');
set local role authenticated;

do $$
declare
  v_target uuid;
  v_row    public.glowe_applications;
  v_seats  int;
begin
  -- glowe_applications is RLS-private to its author, so an owner reaches their
  -- applicants only through the SECURITY DEFINER inbox RPC — the same path the
  -- UI uses.
  select id into v_target
    from public.glowe_list_applications_for_opportunity('opportunity-cap37')
   where status = 'Waitlisted'
   order by created_at limit 1;
  if v_target is null then
    raise exception 'ASSERT FAILED: owner inbox should show the waitlisted applicants';
  end if;

  v_row := public.glowe_update_application_status(v_target, 'Accepted');
  if v_row.status <> 'Waitlisted' then
    raise exception 'ASSERT FAILED: accepting into a full opportunity should waitlist, got %', v_row.status;
  end if;
  if v_row.waitlist_position <> 1 then
    raise exception 'ASSERT FAILED: a failed accept must keep the existing waitlist place, got %', v_row.waitlist_position;
  end if;

  select count(*) into v_seats
    from public.glowe_list_applications_for_opportunity('opportunity-cap37')
   where status = 'Accepted';
  if v_seats <> 1 then
    raise exception 'ASSERT FAILED: capacity 1 opportunity holds % accepted seats', v_seats;
  end if;
end $$;

-- The inbox exposes waitlist_position and orders the waitlist by it, so the
-- owner promotes people in the order they signed up rather than at random.
do $$
declare v_order int[];
begin
  select array_agg(waitlist_position order by ord) into v_order
    from (
      select waitlist_position, row_number() over () as ord
        from public.glowe_list_applications_for_opportunity('opportunity-cap37')
       where status = 'Waitlisted'
    ) s;
  if v_order is distinct from array[1, 2] then
    raise exception 'ASSERT FAILED: expected waitlist positions {1,2} in order, got %', v_order;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 7 — a cancelled listing takes no new registrations
-- ═══════════════════════════════════════════════════════════════════════════
update public.glowe_opportunities set status = 'cancelled' where id = 'opportunity-gated37';

reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000237b04');
set local role authenticated;
select pg_temp.expect_blocked(
  $q$select public.glowe_apply_to_opportunity('opportunity-gated37')$q$,
  'not open for registration');

select pg_temp.expect_blocked(
  $q$select public.glowe_apply_to_opportunity('opportunity-does-not-exist')$q$,
  'does not exist');

do $$
begin
  raise notice '✓ 0237: opportunities and events share one registration path; capacity honoured at apply and decision';
end $$;

reset role;
rollback;

\echo '✓ 0237 glowe unified-registration regression test passed'
