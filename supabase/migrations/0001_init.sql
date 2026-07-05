-- CargoBook (personal edition) — full schema.
-- Run this once in your Supabase project: Dashboard → SQL Editor → paste → Run.

create table public.destinations (
  id bigint generated always as identity primary key,
  name text not null unique,
  country text,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id bigint generated always as identity primary key,
  bill_to text not null default '',
  issued_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.shipments (
  id bigint generated always as identity primary key,
  description text not null,
  destination_id bigint references public.destinations (id) on delete set null,
  weight_kg numeric(10, 2) not null check (weight_kg > 0),
  rate_per_kg numeric(10, 2) check (rate_per_kg >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'shipped', 'delivered')),
  ship_date date,
  invoice_id bigint references public.invoices (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id bigint generated always as identity primary key,
  invoice_id bigint not null references public.invoices (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  paid_date date not null default current_date,
  method text,
  note text,
  created_at timestamptz not null default now()
);

create index shipments_invoice_id_idx on public.shipments (invoice_id);
create index payments_invoice_id_idx on public.payments (invoice_id);

-- Row-level security: any signed-in user (i.e. you) has full access.
alter table public.destinations enable row level security;
alter table public.invoices enable row level security;
alter table public.shipments enable row level security;
alter table public.payments enable row level security;

create policy "authenticated full access" on public.destinations
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.invoices
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.shipments
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.payments
  for all to authenticated using (true) with check (true);
