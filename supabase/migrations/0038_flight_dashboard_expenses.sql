-- Flight module: fold operating expenses into the dashboard aggregation.
-- Extends flight_dashboard_summary() (last rewritten in 0035) with one extra
-- figure, `expenses_total` — the sum of the org's operating expenses (0037).
-- Everything else is unchanged. The client subtracts it from booking gross
-- profit to show the true NET profit; the RPC stays SECURITY INVOKER so RLS
-- keeps the total scoped to the caller's org (and the expenses table is
-- editor-only, so agents never reach this figure anyway).
--
-- The app reads `expenses_total` when present and falls back to computing it
-- client-side, so shipping the code before running this migration is safe.
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
    -- Operating (overhead) expenses — staff salary, rent, electricity, other.
    'expenses_total', (select coalesce(sum(amount), 0) from public.flight_expenses),
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
