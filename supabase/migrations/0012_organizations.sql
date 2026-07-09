-- SaaS Phase 1 (1/5): the tenant table.
-- An "organization" is one customer business. Every piece of business data
-- will belong to exactly one organization (added in migration 0015), and a
-- user reaches data only through a membership (migration 0013).
-- Billing columns are placeholders — unused until the billing phase.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.
-- Run migrations 0012 → 0016 in order, in one sitting.

create table public.organizations (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  slug                   text unique,
  plan                   text not null default 'free',
  subscription_status    text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz not null default now()
);

-- RLS on from the start. Access policies are added in 0016, once the helper
-- functions (which need the memberships table) exist. Until then the table is
-- deny-all for the anon/authenticated roles, which is the safe default.
alter table public.organizations enable row level security;
