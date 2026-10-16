-- 0238_drop_glowe_product — Remove GloWe-only schema after product sunset.
-- Historical GloWe migrations (0204–0237) remain applied; this migration drops
-- namespaced tables, views, functions, storage, and the glowe_admin role.
-- KC core (posts, users, rides, chat, content_translations) is unchanged.
-- migration-safety: allow — intentional GloWe product teardown (D-190); glowe_* only.

set search_path = public;

-- ── Admin role cleanup (0209_glowe_admin_role) ─────────────────────────────
drop trigger if exists users_after_insert_glowe_admin_grant on public.users;

delete from public.admin_role_grants where role = 'glowe_admin';

alter table public.admin_role_grants
  drop constraint if exists admin_role_grants_role_check;

alter table public.admin_role_grants
  add constraint admin_role_grants_role_check
  check (role in (
    'super_admin', 'moderator', 'support',
    'operator', 'operators_manager',
    'org_admin', 'org_manager', 'org_employee',
    'volunteer_manager', 'org_volunteer'
  ));

-- ── Storage: glowe-avatars bucket (0219) ────────────────────────────────────
drop policy if exists glowe_avatars_insert_own on storage.objects;
drop policy if exists glowe_avatars_update_own on storage.objects;
drop policy if exists glowe_avatars_delete_own on storage.objects;
drop policy if exists glowe_avatars_read_public on storage.objects;

-- Bucket/object removal is not allowed via SQL (storage.protect_delete); the
-- empty 'glowe-avatars' bucket is removed via the Storage API / dashboard instead.

-- ── Views ───────────────────────────────────────────────────────────────────
drop view if exists public.glowe_public_profiles;

-- ── Tables (FK order: children before parents where needed) ─────────────────
drop table if exists public.glowe_health_checks cascade; -- migration-safety: allow
drop table if exists public.glowe_content_translations cascade; -- migration-safety: allow
drop table if exists public.glowe_forum_replies cascade; -- migration-safety: allow
drop table if exists public.glowe_forum_threads cascade; -- migration-safety: allow
drop table if exists public.glowe_forum_groups cascade; -- migration-safety: allow
drop table if exists public.glowe_offers cascade; -- migration-safety: allow
drop table if exists public.glowe_reports cascade; -- migration-safety: allow
drop table if exists public.glowe_applications cascade; -- migration-safety: allow
drop table if exists public.glowe_saved_items cascade; -- migration-safety: allow
drop table if exists public.glowe_comments cascade; -- migration-safety: allow
drop table if exists public.glowe_posts cascade; -- migration-safety: allow
drop table if exists public.glowe_opportunities cascade; -- migration-safety: allow
drop table if exists public.glowe_projects cascade; -- migration-safety: allow
drop table if exists public.glowe_profiles cascade; -- migration-safety: allow

-- ── Remaining GloWe functions / trigger helpers ─────────────────────────────
do $$
declare
  r record;
begin
  for r in
    select p.oid,
           n.nspname as schema_name,
           p.proname as func_name,
           pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (
        p.proname like 'glowe%'
        or p.proname like '%\_glowe%' escape '\'
        or p.proname like 'trg\_glowe%' escape '\'
        or p.proname = 'is_glowe_admin'
      )
  loop
    execute format(
      'drop function if exists %I.%I(%s) cascade',
      r.schema_name,
      r.func_name,
      r.args
    );
  end loop;
end $$;

comment on schema public is
  'KC public schema; GloWe namespaced objects removed in migration 0238.';
