-- Flight module: per-passenger sale price. Adult / child / infant fares differ,
-- so each passenger carries its own sale amount. The booking's base_fare is kept
-- in sync with Σ passenger sale_amount by the app, so the generated sale_total /
-- profit columns on flight_bookings stay correct.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

alter table public.flight_passengers
  add column sale_amount numeric(12, 2) not null default 0 check (sale_amount >= 0);
