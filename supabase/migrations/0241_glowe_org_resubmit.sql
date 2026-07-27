-- 0241_glowe_org_resubmit — let rejected organizations re-enter the review queue.
--
-- FR-GLOWE-003: owners may resubmit after rejection (approval_status rejected →
-- pending). The 0205 guard only allowed not_required ⇄ pending; rejected →
-- pending was blocked for authenticated clients.
--
-- Mapped to spec: FR-GLOWE-003 (org approval workflow).

set search_path = public;

create or replace function public.glowe_profiles_guard_approval()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if coalesce(new.approval_status, 'not_required') not in ('not_required', 'pending') then
        raise exception 'glowe: approval_status % is admin-managed', new.approval_status
          using errcode = '42501';
      end if;
    elsif tg_op = 'UPDATE'
       and new.approval_status is distinct from old.approval_status
       and not (
         (old.approval_status in ('not_required', 'pending')
          and new.approval_status in ('not_required', 'pending'))
         or (old.approval_status = 'rejected'
             and new.approval_status = 'pending'
             and new.account_type = 'organization')
       ) then
      raise exception 'glowe: approval_status is admin-managed once decided'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
