-- FR-GLOWE-003: pending organization applicants keep individual publish
-- permissions until a reviewer approves them. Rejected applications stay
-- view-only. Approved organizations gain opportunity/event publishing.

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
  select case
    when coalesce(p_account_type, 'individual') = 'organization'
         and coalesce(p_approval_status, 'not_required') = 'rejected'
      then false

    when p_kind in ('opportunity', 'event')
      then coalesce(p_account_type, 'individual') = 'organization'
           and coalesce(p_approval_status, 'not_required') = 'approved'

    when p_kind = 'offer'
      then not (
        coalesce(p_account_type, 'individual') = 'organization'
        and coalesce(p_approval_status, 'not_required') = 'approved'
      )

    else true
  end;
$$;

comment on function public.glowe_can_create(text, text, text) is
  'GloWe publishing capability matrix. Pending org applicants publish as individuals until approved. FR-GLOWE-003 / FR-GLOWE-016.';
