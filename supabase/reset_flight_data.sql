-- ⚠️  DESTRUCTIVE — start-fresh reset for the CargoBook Flights module.
-- Wipes ALL flight transactional data and resets ID counters to 1, while
-- KEEPING your reference data: customers, airlines (suppliers) and
-- destinations. Keeps the schema, organizations, memberships, login users
-- and roles untouched — only row data in the transactional tables is removed.
--
-- Run in your Supabase project: Dashboard → SQL Editor → paste → Run.
-- This cannot be undone — make sure you actually want a blank slate.

-- Clear every flight transactional table. CASCADE + RESTART IDENTITY handles
-- the foreign keys and makes new rows start numbering from 1 again.
--
-- KEPT INTACT (reference data, deliberately NOT listed below):
--   • public.flight_customers     — customers
--   • public.flight_suppliers     — airlines
--   • public.flight_destinations  — destinations
truncate table
  public.flight_bookings,     -- cascades to segments, passengers, booking_payments,
                              -- supplier_payments and booking_refunds
  public.flight_segments,
  public.flight_passengers,
  public.booking_payments,
  public.supplier_payments,
  public.booking_refunds,
  public.booking_seats,
  public.flight_audit_log
restart identity cascade;
