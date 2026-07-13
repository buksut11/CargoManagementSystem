-- Modules become a platform-controlled setting (7/…): only the platform
-- operator decides which products (cargo / flights) an organization runs.
--
-- Before: any org owner/admin could flip Cargo/Flights on and off in Settings,
--         because the "admins update their org" policy (0016) lets them update
--         any column on their own org row — including `modules`.
-- After:  a tenant-side update can never change `modules`. If a client (the
--         `authenticated`/`anon` roles PostgREST uses) tries to change it, the
--         value is silently kept as-is. Only privileged connections — the
--         service role, or you in the Supabase SQL editor (postgres) — may
--         change it. This is the tamper-proof half of the change; hiding the
--         toggle in the UI is just cosmetic on top of this.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- Guard: on UPDATE, if the caller is a tenant client role and `modules` would
-- change, revert it to its previous value. Privileged roles pass through.
create or replace function public.lock_org_modules()
returns trigger
language plpgsql
as $$
begin
  if new.modules is distinct from old.modules
     and current_user in ('authenticated', 'anon') then
    new.modules := old.modules;
  end if;
  return new;
end;
$$;

drop trigger if exists lock_org_modules on public.organizations;
create trigger lock_org_modules
  before update on public.organizations
  for each row execute function public.lock_org_modules();

-- Convenience for the operator: set an organization's modules in one line from
-- the SQL editor, e.g.  select public.set_org_modules('<org-uuid>', array['flights']);
-- Runs as the definer (postgres), so the guard above lets the write through.
-- Execution is restricted to privileged roles — tenants can't call it.
create or replace function public.set_org_modules(p_org uuid, p_modules text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_modules is null or cardinality(p_modules) = 0 then
    raise exception 'An organization must have at least one module.';
  end if;
  if exists (select 1 from unnest(p_modules) m where m not in ('cargo', 'flights')) then
    raise exception 'Unknown module in %; allowed values are cargo, flights.', p_modules;
  end if;
  update public.organizations set modules = p_modules where id = p_org;
end;
$$;

revoke all on function public.set_org_modules(uuid, text[]) from public;
revoke execute on function public.set_org_modules(uuid, text[]) from authenticated, anon;
