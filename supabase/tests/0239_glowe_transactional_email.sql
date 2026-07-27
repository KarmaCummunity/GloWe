-- supabase/tests/0239_glowe_transactional_email.sql
-- Regression for migration 0239 (FR-GLOWE-003 AC9, FR-GLOWE-012 AC9).
--
-- Pins the outbox enqueue rules:
--   • org approve / reject → org_approved / org_rejected row
--   • application accept / decline → application_* row
--   • waitlist promotion (no seat) → no email
--   • dedupe_key prevents duplicate rows for the same decision
--
-- Does not assert pg_net delivery (local CI may lack app.settings.*).
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

create or replace function pg_temp.act_as(p_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', p_id::text, 'role', 'authenticated')::text, true);
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed
-- ═══════════════════════════════════════════════════════════════════════════
do $$
begin
  perform pg_temp.mk_user('00000000-0000-0000-0000-000000238a01', 'glowe_org38a');
  insert into public.glowe_profiles (id, display_name, account_type, approval_status, onboarding_complete, org_contact_email)
  values ('00000000-0000-0000-0000-000000238a01', 'Org Thirty-Eight A', 'organization', 'pending', true, 'org38a@test.local');

  perform pg_temp.mk_user('00000000-0000-0000-0000-000000238a02', 'glowe_org38b');
  insert into public.glowe_profiles (id, display_name, account_type, approval_status, onboarding_complete, org_contact_email)
  values ('00000000-0000-0000-0000-000000238a02', 'Org Thirty-Eight B', 'organization', 'pending', true, 'org38b@test.local');

  perform pg_temp.mk_user('00000000-0000-0000-0000-0000000238ad', 'glowe_admin38');
  insert into public.admin_role_grants (user_id, role)
  values ('00000000-0000-0000-0000-0000000238ad', 'glowe_admin');

  perform pg_temp.mk_user('00000000-0000-0000-0000-000000238b01', 'glowe_org38live');
  insert into public.glowe_profiles (id, display_name, account_type, approval_status, onboarding_complete)
  values ('00000000-0000-0000-0000-000000238b01', 'Org Thirty-Eight Live', 'organization', 'approved', true);

  perform pg_temp.mk_user('00000000-0000-0000-0000-000000238c01', 'glowe_vol38a');
  perform pg_temp.mk_user('00000000-0000-0000-0000-000000238c02', 'glowe_vol38b');
  insert into public.glowe_profiles (id, display_name, account_type, onboarding_complete, email)
  values
    ('00000000-0000-0000-0000-000000238c01', 'Vol 38a', 'individual', true, 'glowe_vol38a@test.local'),
    ('00000000-0000-0000-0000-000000238c02', 'Vol 38b', 'individual', true, 'glowe_vol38b@test.local');
end $$;

-- ── Org rejection enqueues org_rejected with note in payload ──
select pg_temp.act_as('00000000-0000-0000-0000-0000000238ad');
set local role authenticated;

select public.glowe_set_org_approval(
  '00000000-0000-0000-0000-000000238a01', 'rejected', '  Please add a valid registration number  ');

reset role;

do $$
declare v_n int;
begin
  select count(*) into v_n
    from public.glowe_email_outbox
   where template = 'org_rejected'
     and to_email = 'org38a@test.local'
     and dedupe_key = 'glowe_email:org_rejected:00000000-0000-0000-0000-000000238a01'
     and payload->>'note' = 'Please add a valid registration number';
  if v_n <> 1 then
    raise exception 'ASSERT FAILED: expected 1 org_rejected outbox row, got %', v_n;
  end if;
end $$;

-- ── Org approval enqueues org_approved ──
select pg_temp.act_as('00000000-0000-0000-0000-0000000238ad');
set local role authenticated;

select public.glowe_set_org_approval(
  '00000000-0000-0000-0000-000000238a02', 'approved', null);

reset role;

do $$
declare v_n int;
begin
  select count(*) into v_n
    from public.glowe_email_outbox
   where template = 'org_approved'
     and to_email = 'org38b@test.local'
     and dedupe_key = 'glowe_email:org_approved:00000000-0000-0000-0000-000000238a02';
  if v_n <> 1 then
    raise exception 'ASSERT FAILED: expected 1 org_approved outbox row, got %', v_n;
  end if;
end $$;

-- ── Application accept / decline enqueue applicant emails ──
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000238b01');
set local role authenticated;

insert into public.glowe_opportunities (
  id, user_id, title, organization, registration_mode, status
) values (
  'opportunity-email38', '00000000-0000-0000-0000-000000238b01',
  'Gated shift', 'Org Thirty-Eight Live', 'gated', 'active'
);

select pg_temp.act_as('00000000-0000-0000-0000-000000238c01');
set local role authenticated;

do $$
declare
  v_app public.glowe_applications;
begin
  v_app := public.glowe_apply_to_opportunity('opportunity-email38');
  if v_app.status <> 'Pending' then
    raise exception 'ASSERT FAILED: expected Pending application, got %', v_app.status;
  end if;
  perform set_config('test.app_id_accept', v_app.id::text, true);
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-000000238b01');
set local role authenticated;

select public.glowe_update_application_status(
  current_setting('test.app_id_accept')::uuid, 'Accepted');

reset role;

do $$
declare
  v_n int;
begin
  select count(*) into v_n
    from public.glowe_email_outbox
   where template = 'application_accepted'
     and dedupe_key = 'glowe_email:application_accepted:' || current_setting('test.app_id_accept');
  if v_n <> 1 then
    raise exception 'ASSERT FAILED: expected 1 application_accepted outbox row, got %', v_n;
  end if;
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-000000238c02');
set local role authenticated;

do $$
declare
  v_app public.glowe_applications;
begin
  v_app := public.glowe_apply_to_opportunity('opportunity-email38');
  perform set_config('test.app_id_decline', v_app.id::text, true);
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-000000238b01');
set local role authenticated;

select public.glowe_update_application_status(
  current_setting('test.app_id_decline')::uuid, 'Declined');

reset role;

do $$
declare
  v_n int;
begin
  select count(*) into v_n
    from public.glowe_email_outbox
   where template = 'application_declined'
     and to_email = 'glowe_vol38b@test.local'
     and dedupe_key = 'glowe_email:application_declined:' || current_setting('test.app_id_decline');
  if v_n <> 1 then
    raise exception 'ASSERT FAILED: expected 1 application_declined outbox row, got %', v_n;
  end if;
end $$;

-- ── Waitlisted promotion does not enqueue ──
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000238b01');
set local role authenticated;

insert into public.glowe_opportunities (
  id, user_id, title, organization, registration_mode, capacity, status
) values (
  'opportunity-cap38', '00000000-0000-0000-0000-000000238b01',
  'One seat', 'Org Thirty-Eight Live', 'open', 1, 'active'
);

select pg_temp.act_as('00000000-0000-0000-0000-000000238c01');
set local role authenticated;

do $$
begin
  perform public.glowe_apply_to_opportunity('opportunity-cap38');
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-000000238c02');
set local role authenticated;

do $$
declare
  v_app2 public.glowe_applications;
begin
  v_app2 := public.glowe_apply_to_opportunity('opportunity-cap38');
  if v_app2.status <> 'Waitlisted' then
    raise exception 'ASSERT FAILED: second applicant should be Waitlisted, got %', v_app2.status;
  end if;
  perform set_config('test.app_id_wait', v_app2.id::text, true);
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-000000238b01');
set local role authenticated;

do $$
declare
  v_row public.glowe_applications;
begin
  v_row := public.glowe_update_application_status(
    current_setting('test.app_id_wait')::uuid, 'Accepted');
  if v_row.status <> 'Waitlisted' then
    raise exception 'ASSERT FAILED: accept at capacity should stay Waitlisted, got %', v_row.status;
  end if;
end $$;

reset role;

do $$
declare
  v_n int;
begin
  select count(*) into v_n
    from public.glowe_email_outbox
   where dedupe_key = 'glowe_email:application_accepted:' || current_setting('test.app_id_wait');
  if v_n <> 0 then
    raise exception 'ASSERT FAILED: waitlist promotion must not enqueue email, got % rows', v_n;
  end if;
end $$;

-- ── enqueue_glowe_email dedupe ──
do $$
declare v_id1 uuid; v_id2 uuid; v_n int;
begin
  v_id1 := public.enqueue_glowe_email('org_approved', 'dedupe@test.local', '{}'::jsonb, 'glowe_email:test:dedupe');
  v_id2 := public.enqueue_glowe_email('org_approved', 'dedupe@test.local', '{}'::jsonb, 'glowe_email:test:dedupe');
  if v_id1 is null or v_id2 is not null then
    raise exception 'ASSERT FAILED: dedupe should return id once then null (got %, %)', v_id1, v_id2;
  end if;
  select count(*) into v_n from public.glowe_email_outbox where dedupe_key = 'glowe_email:test:dedupe';
  if v_n <> 1 then
    raise exception 'ASSERT FAILED: expected 1 deduped row, got %', v_n;
  end if;
end $$;

do $$ begin
  raise notice '✓ 0239: transactional email outbox enqueues on org + application decisions';
end $$;

rollback;

\echo '✓ 0239 glowe transactional-email regression test passed'
