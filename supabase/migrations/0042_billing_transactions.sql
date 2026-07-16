-- Billing transaction log — an audit trail for the mobile-money / bank charges
-- that upgrade an organization to the Pro plan (see app/api/{evc,edahab,premier}
-- /charge). Every attempt is recorded, per provider, so a successful payment can
-- always be reconciled against the gateway's transaction id — including the
-- declines.
--
-- Rows are written by the server routes using the service-role key (which
-- bypasses RLS), so there are no INSERT/UPDATE policies for clients — only an
-- admin-scoped SELECT so an org's owners/admins can see their own billing
-- history. Reuses is_org_admin (0013). Idempotent; safe to re-run.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create table if not exists public.billing_transactions (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- Which gateway processed the charge: 'evc' (Hormuud/WaafiPay), 'edahab'
  -- (Somtel/Dahabshiil) or 'premier' (Premier Bank).
  provider        text not null,
  -- Unique per attempt (org-{id}-{timestamp}); sent to the gateway as its
  -- reference so a retry can never double-charge the same approval.
  reference_id    text not null unique,
  -- The gateway's own transaction id, present once a charge is approved.
  transaction_id  text,
  -- The payer's phone number or bank account, as entered.
  account         text not null,
  amount          numeric(12, 2) not null,
  currency        text not null default 'USD',
  -- 'approved' when the gateway accepted the charge, otherwise 'failed'.
  status          text not null,
  -- The gateway's response code / message, kept for support & reconciliation.
  response_code   text,
  response_msg    text,
  created_at      timestamptz not null default now()
);
create index if not exists billing_transactions_org_idx
  on public.billing_transactions (organization_id, created_at desc);

alter table public.billing_transactions enable row level security;

-- Admins read their own organization's charge history. No client writes: the
-- server routes insert via the service-role client.
drop policy if exists "admins read billing transactions" on public.billing_transactions;
create policy "admins read billing transactions" on public.billing_transactions
  for select to authenticated using (public.is_org_admin(organization_id));
