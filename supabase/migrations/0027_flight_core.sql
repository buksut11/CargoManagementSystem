-- Flight module (2/5): booking core — customers, suppliers, bookings,
-- itinerary segments and passengers. All org-scoped, following the exact cargo
-- pattern (organization_id + auto-fill trigger + per-org indexes). RLS is added
-- separately in 0029 so the security boundary is one reviewable file.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- ── A. Reference data (per-org, mirrors public.destinations) ─────────────────

create table public.flight_customers (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  address         text,
  created_at      timestamptz not null default now()
);

create table public.flight_suppliers (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  type            text not null default 'airline'
    check (type in ('airline', 'consolidator', 'bsp', 'gds', 'other')),
  contact         text,
  created_at      timestamptz not null default now(),
  unique (organization_id, name)
);

-- ── B. The booking ──────────────────────────────────────────────────────────
-- Money is stored as base columns; sale_total and profit are computed by the
-- database (GENERATED columns) so they can never drift from their parts — the
-- same "let Postgres compute it" approach as dashboard_summary() (0023).
--   sale_total = base_fare + taxes + service_fee + markup   (what the customer pays)
--   profit     = sale_total - net_cost                      (agent's margin)
-- `source` defaults to 'manual' and is the hook a future GDS import writes to.

create table public.flight_bookings (
  id                bigint generated always as identity primary key,
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  booking_ref       text,
  pnr               text,
  customer_id       bigint references public.flight_customers (id) on delete set null,
  supplier_id       bigint references public.flight_suppliers (id) on delete set null,
  airline           text,
  trip_type         text not null default 'oneway'
    check (trip_type in ('oneway', 'return', 'multicity')),
  status            text not null default 'booked'
    check (status in ('quote', 'booked', 'ticketed', 'cancelled', 'refunded', 'void')),
  booking_date      date not null default current_date,
  travel_date       date,
  source            text not null default 'manual',
  base_fare         numeric(12, 2) not null default 0 check (base_fare >= 0),
  taxes             numeric(12, 2) not null default 0 check (taxes >= 0),
  service_fee       numeric(12, 2) not null default 0 check (service_fee >= 0),
  markup            numeric(12, 2) not null default 0 check (markup >= 0),
  commission_amount numeric(12, 2) not null default 0 check (commission_amount >= 0),
  net_cost          numeric(12, 2) not null default 0 check (net_cost >= 0),
  sale_total        numeric(14, 2)
    generated always as (base_fare + taxes + service_fee + markup) stored,
  profit            numeric(14, 2)
    generated always as (base_fare + taxes + service_fee + markup - net_cost) stored,
  notes             text,
  created_by        uuid references auth.users (id),
  created_at        timestamptz not null default now(),
  unique (organization_id, booking_ref)
);

-- ── C. Itinerary (GDS-ready) ────────────────────────────────────────────────

create table public.flight_segments (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  booking_id      bigint not null references public.flight_bookings (id) on delete cascade,
  segment_no      int not null default 1,
  airline         text,
  flight_number   text,
  origin          text,          -- IATA code
  destination     text,          -- IATA code
  departure_at    timestamptz,
  arrival_at      timestamptz,
  cabin_class     text,
  created_at      timestamptz not null default now()
);

create table public.flight_passengers (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  booking_id      bigint not null references public.flight_bookings (id) on delete cascade,
  full_name       text not null,
  type            text not null default 'adult'
    check (type in ('adult', 'child', 'infant')),
  ticket_number   text,
  created_at      timestamptz not null default now()
);

-- ── D. Indexes (every query filters by org; children filter by booking) ──────
create index flight_customers_org_idx   on public.flight_customers (organization_id);
create index flight_suppliers_org_idx   on public.flight_suppliers (organization_id);
create index flight_bookings_org_idx    on public.flight_bookings (organization_id);
create index flight_bookings_cust_idx   on public.flight_bookings (customer_id);
create index flight_bookings_supp_idx   on public.flight_bookings (supplier_id);
create index flight_segments_org_idx    on public.flight_segments (organization_id);
create index flight_segments_bkg_idx    on public.flight_segments (booking_id);
create index flight_passengers_org_idx  on public.flight_passengers (organization_id);
create index flight_passengers_bkg_idx  on public.flight_passengers (booking_id);

-- ── E. Auto-fill organization_id on insert ──────────────────────────────────
-- Top-level tables reuse the existing set_org_from_current() (0015). Child rows
-- inherit the org from their parent booking via a new helper, mirroring
-- set_org_from_shipment().

create function public.set_org_from_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id
    from public.flight_bookings where id = new.booking_id;
  end if;
  return new;
end;
$$;

create trigger flight_customers_set_org  before insert on public.flight_customers  for each row execute function public.set_org_from_current();
create trigger flight_suppliers_set_org  before insert on public.flight_suppliers  for each row execute function public.set_org_from_current();
create trigger flight_bookings_set_org   before insert on public.flight_bookings   for each row execute function public.set_org_from_current();
create trigger flight_segments_set_org   before insert on public.flight_segments   for each row execute function public.set_org_from_booking();
create trigger flight_passengers_set_org before insert on public.flight_passengers for each row execute function public.set_org_from_booking();
