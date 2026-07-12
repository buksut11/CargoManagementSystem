-- Flight module: a reusable list of destinations (airports / cities) per org.
-- Booking itineraries pick their From / To from this list instead of typing a
-- raw IATA code, so destinations stay consistent across bookings. Org-scoped,
-- members read, editors write — same pattern as flight_suppliers.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create table public.flight_destinations (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  code            text,
  created_at      timestamptz not null default now(),
  unique (organization_id, name)
);

create index flight_destinations_org_idx on public.flight_destinations (organization_id);

alter table public.flight_destinations enable row level security;

create policy "members read flight destinations" on public.flight_destinations
  for select to authenticated using (public.is_org_member(organization_id));
create policy "editors write flight destinations" on public.flight_destinations
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

create trigger flight_destinations_set_org
  before insert on public.flight_destinations
  for each row execute function public.set_org_from_current();
