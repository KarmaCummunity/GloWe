-- 0234_glowe_opportunity_meta_translate — FR-TRANSLATE-005.
--
-- Extend the glowe_content_translations field allow-list and opportunity
-- edit-purge trigger so location, duration, commitment, and per-element
-- skills chips cache independently (same dotted pattern as requirements).
--
-- Additive / idempotent. Mapped to spec: FR-TRANSLATE-005 (spec/18_translation.md).

set search_path = public;

alter table public.glowe_content_translations drop constraint if exists glowe_ct_field_chk;
alter table public.glowe_content_translations
  add constraint glowe_ct_field_chk check (
    field in (
      'title', 'text', 'description', 'about', 'focus', 'needs',
      'org_description', 'org_field', 'body',
      'location', 'duration', 'commitment'
    )
    or field ~ '^(requirements|responsibilities|tags|skills)\.[0-9]+$'
  );

create or replace function public.glowe_ct_purge_opportunity_edit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.location is distinct from old.location
     or new.duration is distinct from old.duration
     or new.commitment is distinct from old.commitment
     or new.requirements is distinct from old.requirements
     or new.responsibilities is distinct from old.responsibilities
     or new.skills is distinct from old.skills then
    delete from public.glowe_content_translations
     where content_type = 'glowe_opportunity' and content_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_glowe_ct_purge_opp_edit on public.glowe_opportunities;
create trigger trg_glowe_ct_purge_opp_edit
  after update of title, description, location, duration, commitment,
    requirements, responsibilities, skills
  on public.glowe_opportunities
  for each row execute function public.glowe_ct_purge_opportunity_edit();
