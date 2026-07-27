-- supabase/tests/0211_glowe_events.sql
-- Regression for migration 0211 (FR-GLOWE-007 events / FR-GLOWE-012 RSVP).
--
-- Events are opportunities with a date; RSVPs are glowe_applications rows. This
-- verifies the additive foundation:
--   • an org can publish an event (opportunity with start_at + event_type)
--   • CHECK constraints reject bad event metadata (event_type, capacity, window)
--   • a client RSVP must start as 'Pending' and may not set server-managed fields
--   • a plain 'Pending' RSVP from the registrant is allowed
--   • the partial unique index blocks a second active RSVP but permits re-RSVP
--     after the prior one is Cancelled
--   • a client may cancel their own RSVP but may NOT self-accept / self-decline
--   • a client may not edit server-managed fields on update
--
-- Runs partly as `authenticated`. Wrapped in a rolled-back transaction;
-- ON_ERROR_STOP=1 means any raise fails the CI step.

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

-- Seed: an org (event author) and two registrants.
do $$
begin
  perform pg_temp.mk_user('00000000-0000-0000-0000-0000000211a1', 'glowe_org11');
  -- Since migration 0236 only an APPROVED organization may publish an event,
  -- so the author needs a matching glowe_profiles row (it was implicit before).
  insert into public.glowe_profiles (id, display_name, account_type, approval_status, onboarding_complete)
  values ('00000000-0000-0000-0000-0000000211a1', 'Org Eleven', 'organization', 'approved', true);

  perform pg_temp.mk_user('00000000-0000-0000-0000-0000000211b1', 'glowe_reg11');
  perform pg_temp.mk_user('00000000-0000-0000-0000-0000000211b2', 'glowe_reg11b');
end $$;

-- ── Org publishes an event (opportunity with date + type) ──
select set_config('request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-0000000211a1', 'role', 'authenticated')::text, true);
set local role authenticated;

insert into public.glowe_opportunities
  (id, user_id, title, organization, location, start_at, end_at, event_type, registration_mode, capacity)
values
  ('opportunity-evt0211', '00000000-0000-0000-0000-0000000211a1', 'Beach Cleanup', 'Org Eleven',
   'Tel Aviv Beach', now() + interval '7 days', now() + interval '7 days' + interval '3 hours',
   'physical', 'gated', 25);

do $$
declare v_row public.glowe_opportunities;
begin
  select * into v_row from public.glowe_opportunities where id = 'opportunity-evt0211';
  if v_row.status <> 'active' then
    raise exception 'ASSERT FAILED: new event should default to active, got %', v_row.status;
  end if;
  if v_row.link_visibility <> 'immediate' then
    raise exception 'ASSERT FAILED: link_visibility should default to immediate';
  end if;
end $$;

-- ── BLOCKED: bad event metadata rejected by CHECK constraints ──
select pg_temp.expect_blocked(
  $q$update public.glowe_opportunities set event_type = 'hybrid' where id = 'opportunity-evt0211'$q$,
  'glowe_opp_event_type_chk');
select pg_temp.expect_blocked(
  $q$update public.glowe_opportunities set capacity = 0 where id = 'opportunity-evt0211'$q$,
  'glowe_opp_capacity_chk');
select pg_temp.expect_blocked(
  $q$update public.glowe_opportunities set end_at = start_at - interval '1 hour' where id = 'opportunity-evt0211'$q$,
  'glowe_opp_event_window_chk');

-- ── Registrant RSVPs to the event ──
reset role;
select set_config('request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-0000000211b1', 'role', 'authenticated')::text, true);
set local role authenticated;

-- BLOCKED: cannot open a registration in a decided state…
select pg_temp.expect_blocked(
  $q$insert into public.glowe_applications (opportunity_id, user_id, status)
     values ('opportunity-evt0211', '00000000-0000-0000-0000-0000000211b1', 'Accepted')$q$,
  'must start as Pending');
-- …and cannot pre-stamp server-managed fields.
select pg_temp.expect_blocked(
  $q$insert into public.glowe_applications (opportunity_id, user_id, status, decided_by)
     values ('opportunity-evt0211', '00000000-0000-0000-0000-0000000211b1', 'Pending',
             '00000000-0000-0000-0000-0000000211b1')$q$,
  'server-managed fields');

-- ALLOWED: a plain Pending RSVP with form fields.
insert into public.glowe_applications
  (opportunity_id, user_id, status, submitted_email, submitted_comment)
values
  ('opportunity-evt0211', '00000000-0000-0000-0000-0000000211b1', 'Pending',
   'reg11@test.local', 'Excited to help');

-- BLOCKED: a second active RSVP for the same (event, user) hits the unique index.
select pg_temp.expect_blocked(
  $q$insert into public.glowe_applications (opportunity_id, user_id, status)
     values ('opportunity-evt0211', '00000000-0000-0000-0000-0000000211b1', 'Pending')$q$,
  'glowe_applications_active_uniq', 'duplicate key');

-- BLOCKED: registrant cannot self-accept or self-decline.
select pg_temp.expect_blocked(
  $q$update public.glowe_applications set status = 'Accepted'
     where opportunity_id = 'opportunity-evt0211' and user_id = '00000000-0000-0000-0000-0000000211b1'$q$,
  'clients may only cancel');
-- BLOCKED: registrant cannot edit server-managed fields.
select pg_temp.expect_blocked(
  $q$update public.glowe_applications set rejection_note = 'self note'
     where opportunity_id = 'opportunity-evt0211' and user_id = '00000000-0000-0000-0000-0000000211b1'$q$,
  'server-managed fields');

-- ALLOWED: registrant cancels their own RSVP…
update public.glowe_applications set status = 'Cancelled'
 where opportunity_id = 'opportunity-evt0211' and user_id = '00000000-0000-0000-0000-0000000211b1';

-- …and may re-RSVP afterwards (partial unique index excludes the Cancelled row).
insert into public.glowe_applications (opportunity_id, user_id, status)
values ('opportunity-evt0211', '00000000-0000-0000-0000-0000000211b1', 'Pending');

do $$
declare v_active int;
begin
  select count(*) into v_active
    from public.glowe_applications
   where opportunity_id = 'opportunity-evt0211'
     and user_id = '00000000-0000-0000-0000-0000000211b1'
     and status = 'Pending';
  if v_active <> 1 then
    raise exception 'ASSERT FAILED: expected exactly 1 active RSVP after re-register, got %', v_active;
  end if;
end $$;

do $$
begin
  raise notice '✓ 0211: events extend opportunities; RSVP lifecycle guarded against client self-decide';
end $$;

reset role;
rollback;

\echo '✓ 0211 glowe events/RSVP regression test passed'
