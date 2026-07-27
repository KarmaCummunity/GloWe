-- 0236_glowe_publish_guards_and_profile_privacy — move the GloWe publishing
-- rules, profile privacy and content rate limits from the browser into Postgres.
--
-- Until now three product rules existed ONLY as client-side JavaScript:
--   1. An organization is view-only until a reviewer approves it (FR-GLOWE-003).
--   2. Volunteering opportunities and events are published by organizations;
--      a "volunteer offer" is published by an individual (FR-GLOWE-016).
--   3. Nothing capped how fast an account could publish.
-- The create menu in app/apps/glowe-web/js/glowe-create.js hides the wrong
-- buttons, but RLS on glowe_posts / glowe_opportunities (migration 0204) only
-- checks `user_id = auth.uid()`. Any signed-in user could POST straight at
-- PostgREST and publish as an unapproved org, or create an event as a private
-- individual. This migration makes the database the enforcement point.
--
-- It also closes a data-exposure hole: `glowe_profiles` was readable by `anon`
-- with `using (true)` across every column, which published org contact details,
-- registration numbers, the raw_profile PII blob, and — worst — every PENDING
-- and REJECTED organization application together with the reviewer's private
-- `org_review_note`. Profiles now follow the house pattern from migration 0163
-- (users_public): row policy + column-scoped grants + an owner-only RPC.
--
-- Mapped to spec: FR-GLOWE-003 (org approval & view-only enforcement),
--   FR-GLOWE-016 (adaptive create), docs/SSOT/spec/17_glowe_frontend.md.
--   Decisions: D-61, D-66. Closes TD-188.

set search_path = public;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Capability matrix — the single server-side source of truth
-- ═══════════════════════════════════════════════════════════════════════════
-- The browser holds a mirror of this matrix in canCreate() in
-- app/apps/glowe-web/js/glowe-create.js so the create menu can be rendered
-- without a round trip. That mirror decides which buttons to RENDER; this
-- function decides what the database will ACCEPT. Both are pinned to the same
-- table by supabase/tests/0236_glowe_publish_guards.sql and
-- app/apps/glowe-web/js/__tests__/glowe-create.test.js — change all three.
--
-- p_kind is the content kind, not a table:
--   'community' | 'wish' | 'outreach' | 'offer'  → glowe_posts.post_type
--   'opportunity' | 'event'                      → glowe_opportunities
create or replace function public.glowe_can_create(
  p_account_type    text,
  p_approval_status text,
  p_kind            text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- Every comparison goes through coalesce(): an account that skipped
  -- onboarding has a NULL account_type, and a bare `NULL = 'organization'`
  -- would make this function return NULL. `not null` is null, so the caller's
  -- `if not glowe_can_create(...)` would silently NOT raise — i.e. NULL here
  -- means "allow everything". Treat a missing account type as an individual,
  -- matching the client default in glowe-create.js.
  select case
    -- FR-GLOWE-003: an organization stays view-only until a reviewer approves
    -- it. This check comes first so it covers every content kind.
    when coalesce(p_account_type, 'individual') = 'organization'
         and coalesce(p_approval_status, 'not_required') <> 'approved'
      then false

    -- Volunteering opportunities and events are calls FOR volunteers, hosted by
    -- an organization. An event is an opportunity carrying a date (D-66).
    when p_kind in ('opportunity', 'event')
      then coalesce(p_account_type, 'individual') = 'organization'

    -- A volunteer offer is an individual offering their own time.
    when p_kind = 'offer'
      then coalesce(p_account_type, 'individual') <> 'organization'

    -- Needs, community posts and outreach are open to both account types.
    else true
  end;
$$;

comment on function public.glowe_can_create(text, text, text) is
  'GloWe publishing capability matrix. Server-side mirror of CREATE_REGISTRY in glowe-create.js. FR-GLOWE-003 / FR-GLOWE-016.';

grant execute on function public.glowe_can_create(text, text, text) to anon, authenticated;

-- ── Shared assertion used by both publish triggers ──────────────────────────
-- SECURITY INVOKER on purpose: privileged writers (SECURITY DEFINER RPCs, the
-- seed scripts, migrations) run as a non-login role, so `current_user` is
-- neither 'authenticated' nor 'anon' and they skip the check. Same escape hatch
-- as the guards in migrations 0205 and 0211.
create or replace function public.glowe_assert_can_create(p_user_id uuid, p_kind text)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_account  text;
  v_approval text;
begin
  if current_user not in ('authenticated', 'anon') then
    return;
  end if;

  -- Own row: always readable under the profiles policy below, so a plain
  -- SELECT is enough and we avoid a SECURITY DEFINER hop on the write path.
  select account_type, approval_status
    into v_account, v_approval
    from public.glowe_profiles
   where id = p_user_id;

  -- Fail closed: coalesce so an unexpected NULL blocks the write instead of
  -- slipping through (`not null` is null, which would skip this branch).
  if not coalesce(public.glowe_can_create(v_account, v_approval, p_kind), false) then
    raise exception 'glowe_publish_forbidden: % account (approval=%) may not publish %',
      coalesce(v_account, 'individual'), coalesce(v_approval, 'not_required'), p_kind
      using errcode = '42501',
            hint = 'Organizations must be approved before publishing. Opportunities and events are organization-only; volunteer offers are individual-only.';
  end if;
end $$;

comment on function public.glowe_assert_can_create(uuid, text) is
  'Raises 42501 when the account may not publish p_kind. Client roles only; privileged roles bypass. FR-GLOWE-003.';

-- ── Trigger: glowe_posts ────────────────────────────────────────────────────
create or replace function public.trg_glowe_posts_publish_guard()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  perform public.glowe_assert_can_create(new.user_id, coalesce(new.post_type, 'community'));
  return new;
end $$;

drop trigger if exists glowe_posts_publish_guard on public.glowe_posts;
create trigger glowe_posts_publish_guard
  before insert on public.glowe_posts
  for each row execute function public.trg_glowe_posts_publish_guard();

-- ── Trigger: glowe_opportunities ────────────────────────────────────────────
-- glowe_opportunities has no discriminator column: an event is an opportunity
-- that carries a start date (D-66), everything else is plain volunteering.
create or replace function public.trg_glowe_opportunities_publish_guard()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  perform public.glowe_assert_can_create(
    new.user_id,
    case when new.start_at is null then 'opportunity' else 'event' end
  );
  return new;
end $$;

drop trigger if exists glowe_opportunities_publish_guard on public.glowe_opportunities;
create trigger glowe_opportunities_publish_guard
  before insert on public.glowe_opportunities
  for each row execute function public.trg_glowe_opportunities_publish_guard();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Content rate limits (NFR-SEC-009)
-- ═══════════════════════════════════════════════════════════════════════════
-- Reuses enforce_rate_limit() from migration 0162. Caps are per account and
-- deliberately generous: they exist to stop scripted flooding, not to slow a
-- busy organization down. Per-trigger caps come from TG_ARGV so one function
-- serves all three tables.
create or replace function public.trg_glowe_content_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claims text := coalesce(current_setting('request.jwt.claims', true), '');
  v_role   text;
begin
  -- enforce_rate_limit() is revoked from client roles, so this wrapper has to be
  -- SECURITY DEFINER — which makes current_user the function owner and useless
  -- for telling a browser apart from a trusted caller. Read the JWT role claim
  -- instead. PostgREST sets request.jwt.claims on every API request; psql,
  -- migrations and seeds have none, and service-role callers (the seed scripts,
  -- Edge Functions) carry role='service_role'. Only real client traffic is
  -- rate limited.
  if v_claims = '' then
    return new;
  end if;

  begin
    v_role := v_claims::jsonb ->> 'role';
  exception when others then
    v_role := null;  -- unparseable claims: treat as untrusted, fall through
  end;

  if coalesce(v_role, 'authenticated') not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.user_id is not null then
    perform public.enforce_rate_limit(
      'glowe:' || tg_table_name || ':' || new.user_id::text,
      tg_argv[0]::int,
      tg_argv[1]::int
    );
  end if;
  return new;
end $$;

comment on function public.trg_glowe_content_rate_limit() is
  'BEFORE INSERT rate limit for GloWe content. TG_ARGV = (max, window_seconds). Skips non-PostgREST callers. NFR-SEC-009.';

-- 30 posts/hour, 15 opportunities/hour, 40 applications/hour.
drop trigger if exists glowe_posts_rate_limit on public.glowe_posts;
create trigger glowe_posts_rate_limit
  before insert on public.glowe_posts
  for each row execute function public.trg_glowe_content_rate_limit('30', '3600');

drop trigger if exists glowe_opportunities_rate_limit on public.glowe_opportunities;
create trigger glowe_opportunities_rate_limit
  before insert on public.glowe_opportunities
  for each row execute function public.trg_glowe_content_rate_limit('15', '3600');

drop trigger if exists glowe_applications_rate_limit on public.glowe_applications;
create trigger glowe_applications_rate_limit
  before insert on public.glowe_applications
  for each row execute function public.trg_glowe_content_rate_limit('40', '3600');

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Profile privacy — row policy + column grants + owner-only RPC
-- ═══════════════════════════════════════════════════════════════════════════

-- Zero-argument reviewer predicate. is_glowe_admin(uuid) is intentionally not
-- granted to clients (it would let anyone probe an arbitrary uuid); this
-- variant only ever answers about the caller, so it is safe to expose and can
-- be used inside an RLS policy.
create or replace function public.glowe_viewer_is_reviewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.is_glowe_admin(auth.uid()), false);
$$;

comment on function public.glowe_viewer_is_reviewer() is
  'True when the calling user is a GloWe reviewer. Caller-scoped variant of is_glowe_admin() usable in RLS policies.';

revoke all on function public.glowe_viewer_is_reviewer() from public;
grant execute on function public.glowe_viewer_is_reviewer() to anon, authenticated;

-- ── Row policy ──────────────────────────────────────────────────────────────
-- Replaces the blanket `using (true)` from migration 0204. Sub-selects keep the
-- auth.uid() and reviewer lookups as one-time InitPlans instead of per-row calls.
drop policy if exists "glowe public read" on public.glowe_profiles;
drop policy if exists "glowe profiles read" on public.glowe_profiles;
create policy "glowe profiles read" on public.glowe_profiles
  for select to anon, authenticated
  using (
    -- Individuals and not-yet-onboarded accounts are publicly listed.
    account_type is distinct from 'organization'
    -- An organization becomes public only once approved. A pending or rejected
    -- application is private to its owner and to reviewers.
    or approval_status = 'approved'
    -- Owners always see their own row (drives the profile editor).
    or id = (select auth.uid())
    -- Reviewers see every application, decided or not.
    or (select public.glowe_viewer_is_reviewer())
  );

-- ── Column-scoped SELECT (mirrors migration 0163 on public.users) ───────────
-- Row visibility alone is not enough: an approved organization is public, but
-- its contact channel, registration number and the raw_profile PII blob are
-- not. Owners read their own private slice via glowe_get_self_private_fields();
-- reviewers read it through the SECURITY DEFINER admin RPCs in 0206.
revoke select on table public.glowe_profiles from anon, authenticated;

grant select (
  id,
  display_name,
  display_name_en,
  avatar_url,
  account_type,
  approval_status,
  onboarding_complete,
  profile_type,
  profile_status,
  public_link,
  country,
  focus,
  about,
  needs,
  location,
  languages,
  availability,
  skills,
  org_name,
  org_name_en,
  org_website,
  org_country,
  org_field,
  org_description,
  org_size,
  created_at,
  updated_at
) on table public.glowe_profiles to anon, authenticated;

-- ── Documented public projection ────────────────────────────────────────────
-- security_invoker = true so the row policy and column grants above still
-- apply; the view is a readable contract, not a privilege escalation.
create or replace view public.glowe_public_profiles
with (security_invoker = true)
as
select
  id,
  display_name,
  display_name_en,
  avatar_url,
  account_type,
  approval_status,
  onboarding_complete,
  profile_type,
  profile_status,
  public_link,
  country,
  focus,
  about,
  needs,
  location,
  languages,
  availability,
  skills,
  org_name,
  org_name_en,
  org_website,
  org_country,
  org_field,
  org_description,
  org_size,
  created_at,
  updated_at
from public.glowe_profiles;

comment on view public.glowe_public_profiles is
  'Non-PII projection of glowe_profiles for browse/search surfaces. Excludes email, raw_profile, org contact details, registration number and reviewer notes.';

grant select on public.glowe_public_profiles to anon, authenticated;

-- ── Owner-only private slice ────────────────────────────────────────────────
-- The columns revoked above are still WRITABLE by their owner (only SELECT was
-- revoked), so the profile editor keeps working; it just has to read the
-- current values through here instead of `select *`.
create or replace function public.glowe_get_self_private_fields()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'email',                   p.email,
    'raw_profile',             p.raw_profile,
    'org_registration_number', p.org_registration_number,
    'org_contact_name',        p.org_contact_name,
    'org_contact_email',       p.org_contact_email,
    'org_contact_phone',       p.org_contact_phone,
    'org_submitted_at',        p.org_submitted_at,
    'org_reviewed_at',         p.org_reviewed_at,
    'org_review_note',         p.org_review_note
  )
  from public.glowe_profiles p
  where p.id = auth.uid();
$$;

comment on function public.glowe_get_self_private_fields() is
  'Private glowe_profiles columns for auth.uid() only. Complements the column grants; also surfaces org_review_note so a rejected org can read why (FR-GLOWE-003).';

revoke all on function public.glowe_get_self_private_fields() from public;
grant execute on function public.glowe_get_self_private_fields() to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Supporting index
-- ═══════════════════════════════════════════════════════════════════════════
-- The new row policy filters the org directory on (account_type, approval_status);
-- 0205 only indexed the pending-review queue.
create index if not exists glowe_profiles_approved_orgs_idx
  on public.glowe_profiles (created_at desc)
  where account_type = 'organization' and approval_status = 'approved';
