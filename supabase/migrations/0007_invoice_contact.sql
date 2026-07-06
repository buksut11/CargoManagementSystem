-- Adds the customer's phone and address to invoices.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

alter table public.invoices add column phone text;
alter table public.invoices add column address text;
