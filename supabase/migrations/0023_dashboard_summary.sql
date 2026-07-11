-- Dashboard aggregation done in the database instead of the browser.
-- The dashboard used to download every shipment, payment and expense row and
-- sum them client-side, so the payload grew with the whole history. This
-- function returns just the totals, the 6-month chart series and the 5 most
-- recent shipments — a few hundred bytes regardless of how much data exists.
--
-- It is a plain (SECURITY INVOKER) function, so Row-Level Security still applies:
-- the aggregates only ever cover rows the caller's organization can see. The app
-- falls back to the old client-side computation if this function is absent, so
-- shipping the code before running this migration is safe.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create or replace function public.dashboard_summary()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'shipment_count', (select count(*) from public.shipments),
    'total_kg',       (select coalesce(sum(weight_kg), 0) from public.shipments),
    'invoiced',       (select coalesce(sum(total), 0)
                         from public.shipments where invoice_id is not null),
    'income',         (select coalesce(sum(total), 0) from public.shipments),
    'received',       (select coalesce(sum(amount), 0) from public.payments),
    'spent',          (select coalesce(sum(amount), 0) from public.expenses),
    'kg_by_month',    (select coalesce(jsonb_object_agg(m, kg), '{}'::jsonb) from (
                         select to_char(
                                  coalesce(ship_date, (created_at at time zone 'UTC')::date),
                                  'YYYY-MM'
                                ) as m,
                                sum(weight_kg) as kg
                         from public.shipments
                         group by 1
                       ) a),
    'pay_by_month',   (select coalesce(jsonb_object_agg(m, amt), '{}'::jsonb) from (
                         select to_char(paid_date, 'YYYY-MM') as m,
                                sum(amount) as amt
                         from public.payments
                         group by 1
                       ) b),
    'recent',         (select coalesce(jsonb_agg(r), '[]'::jsonb) from (
                         select id, description, weight_kg, status, ship_date, created_at
                         from public.shipments
                         order by created_at desc
                         limit 5
                       ) r)
  );
$$;

grant execute on function public.dashboard_summary() to authenticated;
