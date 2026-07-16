-- Per-invoice money rollup done in the database instead of the browser.
-- The Shipments and Invoices lists used to download every payment row (and the
-- Invoices list every shipment row) just to show a Paid/Partial/Unpaid badge,
-- so those payloads grew with the whole payment history. This function returns
-- one small row per invoice — its invoiced total and the sum paid — regardless
-- of how many payments exist.
--
-- It is a plain (SECURITY INVOKER) function, so Row-Level Security still
-- applies: the aggregates only ever cover rows the caller's organization can
-- see, and agents (who may read but not write payments, migration 0020) get
-- the same badges they see today. The app falls back to the old client-side
-- computation if this function is absent, so shipping the code before running
-- this migration is safe.
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

create or replace function public.invoice_payment_totals()
returns table (invoice_id bigint, invoiced numeric, paid numeric)
language sql
stable
as $$
  select i.id,
         coalesce(s.invoiced, 0),
         coalesce(p.paid, 0)
  from public.invoices i
  left join (
    select invoice_id, sum(total) as invoiced
    from public.shipments
    where invoice_id is not null
    group by 1
  ) s on s.invoice_id = i.id
  left join (
    select invoice_id, sum(amount) as paid
    from public.payments
    group by 1
  ) p on p.invoice_id = i.id;
$$;

grant execute on function public.invoice_payment_totals() to authenticated;
