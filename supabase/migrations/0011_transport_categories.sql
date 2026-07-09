-- Refresh the transport / expense-type dropdown: drop the generic "Other"
-- option and add "Sahal" and "Porter" (with emoji icons to match the built-ins).
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- Remove the generic catch-all from the dropdown (and an earlier "🧳 Porter"
-- label if it was already added). Any existing expense row that used one of
-- these keeps its stored label — it just stops being offered as a new choice.
delete from public.expense_categories where name in ('📦 Other', '🧳 Porter');

-- Drop any plain-text "sahal" entry (no emoji) so only "🚌 Sahal" remains.
delete from public.expense_categories where lower(trim(name)) = 'sahal';

-- Add the two new transport types. "Porter" uses a walking-person icon.
-- Idempotent, so re-running is safe.
insert into public.expense_categories (name) values
  ('🚌 Sahal'),
  ('🚶 Porter')
on conflict (name) do nothing;

-- The old default pointed at the now-removed "Other"; point it at a type
-- that still exists. (The dropdown also pre-selects the first option, so this
-- is just a safety net for direct inserts.)
alter table public.expenses alter column transport_mode set default '✈️ Airplane';
