-- ⚠️  DESTRUCTIVE — start-fresh reset for CargoBook.
-- Wipes ALL business data and resets ID counters to 1, then restores the
-- default transport / expense types. Keeps your schema, login users, and
-- roles (auth.users + public.profiles are untouched).
--
-- Run in your Supabase project: Dashboard → SQL Editor → paste → Run.
-- This cannot be undone — make sure you actually want a blank slate.

-- Clear every transactional + reference table. CASCADE + RESTART IDENTITY
-- handles the foreign keys and makes new rows start numbering from 1 again.
truncate table
  public.expenses,
  public.payments,
  public.shipments,
  public.invoices,
  public.destinations,
  public.audit_log,
  public.expense_categories
restart identity cascade;

-- Re-seed the transport / expense-type dropdown with the current set.
insert into public.expense_categories (name) values
  ('✈️ Airplane'),
  ('🚗 Car'),
  ('🏍️ Motorcycle'),
  ('🚐 Sahal'),
  ('🚶 Porter');

-- Note: uploaded shipment attachment images live in Supabase Storage, not in
-- these tables. To clear those too, empty the attachments bucket from
-- Dashboard → Storage.
