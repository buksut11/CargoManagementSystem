-- Flight module: capture WHOSE salary a staff-salary expense is.
-- A "Staff salary" operating expense (0037) is about a specific person, but the
-- ledger only stored a category + free-text note. This adds an optional
-- `staff_name` so the person can be recorded in its own field — shown in the
-- form only when the "Staff salary" category is selected, and left null for
-- rent / electricity / other, which are not tied to a person.
--
-- The column is nullable, so old rows and non-staff expenses stay valid. The
-- app writes it only for staff-salary expenses and falls back gracefully when
-- the column is absent, so shipping the code before running this migration is
-- safe. Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

alter table public.flight_expenses
  add column if not exists staff_name text;
