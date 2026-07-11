-- Flight module (1/5): per-organization module enablement.
-- Adds a `modules` list to each organization so a tenant can run Cargo,
-- Flights, or both. Existing organizations are backfilled to cargo-only, so
-- nothing they see changes until an owner/admin turns Flights on in Settings.
-- Toggling uses the existing "admins update their org" policy (0016) — no new
-- policy is needed.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

alter table public.organizations
  add column if not exists modules text[] not null default array['cargo'];

-- Re-runnable backfill: any org still lacking the flag lands on cargo-only.
update public.organizations
  set modules = array['cargo']
  where modules is null or cardinality(modules) = 0;

-- Convenience helper: does this organization have a given module enabled?
-- Plain/stable; reads a column the caller can already see under RLS.
create or replace function public.org_has_module(p_org uuid, p_module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organizations
    where id = p_org and p_module = any(modules)
  );
$$;
