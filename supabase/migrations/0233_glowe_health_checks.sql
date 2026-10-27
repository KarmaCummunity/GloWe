-- 0233_glowe_health_checks — GloWe production synthetic monitoring (INFRA-QA-W7).
--
-- CI/cron probes (service-role REST insert) record per-check outcomes; GloWe
-- admins read the latest summary + recent history via SECURITY DEFINER RPCs.
-- No direct client table access (RLS deny-by-default; service_role + RPCs only).
--
-- Mapped to spec: FR-GLOWE-018 (admin health visibility extension).

set search_path = public;

create table if not exists public.glowe_health_checks (
  id           uuid primary key default gen_random_uuid(),
  run_id       text not null,
  check_name   text not null,
  status       text not null,
  latency_ms   int,
  error_code   text,
  error_detail text,
  app_version  text,
  environment  text not null default 'glowe_prod',
  checked_at   timestamptz not null default now(),
  constraint glowe_health_checks_status_chk
    check (status in ('ok', 'degraded', 'fail')),
  constraint glowe_health_checks_check_name_chk
    check (check_name ~ '^[a-z0-9_]+$')
);

create index if not exists glowe_health_checks_checked_at_idx
  on public.glowe_health_checks (checked_at desc);

create index if not exists glowe_health_checks_name_time_idx
  on public.glowe_health_checks (check_name, checked_at desc);

create index if not exists glowe_health_checks_run_id_idx
  on public.glowe_health_checks (run_id);

alter table public.glowe_health_checks enable row level security;

-- Deny-by-default for clients; probes ingest via service_role, admins read via RPC.
drop policy if exists "glowe health checks deny clients" on public.glowe_health_checks;
create policy "glowe health checks deny clients" on public.glowe_health_checks
  for all to authenticated, anon
  using (false)
  with check (false);

-- Latest row per check_name (production only, last 7 days).
create or replace function public.glowe_admin_health_summary()
returns table (
  check_name   text,
  status       text,
  latency_ms   int,
  error_detail text,
  app_version  text,
  checked_at   timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_glowe_admin(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    h.check_name,
    h.status,
    h.latency_ms,
    h.error_detail,
    h.app_version,
    h.checked_at
  from public.glowe_health_checks h
  inner join (
    select distinct on (c.check_name) c.id
    from public.glowe_health_checks c
    where c.environment = 'glowe_prod'
      and c.checked_at > now() - interval '7 days'
    order by c.check_name, c.checked_at desc, c.id desc
  ) latest on latest.id = h.id;
end;
$$;

comment on function public.glowe_admin_health_summary() is
  'GLOWE admins only: latest synthetic probe status per check_name (prod, 7d window).';

revoke execute on function public.glowe_admin_health_summary() from public;
grant execute on function public.glowe_admin_health_summary() to authenticated;

-- Recent probe history (newest first).
create or replace function public.glowe_admin_list_health_checks(p_limit int default 100)
returns table (
  id           uuid,
  run_id       text,
  check_name   text,
  status       text,
  latency_ms   int,
  error_code   text,
  error_detail text,
  app_version  text,
  environment  text,
  checked_at   timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 100), 500));
begin
  if not public.is_glowe_admin(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    h.id,
    h.run_id,
    h.check_name,
    h.status,
    h.latency_ms,
    h.error_code,
    h.error_detail,
    h.app_version,
    h.environment,
    h.checked_at
  from public.glowe_health_checks h
  where h.environment = 'glowe_prod'
  order by h.checked_at desc
  limit v_limit;
end;
$$;

comment on function public.glowe_admin_list_health_checks(int) is
  'GLOWE admins only: recent synthetic probe rows (prod), capped at 500.';

revoke execute on function public.glowe_admin_list_health_checks(int) from public;
grant execute on function public.glowe_admin_list_health_checks(int) to authenticated;
