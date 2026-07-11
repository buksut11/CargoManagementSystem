-- Makes shipment attachments private. Receipts, customs slips and parcel photos
-- were in a PUBLIC storage bucket, so anyone with the URL could open them with
-- no login (URLs leak via email, history, referrers). After this, the objects
-- are reachable only through short-lived signed URLs that Supabase issues to
-- members of the owning organization; the app requests those signed URLs at
-- render time (see lib/storage.ts).
--
-- Org logos are intentionally left public: they appear on printed invoices that
-- customers receive, so they must load from a plain URL.
--
-- Deploy the app code that signs URLs BEFORE (or together with) running this, so
-- attachments keep displaying. Run this in Supabase → SQL Editor → Run.

-- ── 1. Flip the bucket to private ────────────────────────────────────────────
update storage.buckets set public = false where id = 'shipment-attachments';

-- ── 2. Scope reads to the owning organization ────────────────────────────────
-- The old policy let ANY authenticated user read every attachment. Signing a
-- URL requires SELECT on the object, so restrict it to members of the org whose
-- id prefixes the object path ({org_id}/{shipment}/{file}), matching the write
-- policies added in migrations 0017/0018.
drop policy if exists "read shipment attachments" on storage.objects;
create policy "org members read shipment attachments" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'shipment-attachments'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
