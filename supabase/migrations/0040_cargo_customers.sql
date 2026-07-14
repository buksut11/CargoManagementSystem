-- Cargo customers — a real billing entity behind an invoice's free-text
-- bill_to, so the cargo side can produce a per-customer statement of account
-- (the same concept the flight module already has via flight_customers, 0027).
-- bill_to stays on the invoice as a point-in-time snapshot; customer_id is the
-- durable link the statement groups by. RLS reuses the existing helpers
-- is_org_member / is_org_editor (0013/0018), exactly like 0029 does for flights.
-- Written idempotently so a partially-applied run can be re-run safely.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- ── A. Customer table + invoice link ────────────────────────────────────────
create table if not exists public.cargo_customers (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  address         text,
  created_at      timestamptz not null default now(),
  unique (organization_id, name)
);
create index if not exists cargo_customers_org_idx on public.cargo_customers (organization_id);

-- Auto-fill organization_id on insert (mirrors flight_customers, 0027).
drop trigger if exists cargo_customers_set_org on public.cargo_customers;
create trigger cargo_customers_set_org before insert on public.cargo_customers
  for each row execute function public.set_org_from_current();

alter table public.invoices
  add column if not exists customer_id bigint
    references public.cargo_customers (id) on delete set null;
create index if not exists invoices_customer_idx on public.invoices (customer_id);

-- ── B. Backfill: existing bill_to text → real customer rows, then link ───────
-- Idempotent: the insert is on-conflict-do-nothing; the update only touches
-- rows whose customer_id isn't already correct.
insert into public.cargo_customers (organization_id, name, phone, address)
select distinct on (organization_id, btrim(bill_to))
       organization_id, btrim(bill_to), phone, address
from public.invoices
where btrim(bill_to) <> ''
order by organization_id, btrim(bill_to), issued_date desc
on conflict (organization_id, name) do nothing;

update public.invoices i set customer_id = c.id
from public.cargo_customers c
where c.organization_id = i.organization_id
  and c.name = btrim(i.bill_to)
  and i.customer_id is distinct from c.id;

-- ── C. RLS: members read, editors write (mirrors flight_customers, 0029) ─────
alter table public.cargo_customers enable row level security;

drop policy if exists "members read cargo customers" on public.cargo_customers;
create policy "members read cargo customers" on public.cargo_customers
  for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "editors write cargo customers" on public.cargo_customers;
create policy "editors write cargo customers" on public.cargo_customers
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));
