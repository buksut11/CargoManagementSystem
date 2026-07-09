-- SaaS Phase 3: move authorization from the global profiles.role to
-- per-organization memberships, and scope shipment-attachment writes by org.
-- After this, being an admin is always relative to a specific organization.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- ── 1. Agent write-restriction, now evaluated per organization ──────────────
-- A user gets full edit rights on a shipment only if they are an owner/admin
-- of THAT shipment's organization (previously: any global admin).
create or replace function public.enforce_agent_status_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_org_admin(new.organization_id) then
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
    or new.organization_id is distinct from old.organization_id
  then
    raise exception 'Agents may only update the shipment status and notes';
  end if;
  return new;
end;
$$;

-- ── 2. Profiles readable within your organization (for the Members page) ────
-- Replaces the global-admin policy that exposed every profile across tenants.
create or replace function public.shares_org(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m_self
    join public.memberships m_other on m_other.org_id = m_self.org_id
    where m_self.user_id = auth.uid()
      and m_other.user_id = p_user
  );
$$;

drop policy "admin full access" on public.profiles;
drop policy "read own profile" on public.profiles;
create policy "read own or co-member profiles" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_org(id));

-- ── 3. Storage writes scoped by organization ────────────────────────────────
-- Attachments are uploaded under an org-id folder: {org_id}/{shipment}/file.
-- Writes are limited to admins of that org; reads stay public so the image
-- still renders from a plain URL.
drop policy "admin insert shipment attachments" on storage.objects;
drop policy "admin update shipment attachments" on storage.objects;
drop policy "admin delete shipment attachments" on storage.objects;

create policy "org admin insert shipment attachments" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shipment-attachments'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );
create policy "org admin update shipment attachments" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shipment-attachments'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'shipment-attachments'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );
create policy "org admin delete shipment attachments" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shipment-attachments'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

-- Note: profiles.role is no longer used for authorization (memberships.role is
-- the source of truth). The column is kept for display/back-compat.
