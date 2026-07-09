-- Adds a "manager" role: full operational access to an organization's data
-- (shipments, invoices, payments, expenses, destinations, audit) but NOT
-- member management, settings or billing (those stay owner/admin only).
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- ── 1. Allow the new role ────────────────────────────────────────────────────
alter table public.memberships drop constraint memberships_role_check;
alter table public.memberships add constraint memberships_role_check
  check (role in ('owner', 'admin', 'manager', 'agent'));

alter table public.invitations drop constraint invitations_role_check;
alter table public.invitations add constraint invitations_role_check
  check (role in ('admin', 'manager', 'agent'));

-- ── 2. is_org_editor(): can write this org's business data ───────────────────
-- owner/admin/manager. is_org_admin() stays owner/admin and continues to gate
-- members, invitations, settings and billing.
create or replace function public.is_org_editor(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid()
      and org_id = p_org
      and role in ('owner', 'admin', 'manager')
  );
$$;

-- ── 3. Business-table write policies now allow editors (incl. managers) ──────
drop policy "admins write destinations" on public.destinations;
create policy "editors write destinations" on public.destinations
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

drop policy "admins write invoices" on public.invoices;
create policy "editors write invoices" on public.invoices
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

drop policy "admins write payments" on public.payments;
create policy "editors write payments" on public.payments
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

drop policy "admins write expenses" on public.expenses;
create policy "editors write expenses" on public.expenses
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

drop policy "admins write expense categories" on public.expense_categories;
create policy "editors write expense categories" on public.expense_categories
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

drop policy "admins write shipments" on public.shipments;
create policy "editors write shipments" on public.shipments
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

-- ── 4. Audit trail readable by editors (operational visibility) ──────────────
drop policy "admins read audit log" on public.audit_log;
create policy "editors read audit log" on public.audit_log
  for select to authenticated
  using (public.is_org_editor(organization_id));

-- ── 5. Agent write-restriction: full edit for editors (owner/admin/manager) ──
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
    or new.created_at is distinct from old.created_at
    or new.organization_id is distinct from old.organization_id
  then
    raise exception 'Agents may only update the shipment status and notes';
  end if;
  return new;
end;
$$;

-- ── 6. Storage: editors can upload/replace/remove attachments ────────────────
drop policy "org admin insert shipment attachments" on storage.objects;
drop policy "org admin update shipment attachments" on storage.objects;
drop policy "org admin delete shipment attachments" on storage.objects;

create policy "org editor insert shipment attachments" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shipment-attachments'
    and public.is_org_editor(((storage.foldername(name))[1])::uuid)
  );
create policy "org editor update shipment attachments" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shipment-attachments'
    and public.is_org_editor(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'shipment-attachments'
    and public.is_org_editor(((storage.foldername(name))[1])::uuid)
  );
create policy "org editor delete shipment attachments" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shipment-attachments'
    and public.is_org_editor(((storage.foldername(name))[1])::uuid)
  );

-- members, invitations, organizations (settings) and billing all keep using
-- is_org_admin() = owner/admin, so managers cannot touch them.
