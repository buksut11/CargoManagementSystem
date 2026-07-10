-- Organization details + logo, shown on printed invoices.
-- Admins edit them in Settings; the invoice print view renders the active
-- organization's logo, address, phone and email instead of the generic
-- CargoBook header.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- ── Columns on organizations ─────────────────────────────────────────────────

alter table public.organizations add column logo_url text;
alter table public.organizations add column address  text;
alter table public.organizations add column phone    text;
alter table public.organizations add column email    text;

-- ── Storage bucket for the logos ─────────────────────────────────────────────
-- Public read (so the logo renders from a plain URL on the printed invoice);
-- writes are locked to org admins. Objects are stored under an org-id prefix
-- ({org_id}/logo-{timestamp}.{ext}) so the policies can scope per tenant,
-- same as the shipment-attachments bucket.

insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

create policy "read org logos" on storage.objects
  for select to authenticated
  using (bucket_id = 'org-logos');

create policy "org admin insert org logos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-logos'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "org admin update org logos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'org-logos'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'org-logos'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "org admin delete org logos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'org-logos'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );
