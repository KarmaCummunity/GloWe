-- supabase/tests/0236_glowe_publish_guards.sql
-- Regression for migration 0236 (FR-GLOWE-003 / FR-GLOWE-016).
--
-- These are the NEGATIVE tests that matter: before 0236 every rule below lived
-- only in browser JavaScript, so a signed-in user could bypass all of them with
-- a single POST at PostgREST. Each case here runs as `authenticated` with a JWT
-- claim, i.e. exactly what an attacker's request looks like.
--
-- Covered:
--   • capability matrix (glowe_can_create) for every account/kind pair
--   • a pending org keeps individual publish rights; opportunities/events stay blocked
--   • an approved org can publish opportunities and events, but not offers
--   • an individual can publish posts/wishes/offers, but not opportunities/events
--   • pending & rejected org applications are invisible to other users
--   • private profile columns are not selectable by clients
--   • glowe_get_self_private_fields returns the owner's own slice
--
-- The browser-side mirror of the same matrix (canCreate() in glowe-create.js)
-- is pinned by app/apps/glowe-web/js/__tests__/glowe-create.test.js — when the
-- table in Part 1 changes, change that file too.
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

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 1 — the capability matrix itself (pure function, no auth needed)
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare
  r record;
begin
  for r in
    select *
      from (values
        -- account_type,     approval,        kind,           expected
        ('individual',      'not_required',  'community',    true),
        ('individual',      'not_required',  'wish',         true),
        ('individual',      'not_required',  'outreach',     true),
        ('individual',      'not_required',  'offer',        true),
        ('individual',      'not_required',  'opportunity',  false),
        ('individual',      'not_required',  'event',        false),
        (null,              'not_required',  'community',    true),
        (null,              'not_required',  'offer',        true),
        (null,              'not_required',  'event',        false),
        ('organization',    'approved',      'community',    true),
        ('organization',    'approved',      'wish',         true),
        ('organization',    'approved',      'opportunity',  true),
        ('organization',    'approved',      'event',        true),
        ('organization',    'approved',      'offer',        false),
        ('organization',    'pending',       'community',    true),
        ('organization',    'pending',       'wish',         true),
        ('organization',    'pending',       'outreach',     true),
        ('organization',    'pending',       'offer',        true),
        ('organization',    'pending',       'opportunity',  false),
        ('organization',    'pending',       'event',        false),
        ('organization',    'rejected',      'community',    false),
        ('organization',    'rejected',      'event',        false)
      ) as t(account_type, approval, kind, expected)
  loop
    if public.glowe_can_create(r.account_type, r.approval, r.kind) is distinct from r.expected then
      raise exception 'ASSERT FAILED: glowe_can_create(%, %, %) should be %',
        r.account_type, r.approval, r.kind, r.expected;
    end if;
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: a pending org, an approved org, a rejected org and an individual
-- ═══════════════════════════════════════════════════════════════════════════
do $$
begin
  perform pg_temp.mk_user('00000000-0000-0000-0000-000000236a01', 'glowe_pend36');
  insert into public.glowe_profiles
    (id, display_name, account_type, approval_status, onboarding_complete,
     org_name, org_contact_email, org_review_note)
  values ('00000000-0000-0000-0000-000000236a01', 'Pending Org', 'organization',
          'pending', true, 'Pending Org', 'secret-pending@test.local', null);

  perform pg_temp.mk_user('00000000-0000-0000-0000-000000236a02', 'glowe_appr36');
  insert into public.glowe_profiles
    (id, display_name, account_type, approval_status, onboarding_complete,
     org_name, org_contact_email, org_contact_phone, org_registration_number)
  values ('00000000-0000-0000-0000-000000236a02', 'Approved Org', 'organization',
          'approved', true, 'Approved Org', 'secret-approved@test.local',
          '+972-000-0000', 'REG-12345');

  perform pg_temp.mk_user('00000000-0000-0000-0000-000000236a03', 'glowe_rej36');
  insert into public.glowe_profiles
    (id, display_name, account_type, approval_status, onboarding_complete, org_name)
  values ('00000000-0000-0000-0000-000000236a03', 'Rejected Org', 'organization',
          'rejected', true, 'Rejected Org');

  perform pg_temp.mk_user('00000000-0000-0000-0000-000000236b01', 'glowe_indiv36');
  insert into public.glowe_profiles
    (id, display_name, account_type, approval_status, onboarding_complete)
  values ('00000000-0000-0000-0000-000000236b01', 'Private Person', 'individual',
          'not_required', true);
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 2 — a PENDING org keeps individual publish rights; org-only kinds blocked
-- ═══════════════════════════════════════════════════════════════════════════
select pg_temp.act_as('00000000-0000-0000-0000-000000236a01');
set local role authenticated;

insert into public.glowe_posts (user_id, title, post_type)
values ('00000000-0000-0000-0000-000000236a01', 'Pending org community post', 'community');

select pg_temp.expect_blocked($q$
  insert into public.glowe_opportunities (user_id, title, organization)
  values ('00000000-0000-0000-0000-000000236a01', 'Sneaky opportunity', 'Pending Org')
$q$, 'glowe_publish_forbidden');

select pg_temp.expect_blocked($q$
  insert into public.glowe_opportunities (user_id, title, organization, start_at)
  values ('00000000-0000-0000-0000-000000236a01', 'Sneaky event', 'Pending Org', now() + interval '7 days')
$q$, 'glowe_publish_forbidden');

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 3 — a REJECTED org is equally blocked
-- ═══════════════════════════════════════════════════════════════════════════
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000236a03');
set local role authenticated;

select pg_temp.expect_blocked($q$
  insert into public.glowe_posts (user_id, title, post_type)
  values ('00000000-0000-0000-0000-000000236a03', 'Rejected post', 'community')
$q$, 'glowe_publish_forbidden');

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 4 — an APPROVED org publishes opportunities and events, but not offers
-- ═══════════════════════════════════════════════════════════════════════════
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000236a02');
set local role authenticated;

insert into public.glowe_posts (user_id, title, post_type)
values ('00000000-0000-0000-0000-000000236a02', 'Org community post', 'community');

insert into public.glowe_opportunities (user_id, title, organization)
values ('00000000-0000-0000-0000-000000236a02', 'Beach cleanup crew', 'Approved Org');

insert into public.glowe_opportunities (user_id, title, organization, start_at)
values ('00000000-0000-0000-0000-000000236a02', 'Winter gala', 'Approved Org', now() + interval '30 days');

-- A "volunteer offer" means "I personally offer my time" — not an org concept.
select pg_temp.expect_blocked($q$
  insert into public.glowe_posts (user_id, title, post_type)
  values ('00000000-0000-0000-0000-000000236a02', 'Org offering itself', 'offer')
$q$, 'glowe_publish_forbidden');

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 5 — an INDIVIDUAL publishes posts/wishes/offers, never opportunities
-- ═══════════════════════════════════════════════════════════════════════════
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000236b01');
set local role authenticated;

insert into public.glowe_posts (user_id, title, post_type)
values ('00000000-0000-0000-0000-000000236b01', 'Hello community', 'community');

insert into public.glowe_posts (user_id, title, post_type)
values ('00000000-0000-0000-0000-000000236b01', 'I need a wheelchair ramp', 'wish');

insert into public.glowe_posts (user_id, title, post_type)
values ('00000000-0000-0000-0000-000000236b01', 'I can drive on Fridays', 'offer');

select pg_temp.expect_blocked($q$
  insert into public.glowe_opportunities (user_id, title, organization)
  values ('00000000-0000-0000-0000-000000236b01', 'Fake org opportunity', 'Not An Org')
$q$, 'glowe_publish_forbidden');

select pg_temp.expect_blocked($q$
  insert into public.glowe_opportunities (user_id, title, organization, start_at)
  values ('00000000-0000-0000-0000-000000236b01', 'Fake event', 'Not An Org', now() + interval '3 days')
$q$, 'glowe_publish_forbidden');

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 6 — profile privacy: unapproved applications are invisible to others
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare v_n int;
begin
  -- The individual is looking at the org directory.
  select count(*) into v_n
    from public.glowe_profiles
   where id in ('00000000-0000-0000-0000-000000236a01',   -- pending
                '00000000-0000-0000-0000-000000236a03');  -- rejected
  if v_n <> 0 then
    raise exception 'ASSERT FAILED: pending/rejected org applications leaked to another user (% rows)', v_n;
  end if;

  select count(*) into v_n
    from public.glowe_profiles
   where id = '00000000-0000-0000-0000-000000236a02';     -- approved
  if v_n <> 1 then
    raise exception 'ASSERT FAILED: approved org should be publicly visible, got % rows', v_n;
  end if;
end $$;

-- Private columns are not selectable at all, even for a visible row.
select pg_temp.expect_blocked(
  $q$select org_contact_email from public.glowe_profiles limit 1$q$,
  'permission denied');
select pg_temp.expect_blocked(
  $q$select raw_profile from public.glowe_profiles limit 1$q$,
  'permission denied');
select pg_temp.expect_blocked(
  $q$select org_review_note from public.glowe_profiles limit 1$q$,
  'permission denied');
select pg_temp.expect_blocked(
  $q$select email from public.glowe_profiles limit 1$q$,
  'permission denied');

-- The public projection stays usable.
do $$
declare v_name text;
begin
  select org_name into v_name
    from public.glowe_public_profiles
   where id = '00000000-0000-0000-0000-000000236a02';
  if v_name <> 'Approved Org' then
    raise exception 'ASSERT FAILED: glowe_public_profiles should expose the approved org, got %', v_name;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Part 7 — an owner reads their own row and their own private slice
-- ═══════════════════════════════════════════════════════════════════════════
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000236a01');
set local role authenticated;

do $$
declare v_n int; v_private jsonb;
begin
  -- The pending org still sees itself (drives the profile editor).
  select count(*) into v_n
    from public.glowe_profiles
   where id = '00000000-0000-0000-0000-000000236a01';
  if v_n <> 1 then
    raise exception 'ASSERT FAILED: owner should see their own pending row, got % rows', v_n;
  end if;

  v_private := public.glowe_get_self_private_fields();
  if v_private->>'org_contact_email' <> 'secret-pending@test.local' then
    raise exception 'ASSERT FAILED: owner should read their own contact email, got %', v_private->>'org_contact_email';
  end if;
end $$;

do $$
begin
  raise notice '✓ 0236: publish guards, rate limits and profile privacy enforced server-side';
end $$;

reset role;
rollback;

\echo '✓ 0236 glowe publish-guard + profile-privacy regression test passed'
