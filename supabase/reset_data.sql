-- ⚠️  DESTRUCTIVE — start-fresh reset for CargoBook.
-- Wipes ALL business data and resets ID counters to 1, then restores the
-- default transport / expense types for each organization. Keeps your schema,
-- organizations, memberships, login users, and roles.
--
-- Run in your Supabase project: Dashboard → SQL Editor → paste → Run.
-- This cannot be undone — make sure you actually want a blank slate.

-- Clear every transactional + reference table. CASCADE + RESTART IDENTITY
-- handles the foreign keys and makes new rows start numbering from 1 again.
-- (organizations, memberships, invitations and profiles are left intact.)
truncate table
  public.expenses,
  public.payments,
  public.shipments,
  public.invoices,
  public.destinations,
  public.audit_log,
  public.expense_categories
restart identity cascade;

-- Re-seed the transport / expense-type dropdown for every organization.
-- (expense_categories.organization_id is mandatory since migration 0015, so
-- we insert one set of categories per org rather than a single global set.)
insert into public.expense_categories (organization_id, name)
select o.id, c.name
from public.organizations o
cross join (values
  ('✈️ Airplane'),
  ('🚗 Car'),
  ('🏍️ Motorcycle'),
  ('🚐 Sahal'),
  ('🚶 Porter')
) as c(name);

-- Note: uploaded shipment attachment images live in Supabase Storage, not in
-- these tables. To clear those too, empty the attachments bucket from
-- Dashboard → Storage.
