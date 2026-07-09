-- SaaS Phase 1 (5/5): rewrite Row-Level Security to isolate organizations.
-- Before: any signed-in user could read/write every business's data.
-- After:  a row is reachable only by members of its organization, and only
--         owners/admins of that org can write it. Agent restrictions (status
--         + notes only, enforced by the existing trigger) are preserved.
-- This is the tenant boundary — the single most important migration.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- ── Policies for the tenancy tables themselves ──────────────────────────────

create policy "members read their org" on public.organizations
  for select to authenticated using (public.is_org_member(id));
create policy "admins update their org" on public.organizations
  for update to authenticated using (public.is_org_admin(id)) with check (public.is_org_admin(id));
-- Creating/deleting organizations is done out-of-band (service role) during
-- deliberate, invite-only provisioning — no authenticated policy for it.

create policy "read own or managed memberships" on public.memberships
  for select to authenticated using (user_id = auth.uid() or public.is_org_admin(org_id));
create policy "admins manage memberships" on public.memberships
  for all to authenticated using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

create policy "admins manage invitations" on public.invitations
  for all to authenticated using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

-- ── Destinations: members read, admins write ────────────────────────────────
drop policy "admin full access" on public.destinations;
drop policy "read destinations" on public.destinations;
create policy "members read destinations" on public.destinations
  for select to authenticated using (public.is_org_member(organization_id));
create policy "admins write destinations" on public.destinations
  for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- ── Invoices: members read (agents need bill-to), admins write ──────────────
drop policy "admin full access" on public.invoices;
drop policy "read invoices" on public.invoices;
create policy "members read invoices" on public.invoices
  for select to authenticated using (public.is_org_member(organization_id));
create policy "admins write invoices" on public.invoices
  for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- ── Payments: admins only (unchanged visibility, now org-scoped) ────────────
drop policy "admin full access" on public.payments;
create policy "admins write payments" on public.payments
  for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- ── Expenses: admins only (unchanged visibility, now org-scoped) ────────────
drop policy "admin full access" on public.expenses;
create policy "admins write expenses" on public.expenses
  for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- ── Expense categories: members read (dropdown), admins write ───────────────
drop policy "admin full access" on public.expense_categories;
drop policy "read expense categories" on public.expense_categories;
create policy "members read expense categories" on public.expense_categories
  for select to authenticated using (public.is_org_member(organization_id));
create policy "admins write expense categories" on public.expense_categories
  for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- ── Shipments: members read, admins full write, members update ──────────────
-- The members-update policy lets agents run updates; the existing
-- enforce_agent_status_only() trigger still limits them to status + notes.
drop policy "admin full access" on public.shipments;
drop policy "read shipments" on public.shipments;
drop policy "update shipments" on public.shipments;
create policy "members read shipments" on public.shipments
  for select to authenticated using (public.is_org_member(organization_id));
create policy "admins write shipments" on public.shipments
  for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy "members update shipments" on public.shipments
  for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

-- ── Audit log: org admins read (read-only; rows written by the trigger) ─────
drop policy "admin read" on public.audit_log;
create policy "admins read audit log" on public.audit_log
  for select to authenticated using (public.is_org_admin(organization_id));

-- Note: public.profiles policies and the storage (shipment-attachments)
-- policies still use the global is_admin()/profiles.role. That is intentional
-- for Phase 1 (the app still reads profiles.role). They are re-scoped to
-- memberships in Phase 2, and storage objects get org-prefixed paths then.
