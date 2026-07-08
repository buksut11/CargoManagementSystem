-- Performance indexes for the queries the app runs on every page load.
-- All additive — safe to run on an existing database with no data changes.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- Shipments are always fetched newest-first (order by created_at desc) on the
-- dashboard, the shipments list and the invoices page.
create index if not exists shipments_created_at_idx
  on public.shipments (created_at desc);

-- The destinations join (shipments → destinations) and the status filter both
-- benefit from their own indexes on larger datasets.
create index if not exists shipments_destination_id_idx
  on public.shipments (destination_id);
create index if not exists shipments_status_idx
  on public.shipments (status);

-- Payments and expenses are grouped by month on the dashboard and summed per
-- invoice/shipment; index the date columns used for those roll-ups.
create index if not exists payments_paid_date_idx
  on public.payments (paid_date);
create index if not exists expenses_expense_date_idx
  on public.expenses (expense_date);
