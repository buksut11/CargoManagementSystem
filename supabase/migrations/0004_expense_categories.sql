-- Custom transport / expense types: the dropdown becomes database-backed so
-- admins can add their own entries (e.g. Ship, Truck, Courier fee).
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create table public.expense_categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.expense_categories enable row level security;

create policy "admin full access" on public.expense_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "read expense categories" on public.expense_categories
  for select to authenticated using (true);

insert into public.expense_categories (name) values
  ('✈️ Airplane'),
  ('🚗 Car'),
  ('🏍️ Motorcycle'),
  ('📦 Other');

-- Allow any category name in expenses (was locked to the 4 built-ins).
alter table public.expenses drop constraint expenses_transport_mode_check;
alter table public.expenses alter column transport_mode set default '📦 Other';

-- Rewrite existing rows from the old keys to the display names.
update public.expenses set transport_mode = case transport_mode
  when 'airplane' then '✈️ Airplane'
  when 'car' then '🚗 Car'
  when 'motorcycle' then '🏍️ Motorcycle'
  when 'other' then '📦 Other'
  else transport_mode
end;
