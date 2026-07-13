-- Flight module: operating (overhead) expenses.
-- Per-booking `net_cost` already captures what a ticket costs (the airline
-- fare). This table captures the agency's OVERHEAD instead — staff salary,
-- rent, electricity and anything else that keeps the office running but is not
-- tied to a single booking. Net profit = booking gross profit − these expenses.
--
-- Deliberately standalone (not linked to bookings/customers/airlines) — same
-- shape as booking_seats (0034). It is financial data, so unlike booking_seats
-- it is EDITOR-ONLY for both read and write (the money-table pattern from
-- 0029): agents never see the ledger.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create table public.flight_expenses (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  expense_date    date not null default current_date,
  category        text not null default 'other'
    check (category in ('staff_salary', 'rent', 'electricity', 'other')),
  amount          numeric not null check (amount >= 0),
  note            text,
  created_at      timestamptz not null default now()
);

create index flight_expenses_org_idx on public.flight_expenses (organization_id);
create index flight_expenses_date_idx on public.flight_expenses (expense_date);

alter table public.flight_expenses enable row level security;

-- Editor-only for BOTH read and write — operating expenses are ledger data, so
-- agents cannot see or touch them (mirrors booking_payments / supplier_payments
-- in 0029).
create policy "editors read flight expenses" on public.flight_expenses
  for select to authenticated using (public.is_org_editor(organization_id));
create policy "editors write flight expenses" on public.flight_expenses
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

-- Auto-fill organization_id from the caller's org on insert (same trigger the
-- other org-scoped flight tables use).
create trigger flight_expenses_set_org
  before insert on public.flight_expenses
  for each row execute function public.set_org_from_current();
