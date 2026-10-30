-- 0461_admin_hierarchy_census — FR-ADMIN-028 layered hierarchy census.
--
-- Read-only aggregate that powers the admin portal "layers" view: a pyramid
-- of visible role-holder strata standing on a masked community base.
--
-- The RPC returns counts only — never identities — for the two layers that
-- are not role-holders:
--   • community_total     every active user on the platform (the masked base);
--   • role_holder_total   distinct active users holding ≥1 active grant
--                         (subtracted from the base so nobody is counted twice);
--   • orgs[].affiliated_count
--                         distinct active users with a volunteer-type
--                         `org_memberships` row in that org and no active grant
--                         there. Memberships are self-declared, so they are
--                         surfaced as an aggregate and never as named people.
--
-- Named role-holders keep flowing through `admin_org_tree` (migration 0203),
-- so identity visibility stays governed by a single RBAC predicate.
--
-- Visibility mirrors `admin_org_tree`: any active grant may call; super_admin
-- sees every org, everyone else only the orgs their own grants reach
-- (platform-scoped grants resolve to the platform org).
--
-- Mapped to spec: FR-ADMIN-028 (docs/SSOT/spec/12_super_admin.md §17).
-- Decision: D-194.

create or replace function public.admin_hierarchy_census()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor        uuid := auth.uid();
  v_is_super     boolean;
  v_platform_org uuid;
  v_result       json;
begin
  -- Same gate as admin_org_tree: the caller must hold at least one active grant.
  if v_actor is null
     or not exists (
       select 1 from public.admin_role_grants g
        where g.user_id = v_actor and g.revoked_at is null
     ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_is_super := public.has_admin_role(v_actor, 'super_admin', null);
  select o.org_id into v_platform_org
    from public.organizations o where o.is_platform limit 1;

  with active_grants as (
    -- Active grants of active users, with platform-scoped grants resolved to
    -- the platform org so every grant belongs to exactly one org.
    select g.user_id, coalesce(g.scope_org_id, v_platform_org) as eff_org
      from public.admin_role_grants g
      join public.users u on u.user_id = g.user_id
     where g.revoked_at is null
       and u.account_status = 'active'
  ),
  visible_orgs as (
    select o.org_id, o.name, o.is_platform, o.verified_at, o.is_verified_nonprofit
      from public.organizations o
     where v_is_super
        or o.org_id in (
          select ag.eff_org from active_grants ag where ag.user_id = v_actor
        )
  ),
  affiliated as (
    -- Volunteer-type memberships that are not already represented by a grant
    -- in the same org (a granted volunteer is a named node, not an aggregate).
    -- Scoped to visible orgs before grouping so scoped callers skip the rest.
    select m.org_id, count(distinct m.user_id)::int as cnt
      from public.org_memberships m
      join visible_orgs vo on vo.org_id = m.org_id
      join public.users u on u.user_id = m.user_id
     where m.role in ('org_volunteer', 'volunteer')
       and u.account_status = 'active'
       and not exists (
         select 1 from active_grants ag
          where ag.user_id = m.user_id and ag.eff_org = m.org_id
       )
     group by m.org_id
  )
  select json_build_object(
    'community_total',
      (select count(*)::int from public.users u where u.account_status = 'active'),
    'role_holder_total',
      (select count(distinct ag.user_id)::int from active_grants ag),
    'orgs',
      coalesce((
        select json_agg(
          json_build_object(
            'org_id',           vo.org_id,
            'name',             vo.name,
            'is_platform',      vo.is_platform,
            'is_verified',      (vo.verified_at is not null or vo.is_verified_nonprofit),
            'affiliated_count', coalesce(a.cnt, 0)
          )
          order by vo.is_platform desc, vo.name
        )
        from visible_orgs vo
        left join affiliated a on a.org_id = vo.org_id
      ), '[]'::json)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_hierarchy_census() from public, anon;
grant execute on function public.admin_hierarchy_census() to authenticated;

comment on function public.admin_hierarchy_census() is
  'Admin-only (any active grant). Aggregate counts for the layered hierarchy view: masked community base, role-holder total, and per-org affiliated volunteers. Org rows are RBAC-scoped like admin_org_tree. FR-ADMIN-028.';
