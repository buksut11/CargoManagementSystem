-- Lets agents add/edit a shipment's free-text notes (in addition to status).
-- Every other field stays admin-only, and the audit trigger keeps recording
-- who changed what.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create or replace function public.enforce_agent_status_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No auth context (service role / SQL editor) or admin: allow everything.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.description is distinct from old.description
    or new.destination_id is distinct from old.destination_id
    or new.weight_kg is distinct from old.weight_kg
    or new.rate_per_kg is distinct from old.rate_per_kg
    or new.total is distinct from old.total
    or new.ship_date is distinct from old.ship_date
    or new.invoice_id is distinct from old.invoice_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Agents may only update the shipment status and notes';
  end if;
  return new;
end;
$$;
