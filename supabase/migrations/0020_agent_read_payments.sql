-- Lets agents see whether a shipment's invoice is paid / partially paid /
-- unpaid. Until now payments were admin-only (the "admins write payments"
-- policy is `for all`, so agents couldn't read them and the app had no way to
-- show a payment badge to an agent). This adds a members-read policy so any
-- member of the organization can read its payments; writing them stays
-- admin-only. The agent UI only surfaces a Paid/Partial/Unpaid badge, not the
-- individual amounts.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create policy "members read payments" on public.payments
  for select to authenticated using (public.is_org_member(organization_id));
