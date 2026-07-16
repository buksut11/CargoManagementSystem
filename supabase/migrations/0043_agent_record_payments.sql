-- Lets agents record (add) payments in the Cargo Section. Until now writing
-- payments was editor-only (owner/admin/manager) via "editors write payments",
-- so an agent could see a Paid/Partial/Unpaid badge but could not log a
-- customer's payment. This adds an INSERT-only policy for any organization
-- member, which includes agents. Editing and deleting payments stays with
-- editors (the existing "editors write payments" `for all` policy still gates
-- update/delete), so agents can add payments but not remove or alter them.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create policy "members record payments" on public.payments
  for insert to authenticated
  with check (public.is_org_member(organization_id));
