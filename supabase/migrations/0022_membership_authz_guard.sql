-- Hardens membership writes so an org admin can't escalate privileges.
-- The "admins manage memberships" RLS policy (migration 0016) lets any
-- owner/admin write membership rows, but places no limit on the role value or
-- the target row. Via a direct REST call an admin could therefore promote
-- themselves to 'owner', demote other admins, or delete the owner's row and
-- lock them out. This trigger closes that gap in the database (the UI never
-- exposed it, but RLS alone did not prevent it).
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create or replace function public.enforce_membership_authz()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_is_owner boolean;
begin
  -- No auth context (service role / SQL editor): allow. Provisioning and the
  -- invite-acceptance route run here and must not be blocked.
  if v_actor is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select exists (
    select 1 from public.memberships
    where user_id = v_actor
      and org_id = coalesce(new.org_id, old.org_id)
      and role = 'owner'
  ) into v_is_owner;

  -- Only an owner may create, remove, or change an 'owner' membership.
  if (tg_op in ('INSERT', 'UPDATE') and new.role = 'owner')
     or (tg_op in ('UPDATE', 'DELETE') and old.role = 'owner') then
    if not v_is_owner then
      raise exception 'Only an owner can manage owner memberships';
    end if;
  end if;

  -- No one may change their own role (blocks admin self-escalation).
  if tg_op = 'UPDATE'
     and old.user_id = v_actor
     and new.role is distinct from old.role then
    raise exception 'You cannot change your own role';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists memberships_authz on public.memberships;
create trigger memberships_authz
  before insert or update or delete on public.memberships
  for each row execute function public.enforce_membership_authz();
