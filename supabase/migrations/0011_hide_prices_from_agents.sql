-- Hide shipment prices from agents at the DATABASE layer.
--
-- Until now the UI hid `total` / `rate_per_kg` from agents, but the row-level
-- policy "read shipments" (using true) let any signed-in user read every
-- column straight from the API — so an agent could read prices with the anon
-- key / devtools. This migration enforces the restriction in the database:
--
--   • Agents lose direct SELECT on public.shipments.
--   • Everyone reads through public.shipments_view, which returns the price
--     columns only to admins and NULL to agents.
--   • Admins keep full direct access to the base table (unchanged), so every
--     admin page, the audit trigger and the agent status/notes update path all
--     behave exactly as before.
--
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- 1. Remove the blanket agent read on the base table. Admins keep access via
--    their existing "admin full access" policy; the "update shipments" policy
--    stays so agents can still change status + notes (guarded by the trigger).
drop policy "read shipments" on public.shipments;

-- 2. Price-masking view. It runs with the definer's privileges (owner =
--    postgres, so it can read the base table on the agent's behalf) while
--    public.is_admin() still resolves to the CALLING user — agents therefore
--    see NULL prices, admins see the real values.
create or replace view public.shipments_view
with (security_invoker = false) as
select
  id,
  description,
  destination_id,
  weight_kg,
  case when public.is_admin() then rate_per_kg end as rate_per_kg,
  case when public.is_admin() then total end as total,
  status,
  ship_date,
  invoice_id,
  created_at,
  notes,
  attachment_url
from public.shipments;

grant select on public.shipments_view to authenticated;
