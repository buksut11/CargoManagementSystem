-- Flight module: a simple, standalone "Booking Seats" log.
-- Deliberately NOT linked to bookings, customers, airlines or destinations —
-- it is a free-standing list an org keeps for its own reference, with just a
-- date, an air name, a city and a seat count. Org-scoped (so each org only
-- sees its own rows); members read, editors write — same pattern as
-- flight_destinations.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create table public.booking_seats (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  seat_date       date not null,
  air_name        text not null,
  city            text not null,
  seats           integer not null default 0,
  created_at      timestamptz not null default now()
);

create index booking_seats_org_idx on public.booking_seats (organization_id);

alter table public.booking_seats enable row level security;

create policy "members read booking seats" on public.booking_seats
  for select to authenticated using (public.is_org_member(organization_id));
create policy "editors write booking seats" on public.booking_seats
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

create trigger booking_seats_set_org
  before insert on public.booking_seats
  for each row execute function public.set_org_from_current();
