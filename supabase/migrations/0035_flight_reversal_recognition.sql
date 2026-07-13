-- Flight module: reversed-booking revenue recognition.
-- A cancelled / refunded / voided ticket is not the agency's money, so it must
-- not inflate the dashboard's sales, cost or profit. Previously only 'void' was
-- excluded, so cancelled and refunded bookings still counted in full. This
-- rewrites flight_dashboard_summary() to recognise revenue only from bookings
-- that are NOT reversed, and to net receipts/refunds/supplier payments to those
-- same recognised bookings so the outstanding figures stay consistent.
--
-- The returned `received` and `receivable` are already net of customer refunds
-- (the client no longer subtracts them a second time). `recent` still lists the
-- latest 5 bookings of any status so reversed ones remain visible with a badge.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create or replace function public.flight_dashboard_summary()
returns jsonb
language sql
stable
as $$
  with recognized as (
    select *
    from public.flight_bookings
    where status not in ('void', 'cancelled', 'refunded')
  ),
  receipts as (
    select coalesce(sum(bp.amount), 0) as total
    from public.booking_payments bp
    join recognized r on r.id = bp.booking_id
  ),
  cust_refunds as (
    select coalesce(sum(br.customer_refund), 0) as total
    from public.booking_refunds br
    join recognized r on r.id = br.booking_id
  ),
  supplier_paid as (
    select coalesce(sum(sp.amount), 0) as total
    from public.supplier_payments sp
    join recognized r on r.id = sp.booking_id
  )
  select jsonb_build_object(
    'booking_count',  (select count(*) from recognized),
    'sales_total',    (select coalesce(sum(sale_total), 0) from recognized),
    'cost_total',     (select coalesce(sum(net_cost), 0) from recognized),
    'profit_total',   (select coalesce(sum(profit), 0) from recognized),
    -- received / receivable are net of customer refunds on recognised bookings
    'received',       (select total from receipts) - (select total from cust_refunds),
    'paid_suppliers', (select total from supplier_paid),
    'refunds_total',  (select coalesce(sum(customer_refund), 0) from public.booking_refunds),
    'receivable',     (select coalesce(sum(sale_total), 0) from recognized)
                      - (select total from receipts)
                      - (select total from cust_refunds),
    'payable',        (select coalesce(sum(net_cost), 0) from recognized)
                      - (select total from supplier_paid),
    'sales_by_month', (select coalesce(jsonb_object_agg(m, amt), '{}'::jsonb) from (
                         select to_char(booking_date, 'YYYY-MM') as m,
                                sum(sale_total) as amt
                         from recognized
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
