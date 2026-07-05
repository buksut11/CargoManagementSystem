-- Adds delivery expenses (for net-profit tracking) and Admin/Agent roles.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- ── User roles ────────────────────────────────────────────────────────────
-- Every auth user gets a profile row. Existing users become admins so the
-- app keeps working for you; new users default to the restricted 'agent'
-- role until you promote them (see README).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'agent' check (role in ('admin', 'agent')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-create a profile whenever a user is added in Supabase Auth.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Existing users (created before this migration) become admins.
insert into public.profiles (id, email, role)
select id, email, 'admin' from auth.users
on conflict (id) do nothing;

create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "admin full access" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Delivery expenses ─────────────────────────────────────────────────────
-- Costs incurred delivering a shipment (airplane, car, motorcycle, …).
-- Net profit for a shipment = shipment.total − sum of its expenses.

create table public.expenses (
  id bigint generated always as identity primary key,
  shipment_id bigint not null references public.shipments (id) on delete cascade,
  transport_mode text not null default 'other'
    check (transport_mode in ('airplane', 'car', 'motorcycle', 'other')),
  description text,
  amount numeric(12, 2) not null check (amount > 0),
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index expenses_shipment_id_idx on public.expenses (shipment_id);

alter table public.expenses enable row level security;

create policy "admin full access" on public.expenses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Role-based access on existing tables ─────────────────────────────────
-- Admins keep full access. Agents can read shipments/destinations and may
-- ONLY change a shipment's status (enforced by the trigger below).

drop policy "authenticated full access" on public.destinations;
drop policy "authenticated full access" on public.invoices;
drop policy "authenticated full access" on public.shipments;
drop policy "authenticated full access" on public.payments;

create policy "admin full access" on public.destinations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "read destinations" on public.destinations
  for select to authenticated using (true);

create policy "admin full access" on public.invoices
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin full access" on public.payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin full access" on public.shipments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "read shipments" on public.shipments
  for select to authenticated using (true);
create policy "update shipments" on public.shipments
  for update to authenticated using (true) with check (true);

-- Agents may only flip the status column; any other change is rejected.
create function public.enforce_agent_status_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No auth context (service role / SQL editor) or admin: allow everything.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.description is distinct from old.description
    or new.destination_id is distinct from old.destination_id
    or new.weight_kg is distinct from old.weight_kg
    or new.rate_per_kg is distinct from old.rate_per_kg
    or new.total is distinct from old.total
    or new.ship_date is distinct from old.ship_date
    or new.notes is distinct from old.notes
    or new.invoice_id is distinct from old.invoice_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Agents may only update the shipment status';
  end if;
  return new;
end;
$$;

create trigger shipments_agent_status_only
  before update on public.shipments
  for each row execute function public.enforce_agent_status_only();
