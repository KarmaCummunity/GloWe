-- 0354–0356 advisor cleanup smoke checks (KC#945).

do $$
declare
  v_bare integer;
  v_missing_sp integer;
begin
  -- No bare auth.uid() left in the policies we rewrote (qual/with_check text).
  select count(*) into v_bare
    from pg_policies
   where schemaname = 'public'
     and tablename in (
       'listing_user_signals',
       'volunteer_opportunities',
       'volunteer_shifts',
       'volunteer_shift_signups',
       'giving_handoffs',
       'giving_handoff_ratings'
     )
     and (
       (qual is not null and qual ~ 'auth\.uid\(\)' and qual !~ '\(select auth\.uid\(\)\)')
       or (with_check is not null and with_check ~ 'auth\.uid\(\)' and with_check !~ '\(select auth\.uid\(\)\)')
     );

  if v_bare > 0 then
    raise exception 'advisor cleanup: % policies still use bare auth.uid()', v_bare;
  end if;

  -- volunteer_shift_signups should have a single SELECT policy (no dual permissive).
  if (
    select count(*) from pg_policies
     where schemaname = 'public'
       and tablename = 'volunteer_shift_signups'
       and cmd = 'SELECT'
  ) <> 1 then
    raise exception 'advisor cleanup: expected exactly one SELECT policy on volunteer_shift_signups';
  end if;

  -- SECURITY DEFINER functions in public should all pin search_path.
  select count(*) into v_missing_sp
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef
     and (
       p.proconfig is null
       or not exists (
         select 1 from unnest(p.proconfig) as c(cfg)
          where c.cfg like 'search_path=%'
       )
     );

  if v_missing_sp > 0 then
    raise exception 'advisor cleanup: % SECURITY DEFINER functions lack search_path', v_missing_sp;
  end if;

  -- FK indexes from 0355 exist.
  if to_regclass('public.volunteer_shifts_opportunity_idx') is null then
    raise exception 'advisor cleanup: missing volunteer_shifts_opportunity_idx';
  end if;
  if to_regclass('public.giving_handoff_ratings_handoff_idx') is null then
    raise exception 'advisor cleanup: missing giving_handoff_ratings_handoff_idx';
  end if;
end $$;

\echo '✓ 0354_advisor_cleanup.sql passed'
