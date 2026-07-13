-- Flight module: custom operating-expense categories.
-- 0037 shipped a fixed set (staff_salary / rent / electricity / other). This
-- lets each org add its own categories too (e.g. Internet, Marketing), the same
-- way cargo's expense_categories (0004) backs the transport dropdown — except
-- this list is org-scoped and editor-only, matching flight_expenses.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- Allow any category text on an expense (was locked to the 4 built-ins). The
-- four keys stay valid; custom categories are stored as their own display text,
-- exactly like cargo expenses did after 0004.
alter table public.flight_expenses
  drop constraint if exists flight_expenses_category_check;

create table public.flight_expense_categories (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now(),
  unique (organization_id, name)
);

create index flight_expense_categories_org_idx
  on public.flight_expense_categories (organization_id);

alter table public.flight_expense_categories enable row level security;

-- Editor-only (same as flight_expenses): the categories are part of the
-- editor-only expenses ledger UI, so agents never see or change them.
create policy "editors read flight expense categories"
  on public.flight_expense_categories
  for select to authenticated using (public.is_org_editor(organization_id));
create policy "editors write flight expense categories"
  on public.flight_expense_categories
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

create trigger flight_expense_categories_set_org
  before insert on public.flight_expense_categories
  for each row execute function public.set_org_from_current();
