-- 0239_glowe_transactional_email — tell people when a decision lands.
--
-- Before this migration an org could submit for review and hear nothing back,
-- and an applicant could be accepted or declined with no message. The four
-- transitions that matter for launch:
--   • admin approves / rejects an organization (glowe_set_org_approval)
--   • opportunity owner accepts / declines an application
--     (glowe_update_application_status, glowe_decide_event_registration)
--
-- Pattern mirrors notifications_outbox (0056) + pg_net dispatch (0058): rows
-- land in glowe_email_outbox inside the same transaction as the decision;
-- an AFTER INSERT trigger POSTs to the glowe-notify Edge Function, which
-- sends via Resend. If RESEND_API_KEY is unset the row stays pending with
-- last_error — the decision still commits.
--
-- Mapped to spec: FR-GLOWE-003 AC8, FR-GLOWE-012 AC9. Decision: D-187.

set search_path = public;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Outbox + enqueue helper
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.glowe_email_outbox (
  email_id    uuid primary key default gen_random_uuid(),
  template    text not null check (template in (
    'org_approved', 'org_rejected',
    'application_accepted', 'application_declined'
  )),
  to_email    text not null,
  payload     jsonb not null default '{}'::jsonb,
  dedupe_key  text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  attempts    int not null default 0,
  last_error  text
);

create unique index if not exists glowe_email_outbox_dedupe_idx
  on public.glowe_email_outbox (dedupe_key)
  where dedupe_key is not null;

create index if not exists glowe_email_outbox_pending_idx
  on public.glowe_email_outbox (created_at)
  where sent_at is null;

alter table public.glowe_email_outbox enable row level security;
revoke all on public.glowe_email_outbox from authenticated, anon;

-- Resolve the best address we have for a GloWe profile row. Prefer the org
-- contact email they submitted, then profile email, then auth.users.
create or replace function public.glowe_resolve_user_email(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(btrim(p.org_contact_email), ''),
    nullif(btrim(p.email), ''),
    (select u.email from auth.users u where u.id = p_user_id)
  )
  from public.glowe_profiles p
  where p.id = p_user_id;
$$;

comment on function public.glowe_resolve_user_email(uuid) is
  'Best-effort email for a GloWe user. Used by glowe-notify enqueue helpers.';

revoke all on function public.glowe_resolve_user_email(uuid) from public, anon, authenticated;

create or replace function public.enqueue_glowe_email(
  p_template   text,
  p_to_email   text,
  p_payload    jsonb default '{}'::jsonb,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := nullif(btrim(coalesce(p_to_email, '')), '');
  v_id    uuid;
begin
  if v_email is null then
    return null;
  end if;
  if p_template not in (
    'org_approved', 'org_rejected',
    'application_accepted', 'application_declined'
  ) then
    raise exception 'invalid glowe email template: %', p_template using errcode = '22023';
  end if;

  insert into public.glowe_email_outbox (template, to_email, payload, dedupe_key)
  values (p_template, v_email, coalesce(p_payload, '{}'::jsonb), p_dedupe_key)
  on conflict (dedupe_key) where dedupe_key is not null do nothing
  returning email_id into v_id;
  return v_id;
end $$;

comment on function public.enqueue_glowe_email(text, text, jsonb, text) is
  'Queue a GloWe transactional email. No-op when to_email is blank. FR-GLOWE-003 AC8.';

revoke all on function public.enqueue_glowe_email(text, text, jsonb, text) from public;
grant execute on function public.enqueue_glowe_email(text, text, jsonb, text) to service_role;

-- Shared by both application decision RPCs so the email rule lives once.
create or replace function public.glowe_enqueue_application_decision_email(
  p_app  public.glowe_applications,
  p_opp  public.glowe_opportunities
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email    text;
  v_template text;
  v_payload  jsonb;
begin
  if p_app.status = 'Accepted' then
    v_template := 'application_accepted';
  elsif p_app.status = 'Declined' then
    v_template := 'application_declined';
  else
    -- Waitlisted / Pending / Cancelled — no transactional email for these.
    return;
  end if;

  v_email := coalesce(
    nullif(btrim(p_app.submitted_email), ''),
    public.glowe_resolve_user_email(p_app.user_id)
  );
  if v_email is null then
    return;
  end if;

  v_payload := jsonb_build_object(
    'listing_title', coalesce(p_opp.title, 'your application'),
    'organization', coalesce(p_opp.organization, ''),
    'note', nullif(btrim(coalesce(p_app.rejection_note, '')), '')
  );

  perform public.enqueue_glowe_email(
    v_template,
    v_email,
    v_payload,
    'glowe_email:' || v_template || ':' || p_app.id::text
  );
end $$;

comment on function public.glowe_enqueue_application_decision_email(public.glowe_applications, public.glowe_opportunities) is
  'Enqueue accept/decline email after an owner decision. Skips waitlisted rows. FR-GLOWE-012 AC9.';

revoke all on function public.glowe_enqueue_application_decision_email(public.glowe_applications, public.glowe_opportunities) from public;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Dispatch trigger (pg_net → glowe-notify)
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.trg_glowe_email_outbox_dispatch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := current_setting('app.settings.functions_url', true);
  v_key text := current_setting('app.settings.service_role_key', true);
begin
  if v_url is null or v_url = '' or v_key is null or v_key = '' then
    return new;
  end if;

  perform net.http_post(
    url     := v_url || '/functions/v1/glowe-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := jsonb_build_object(
      'type', 'INSERT',
      'table', 'glowe_email_outbox',
      'record', to_jsonb(new)
    )
  );
  return new;
end $$;

drop trigger if exists glowe_email_outbox_dispatch on public.glowe_email_outbox;
create trigger glowe_email_outbox_dispatch
  after insert on public.glowe_email_outbox
  for each row execute function public.trg_glowe_email_outbox_dispatch();

-- Retry pending rows (webhook/pg_net can fail transiently).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'glowe_email_retry_pending') then
    perform cron.unschedule('glowe_email_retry_pending');
  end if;
end $$;

select cron.schedule(
  'glowe_email_retry_pending',
  '* * * * *',
  $$
  do $body$
  declare r record;
  begin
    for r in
      select email_id from public.glowe_email_outbox
      where sent_at is null
        and attempts < 3
        and created_at > now() - interval '1 hour'
      limit 25
    loop
      perform net.http_post(
        url     := current_setting('app.settings.functions_url', true) || '/functions/v1/glowe-notify',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body    := (
          select jsonb_build_object('type', 'RETRY', 'table', 'glowe_email_outbox', 'record', to_jsonb(e))
          from public.glowe_email_outbox e
          where e.email_id = r.email_id
        )
      );
    end loop;
  end
  $body$;
  $$
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Wire the four decision RPCs
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.glowe_set_org_approval(
  p_profile_id uuid,
  p_decision   text,
  p_note       text default null
)
returns public.glowe_profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_row   public.glowe_profiles;
  v_email text;
begin
  if not public.is_glowe_admin(v_actor) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'glowe: decision must be approved or rejected, got %', p_decision
      using errcode = '22023';
  end if;

  select * into v_row
    from public.glowe_profiles
   where id = p_profile_id
   for update;
  if not found then
    raise exception 'glowe: profile % not found', p_profile_id using errcode = 'P0002';
  end if;
  if v_row.account_type is distinct from 'organization' then
    raise exception 'glowe: profile % is not an organization', p_profile_id
      using errcode = '22023';
  end if;
  if v_row.approval_status <> 'pending' then
    raise exception 'glowe: profile % is not pending (currently %)',
      p_profile_id, v_row.approval_status using errcode = '22023';
  end if;

  update public.glowe_profiles
     set approval_status = p_decision,
         org_reviewed_at = now(),
         org_reviewed_by = v_actor,
         org_review_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_profile_id
  returning * into v_row;

  v_email := public.glowe_resolve_user_email(p_profile_id);
  perform public.enqueue_glowe_email(
    case when p_decision = 'approved' then 'org_approved' else 'org_rejected' end,
    v_email,
    jsonb_build_object(
      'org_name', coalesce(nullif(btrim(v_row.org_name), ''), v_row.display_name, 'your organization'),
      'note', v_row.org_review_note
    ),
    'glowe_email:org_' || p_decision || ':' || p_profile_id::text
  );

  return v_row;
end;
$$;

-- glowe_update_application_status — add email enqueue after the status write.
create or replace function public.glowe_update_application_status(
  p_application_id uuid,
  p_decision       text
)
returns public.glowe_applications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_app    public.glowe_applications;
  v_opp    public.glowe_opportunities;
  v_pos    int;
  v_status text;
  v_row    public.glowe_applications;
begin
  if v_uid is null then
    raise exception 'forbidden: sign in' using errcode = '42501';
  end if;
  if p_decision not in ('Accepted', 'Declined') then
    raise exception 'invalid: decision must be Accepted or Declined' using errcode = '22023';
  end if;

  select * into v_app from public.glowe_applications where id = p_application_id;
  if not found then
    raise exception 'not found: application does not exist' using errcode = 'P0002';
  end if;

  select * into v_opp from public.glowe_opportunities where id = v_app.opportunity_id;
  if v_opp.user_id is distinct from v_uid then
    raise exception 'forbidden: not the opportunity owner' using errcode = '42501';
  end if;

  if p_decision = 'Declined' then
    v_status := 'Declined';
    v_pos    := null;
  else
    v_pos    := public.glowe_next_waitlist_position(v_app.opportunity_id, v_opp.capacity);
    v_status := case when v_pos is null then 'Accepted' else 'Waitlisted' end;
    if v_status = 'Waitlisted' and v_app.waitlist_position is not null then
      v_pos := v_app.waitlist_position;
    end if;
  end if;

  update public.glowe_applications
     set status = v_status, waitlist_position = v_pos,
         decided_at = now(), decided_by = v_uid
   where id = p_application_id
   returning * into v_row;

  perform public.glowe_enqueue_application_decision_email(v_row, v_opp);
  return v_row;
end $$;

-- glowe_decide_event_registration — same email hook on final status.
create or replace function public.glowe_decide_event_registration(
  p_registration_id uuid,
  p_decision        text,
  p_note            text default null
)
returns public.glowe_applications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_app    public.glowe_applications;
  v_event  public.glowe_opportunities;
  v_pos    int;
  v_status text;
  v_row    public.glowe_applications;
begin
  if v_uid is null then
    raise exception 'forbidden: sign in' using errcode = '42501';
  end if;
  if p_decision not in ('accept', 'decline') then
    raise exception 'invalid: decision must be accept or decline' using errcode = '22023';
  end if;

  select * into v_app from public.glowe_applications where id = p_registration_id;
  if not found then
    raise exception 'not found: registration does not exist' using errcode = 'P0002';
  end if;

  select * into v_event from public.glowe_opportunities where id = v_app.opportunity_id;
  if v_event.user_id is distinct from v_uid then
    raise exception 'forbidden: not the event organizer' using errcode = '42501';
  end if;

  if v_app.status not in ('Pending', 'Waitlisted') then
    raise exception 'invalid: registration is not awaiting a decision (status %)', v_app.status using errcode = '22023';
  end if;

  if p_decision = 'decline' then
    if nullif(btrim(coalesce(p_note, '')), '') is null then
      raise exception 'invalid: a rejection reason is required' using errcode = '22023';
    end if;
    if char_length(p_note) > 500 then
      raise exception 'invalid: rejection reason too long (max 500)' using errcode = '22023';
    end if;
    update public.glowe_applications
       set status = 'Declined', rejection_note = btrim(p_note),
           decided_at = now(), decided_by = v_uid, waitlist_position = null
     where id = p_registration_id
     returning * into v_row;
    perform public.glowe_enqueue_application_decision_email(v_row, v_event);
    return v_row;
  end if;

  v_pos    := public.glowe_next_waitlist_position(v_app.opportunity_id, v_event.capacity);
  v_status := case when v_pos is null then 'Accepted' else 'Waitlisted' end;
  if v_status = 'Waitlisted' and v_app.waitlist_position is not null then
    v_pos := v_app.waitlist_position;
  end if;

  update public.glowe_applications
     set status = v_status, waitlist_position = v_pos, rejection_note = null,
         decided_at = now(), decided_by = v_uid
   where id = p_registration_id
   returning * into v_row;

  perform public.glowe_enqueue_application_decision_email(v_row, v_event);
  return v_row;
end $$;
