-- Lets admins attach a SECOND image to a shipment (e.g. a photo of the parcel
-- and a separate receipt/customs slip). Same rules as the first image: editors
-- upload/replace/remove it; agents can only view it.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- ── Column on shipments ───────────────────────────────────────────────────
-- Stores the public URL of the second uploaded image (null when there is none).

alter table public.shipments add column if not exists attachment_url_2 text;

-- Keep the second image admin-only too: agents still may only touch status +
-- notes, so guard attachment_url_2 alongside attachment_url.
create or replace function public.enforce_agent_status_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_org_editor(new.organization_id) then
    return new;
  end if;
  if new.description is distinct from old.description
    or new.destination_id is distinct from old.destination_id
    or new.weight_kg is distinct from old.weight_kg
    or new.rate_per_kg is distinct from old.rate_per_kg
    or new.total is distinct from old.total
    or new.ship_date is distinct from old.ship_date
    or new.invoice_id is distinct from old.invoice_id
    or new.attachment_url is distinct from old.attachment_url
    or new.attachment_url_2 is distinct from old.attachment_url_2
    or new.created_at is distinct from old.created_at
    or new.organization_id is distinct from old.organization_id
  then
    raise exception 'Agents may only update the shipment status and notes';
  end if;
  return new;
end;
$$;
