-- Flight module (5/5): the flight financial dashboard aggregation.
-- Like dashboard_summary() (0023), this returns just the KPIs, a 6-month sales
-- series and the 5 most recent bookings — a few hundred bytes regardless of
-- history — instead of shipping every row to the browser.
--
-- It is a plain (SECURITY INVOKER) function, so Row-Level Security still applies:
-- the aggregates only ever cover the caller's organization, and the money tables
-- stay editor-only (0029). The app falls back gracefully if this function is
-- absent, so shipping the code before running this migration is safe.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create or replace function public.flight_dashboard_summary()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'booking_count',  (select count(*) from public.flight_bookings
                         where status <> 'void'),
    'sales_total',    (select coalesce(sum(sale_total), 0) from public.flight_bookings
                         where status <> 'void'),
    'cost_total',     (select coalesce(sum(net_cost), 0) from public.flight_bookings
                         where status <> 'void'),
    'profit_total',   (select coalesce(sum(profit), 0) from public.flight_bookings
                         where status <> 'void'),
    'received',       (select coalesce(sum(amount), 0) from public.booking_payments),
    'paid_suppliers', (select coalesce(sum(amount), 0) from public.supplier_payments),
    'refunds_total',  (select coalesce(sum(customer_refund), 0) from public.booking_refunds),
    -- outstanding = billed − collected  /  owed − paid
    'receivable',     (select coalesce(sum(sale_total), 0) from public.flight_bookings
                         where status <> 'void')
                      - (select coalesce(sum(amount), 0) from public.booking_payments),
    'payable',        (select coalesce(sum(net_cost), 0) from public.flight_bookings
                         where status <> 'void')
                      - (select coalesce(sum(amount), 0) from public.supplier_payments),
    'sales_by_month', (select coalesce(jsonb_object_agg(m, amt), '{}'::jsonb) from (
                         select to_char(booking_date, 'YYYY-MM') as m,
                                sum(sale_total) as amt
                         from public.flight_bookings
                         where status <> 'void'
                         group by 1
                       ) a),
    'recent',         (select coalesce(jsonb_agg(r), '[]'::jsonb) from (
                         select id, booking_ref, pnr, airline, status,
                                travel_date, sale_total, created_at
                         from public.flight_bookings
                         order by created_at desc
                         limit 5
                       ) r)
  );
$$;

grant execute on function public.flight_dashboard_summary() to authenticated;
