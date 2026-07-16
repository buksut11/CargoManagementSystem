-- EVC Plus / WaafiPay transaction log — an audit trail for mobile-money charges
-- that upgrade an organization to the Pro plan (see app/api/evc/charge). Every
-- charge attempt is recorded so a successful payment can always be reconciled
-- against WaafiPay's transaction id, even the failure/decline cases.
--
-- Rows are written by the server route using the service-role key (which
-- bypasses RLS), so there are no INSERT/UPDATE policies for clients — only an
-- admin-scoped SELECT so an org's owners/admins can see their own billing
-- history. Reuses is_org_admin (0013). Idempotent; safe to re-run.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create table if not exists public.evc_transactions (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- Unique per attempt (org-{id}-{timestamp}); the app sends it to WaafiPay as
  -- referenceId so a retry can never double-charge the same approval.
  reference_id    text not null unique,
  -- WaafiPay's own transaction id, present once a charge is approved.
  transaction_id  text,
  phone           text not null,
  amount          numeric(12, 2) not null,
  currency        text not null default 'USD',
  -- 'approved' when WaafiPay returned 2001, otherwise 'failed'.
  status          text not null,
  -- WaafiPay's responseCode / responseMsg, kept for support & reconciliation.
  response_code   text,
  response_msg    text,
  created_at      timestamptz not null default now()
);
create index if not exists evc_transactions_org_idx
  on public.evc_transactions (organization_id, created_at desc);

alter table public.evc_transactions enable row level security;

-- Admins read their own organization's charge history. No client writes: the
-- server route inserts via the service-role client.
drop policy if exists "admins read evc transactions" on public.evc_transactions;
create policy "admins read evc transactions" on public.evc_transactions
  for select to authenticated using (public.is_org_admin(organization_id));
