-- Lets admins attach a single image to a shipment (a photo of the parcel,
-- a receipt, a customs slip, …). Admins upload/replace/remove it; agents can
-- only view it. Enforced in the database, not just hidden in the UI.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- ── Column on shipments ───────────────────────────────────────────────────
-- Stores the public URL of the uploaded image (null when there is none).

alter table public.shipments add column attachment_url text;

-- Agents still may only touch status + notes. Adding attachment_url to the
-- guarded list keeps the image admin-only even though the shipments UPDATE
-- policy lets any signed-in user run an update.
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
    or new.attachment_url is distinct from old.attachment_url
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Agents may only update the shipment status and notes';
  end if;
  return new;
end;
$$;

-- ── Storage bucket for the images ─────────────────────────────────────────
-- Public read (so the image renders from a plain URL); writes are locked to
-- admins by the policies below.

insert into storage.buckets (id, name, public)
values ('shipment-attachments', 'shipment-attachments', true)
on conflict (id) do nothing;

create policy "read shipment attachments" on storage.objects
  for select to authenticated
  using (bucket_id = 'shipment-attachments');

create policy "admin insert shipment attachments" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'shipment-attachments' and public.is_admin());

create policy "admin update shipment attachments" on storage.objects
  for update to authenticated
  using (bucket_id = 'shipment-attachments' and public.is_admin())
  with check (bucket_id = 'shipment-attachments' and public.is_admin());

create policy "admin delete shipment attachments" on storage.objects
  for delete to authenticated
  using (bucket_id = 'shipment-attachments' and public.is_admin());
