-- supabase/tests/0214_glowe_event_lifecycle.sql
-- Regression for migration 0214 (FR-GLOWE-007 event lifecycle).
--
-- Verifies:
--   • waitlist auto-advance — when an Accepted registrant cancels, the next
--     Waitlisted registrant is promoted to Accepted (waitlist_position cleared)
--   • glowe_get_event_link — owner + Accepted registrant see the link for an
--     'immediate' digital event; a non-accepted registrant does not; a
--     'before_event' link is hidden until within link_reveal_hours of the start
--   • glowe_cancel_event — owner marks the event cancelled; a non-owner cannot
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
     set share_handle = p_handle, display_name = 'Display ' || p_handle, account_status = 'active'
   where user_id = p_id;
end $$;

create or replace function pg_temp.expect_blocked(p_sql text, variadic p_expects text[])
returns void language plpgsql as $$
declare v_blocked boolean := false;
begin
  begin execute p_sql;
  exception when others then
    v_blocked := true;
    if not exists (select 1 from unnest(p_expects) e where sqlerrm like '%' || e || '%') then
      raise exception 'ASSERT FAILED: expected one of %, got: %', p_expects, sqlerrm;
    end if;
  end;
  if not v_blocked then raise exception 'ASSERT FAILED: should have been blocked: %', p_sql; end if;
end $$;

create or replace function pg_temp.act_as(p_id uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', jsonb_build_object('sub', p_id::text, 'role', 'authenticated')::text, true); end $$;

do $$
begin
  perform pg_temp.mk_user('00000000-0000-0000-0000-0000000214a1', 'glowe_org14');
  -- Since migration 0236 only an APPROVED organization may publish an event,
  -- so the author needs a matching glowe_profiles row (it was implicit before).
  insert into public.glowe_profiles (id, display_name, account_type, approval_status, onboarding_complete)
  values ('00000000-0000-0000-0000-0000000214a1', 'Org Fourteen', 'organization', 'approved', true);

  perform pg_temp.mk_user('00000000-0000-0000-0000-0000000214b1', 'glowe_reg14a');
  perform pg_temp.mk_user('00000000-0000-0000-0000-0000000214b2', 'glowe_reg14b');
  perform pg_temp.mk_user('00000000-0000-0000-0000-0000000214b3', 'glowe_reg14c');
end $$;

-- Org publishes: a capacity-1 gated event, and three digital events.
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000214a1');
set local role authenticated;
insert into public.glowe_opportunities
  (id, user_id, title, organization, start_at, end_at, event_type, registration_mode, status, capacity,
   event_link, link_visibility, link_reveal_hours)
values
  ('opportunity-evt0214-cap', '00000000-0000-0000-0000-0000000214a1', 'Cap Event', 'Org14',
   now() + interval '7 days', now() + interval '7 days' + interval '2 hours', 'physical', 'gated', 'active', 1, null, 'immediate', null),
  ('opportunity-evt0214-imm', '00000000-0000-0000-0000-0000000214a1', 'Immediate Link', 'Org14',
   now() + interval '5 days', now() + interval '5 days' + interval '1 hour', 'digital', 'gated', 'active', null,
   'https://meet.example/imm', 'immediate', null),
  ('opportunity-evt0214-bopen', '00000000-0000-0000-0000-0000000214a1', 'Before Open', 'Org14',
   now() + interval '1 hour', now() + interval '2 hours', 'digital', 'gated', 'active', null,
   'https://meet.example/bopen', 'before_event', 24),
  ('opportunity-evt0214-bclosed', '00000000-0000-0000-0000-0000000214a1', 'Before Closed', 'Org14',
   now() + interval '10 days', now() + interval '10 days' + interval '1 hour', 'digital', 'gated', 'active', null,
   'https://meet.example/bclosed', 'before_event', 2);

-- Registrants RSVP (gated → Pending) to the relevant events.
reset role; select pg_temp.act_as('00000000-0000-0000-0000-0000000214b1'); set local role authenticated;
select public.glowe_register_for_event('opportunity-evt0214-cap');
reset role; select pg_temp.act_as('00000000-0000-0000-0000-0000000214b2'); set local role authenticated;
select public.glowe_register_for_event('opportunity-evt0214-cap');
reset role; select pg_temp.act_as('00000000-0000-0000-0000-0000000214b3'); set local role authenticated;
select public.glowe_register_for_event('opportunity-evt0214-imm');
select public.glowe_register_for_event('opportunity-evt0214-bopen');
select public.glowe_register_for_event('opportunity-evt0214-bclosed');
reset role; select pg_temp.act_as('00000000-0000-0000-0000-0000000214b1'); set local role authenticated;
select public.glowe_register_for_event('opportunity-evt0214-imm');  -- b1 stays Pending on imm (not accepted)

-- Org accepts: cap→b1 (Accepted), cap→b2 (Waitlisted, at capacity), and b3 on the digital events.
reset role; select pg_temp.act_as('00000000-0000-0000-0000-0000000214a1'); set local role authenticated;
do $$
declare v_id uuid;
begin
  select id into v_id from public.glowe_list_event_registrations('opportunity-evt0214-cap') where user_id = '00000000-0000-0000-0000-0000000214b1';
  perform public.glowe_decide_event_registration(v_id, 'accept');
  select id into v_id from public.glowe_list_event_registrations('opportunity-evt0214-cap') where user_id = '00000000-0000-0000-0000-0000000214b2';
  perform public.glowe_decide_event_registration(v_id, 'accept');  -- Waitlisted
  select id into v_id from public.glowe_list_event_registrations('opportunity-evt0214-imm') where user_id = '00000000-0000-0000-0000-0000000214b3';
  perform public.glowe_decide_event_registration(v_id, 'accept');
  select id into v_id from public.glowe_list_event_registrations('opportunity-evt0214-bopen') where user_id = '00000000-0000-0000-0000-0000000214b3';
  perform public.glowe_decide_event_registration(v_id, 'accept');
  select id into v_id from public.glowe_list_event_registrations('opportunity-evt0214-bclosed') where user_id = '00000000-0000-0000-0000-0000000214b3';
  perform public.glowe_decide_event_registration(v_id, 'accept');
end $$;

-- Sanity: b2 is Waitlisted before the cancel.
do $$
declare v_status text;
begin
  select status into v_status from public.glowe_list_event_registrations('opportunity-evt0214-cap') where user_id = '00000000-0000-0000-0000-0000000214b2';
  if v_status <> 'Waitlisted' then raise exception 'ASSERT FAILED: b2 should be Waitlisted, got %', v_status; end if;
end $$;

-- b1 cancels their Accepted registration → trigger should advance b2.
reset role; select pg_temp.act_as('00000000-0000-0000-0000-0000000214b1'); set local role authenticated;
update public.glowe_applications set status = 'Cancelled'
 where opportunity_id = 'opportunity-evt0214-cap' and user_id = '00000000-0000-0000-0000-0000000214b1';

-- Verify the advance (read via the organizer RPC).
reset role; select pg_temp.act_as('00000000-0000-0000-0000-0000000214a1'); set local role authenticated;
do $$
declare v_status text; v_pos int;
begin
  select status, waitlist_position into v_status, v_pos
    from public.glowe_list_event_registrations('opportunity-evt0214-cap') where user_id = '00000000-0000-0000-0000-0000000214b2';
  if v_status <> 'Accepted' then raise exception 'ASSERT FAILED: b2 should auto-advance to Accepted, got %', v_status; end if;
  if v_pos is not null then raise exception 'ASSERT FAILED: promoted row should clear waitlist_position'; end if;
end $$;

-- ── Link reveal ──
-- Accepted registrant (b3) sees the immediate link; owner sees it; a Pending (b1) does not.
reset role; select pg_temp.act_as('00000000-0000-0000-0000-0000000214b3'); set local role authenticated;
do $$
begin
  if public.glowe_get_event_link('opportunity-evt0214-imm') <> 'https://meet.example/imm' then
    raise exception 'ASSERT FAILED: accepted registrant should see immediate link';
  end if;
  if public.glowe_get_event_link('opportunity-evt0214-bopen') <> 'https://meet.example/bopen' then
    raise exception 'ASSERT FAILED: before_event link should reveal inside the window';
  end if;
  if public.glowe_get_event_link('opportunity-evt0214-bclosed') is not null then
    raise exception 'ASSERT FAILED: before_event link should be hidden outside the window';
  end if;
end $$;

reset role; select pg_temp.act_as('00000000-0000-0000-0000-0000000214b1'); set local role authenticated;
do $$
begin
  if public.glowe_get_event_link('opportunity-evt0214-imm') is not null then
    raise exception 'ASSERT FAILED: a non-accepted registrant must not see the link';
  end if;
end $$;

reset role; select pg_temp.act_as('00000000-0000-0000-0000-0000000214a1'); set local role authenticated;
do $$
begin
  if public.glowe_get_event_link('opportunity-evt0214-bclosed') <> 'https://meet.example/bclosed' then
    raise exception 'ASSERT FAILED: owner should always see the link';
  end if;
end $$;

-- ── Event cancellation ──
do $$
declare v public.glowe_opportunities;
begin
  v := public.glowe_cancel_event('opportunity-evt0214-imm');
  if v.status <> 'cancelled' then raise exception 'ASSERT FAILED: cancel should set status cancelled, got %', v.status; end if;
end $$;

reset role; select pg_temp.act_as('00000000-0000-0000-0000-0000000214b1'); set local role authenticated;
select pg_temp.expect_blocked(
  $q$select public.glowe_cancel_event('opportunity-evt0214-bopen')$q$,
  'not the event organizer');

reset role; select set_config('request.jwt.claims', jsonb_build_object('role', 'anon')::text, true); set local role anon;
select pg_temp.expect_blocked(
  $q$select public.glowe_cancel_event('opportunity-evt0214-bopen')$q$,
  'sign in', 'permission denied');

do $$
begin
  raise notice '0214 OK: waitlist advance + link reveal + event cancel verified';
end $$;

reset role;
rollback;

\echo '✓ 0214 glowe event lifecycle regression test passed'
