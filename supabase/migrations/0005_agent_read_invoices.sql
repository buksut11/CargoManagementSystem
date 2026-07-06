-- Lets agents see who a shipment is billed to: read access on invoices
-- (bill_to, dates, notes — invoice amounts live on shipments/payments,
-- which stay admin-only for writes and price columns stay hidden in the UI).
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create policy "read invoices" on public.invoices
  for select to authenticated using (true);
