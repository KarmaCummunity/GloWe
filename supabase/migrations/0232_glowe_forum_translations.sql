-- 0232_glowe_forum_translations — FR-TRANSLATE-005 forum cache constraints.
--
-- Allow glowe_forum_thread / glowe_forum_reply rows in glowe_content_translations
-- and the `body` field used by forum threads + replies. Without this, glowe-translate
-- fails on cache insert (CHECK violation → 500).
--
-- Mapped to spec: FR-TRANSLATE-005 (spec/18_translation.md).

set search_path = public;

alter table public.glowe_content_translations drop constraint if exists glowe_ct_type_chk;
alter table public.glowe_content_translations
  add constraint glowe_ct_type_chk check (
    content_type in (
      'glowe_post',
      'glowe_opportunity',
      'glowe_project',
      'glowe_profile',
      'glowe_comment',
      'glowe_forum_thread',
      'glowe_forum_reply'
    )
  );

alter table public.glowe_content_translations drop constraint if exists glowe_ct_field_chk;
alter table public.glowe_content_translations
  add constraint glowe_ct_field_chk check (
    field in (
      'title', 'text', 'description', 'about', 'focus', 'needs',
      'org_description', 'org_field', 'body'
    )
    or field ~ '^(requirements|responsibilities|tags)\.[0-9]+$'
  );

-- Purge forum thread translations on delete / title+body edit.
create or replace function public.glowe_ct_purge_forum_thread()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.glowe_content_translations
   where content_type = 'glowe_forum_thread' and content_id = old.id;
  return old;
end;
$$;

drop trigger if exists trg_glowe_ct_purge_forum_thread_del on public.glowe_forum_threads;
create trigger trg_glowe_ct_purge_forum_thread_del
  before delete on public.glowe_forum_threads
  for each row execute function public.glowe_ct_purge_forum_thread();

create or replace function public.glowe_ct_purge_forum_thread_edit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.title is distinct from old.title
     or new.body is distinct from old.body then
    delete from public.glowe_content_translations
     where content_type = 'glowe_forum_thread' and content_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_glowe_ct_purge_forum_thread_edit on public.glowe_forum_threads;
create trigger trg_glowe_ct_purge_forum_thread_edit
  after update of title, body on public.glowe_forum_threads
  for each row execute function public.glowe_ct_purge_forum_thread_edit();

-- Purge forum reply translations on delete / body edit.
create or replace function public.glowe_ct_purge_forum_reply()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.glowe_content_translations
   where content_type = 'glowe_forum_reply' and content_id = old.id;
  return old;
end;
$$;

drop trigger if exists trg_glowe_ct_purge_forum_reply_del on public.glowe_forum_replies;
create trigger trg_glowe_ct_purge_forum_reply_del
  before delete on public.glowe_forum_replies
  for each row execute function public.glowe_ct_purge_forum_reply();

create or replace function public.glowe_ct_purge_forum_reply_edit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.body is distinct from old.body then
    delete from public.glowe_content_translations
     where content_type = 'glowe_forum_reply' and content_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_glowe_ct_purge_forum_reply_edit on public.glowe_forum_replies;
create trigger trg_glowe_ct_purge_forum_reply_edit
  after update of body on public.glowe_forum_replies
  for each row execute function public.glowe_ct_purge_forum_reply_edit();
