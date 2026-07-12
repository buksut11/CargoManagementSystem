-- Flight module (4/5): Row-Level Security for the flight tables.
-- This is the tenant boundary for the module — a row is reachable only by
-- members of its organization. It reuses the existing helpers (0013/0018):
--   is_org_member(org) → any member (read)
--   is_org_editor(org) → owner/admin/manager (write)
-- Booking + reference tables: members read, editors write. Money tables
-- (payments / supplier_payments / refunds): editors only — agents never see the
-- ledger. (Agents CAN read a booking row, which includes its cost/profit
-- columns; if you later need to hide those from agents, expose an agent-facing
-- view without the cost columns and restrict base-table select to editors.)
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

alter table public.flight_customers   enable row level security;
alter table public.flight_suppliers   enable row level security;
alter table public.flight_bookings    enable row level security;
alter table public.flight_segments    enable row level security;
alter table public.flight_passengers  enable row level security;
alter table public.booking_payments   enable row level security;
alter table public.supplier_payments  enable row level security;
alter table public.booking_refunds    enable row level security;

-- ── Reference + booking tables: members read, editors write ─────────────────

create policy "members read flight customers" on public.flight_customers
  for select to authenticated using (public.is_org_member(organization_id));
create policy "editors write flight customers" on public.flight_customers
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

create policy "members read flight suppliers" on public.flight_suppliers
  for select to authenticated using (public.is_org_member(organization_id));
create policy "editors write flight suppliers" on public.flight_suppliers
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

create policy "members read flight bookings" on public.flight_bookings
  for select to authenticated using (public.is_org_member(organization_id));
create policy "editors write flight bookings" on public.flight_bookings
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

create policy "members read flight segments" on public.flight_segments
  for select to authenticated using (public.is_org_member(organization_id));
create policy "editors write flight segments" on public.flight_segments
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

create policy "members read flight passengers" on public.flight_passengers
  for select to authenticated using (public.is_org_member(organization_id));
create policy "editors write flight passengers" on public.flight_passengers
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

-- ── Money tables: editors only (no member-read policy → agents get nothing) ──

create policy "editors manage booking payments" on public.booking_payments
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

create policy "editors manage supplier payments" on public.supplier_payments
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

create policy "editors manage booking refunds" on public.booking_refunds
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));
