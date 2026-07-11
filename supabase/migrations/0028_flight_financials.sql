-- Flight module (3/5): the agency ledger — customer receipts (money in),
-- supplier payments (money out) and refunds / voids / reissues. Org-scoped, one
-- auto-fill trigger each. RLS in 0029 keeps these three tables editor-only, so
-- agents never see the money movements.
--   outstanding receivable (per booking) = sale_total - Σ booking_payments
--   outstanding payable    (per booking) = net_cost   - Σ supplier_payments
-- Run this in your Supabase project: Dashboard → SQL Editor → paste → Run.

-- ── A. Customer receipts (receivable side) ──────────────────────────────────
create table public.booking_payments (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  booking_id      bigint not null references public.flight_bookings (id) on delete cascade,
  amount          numeric(12, 2) not null check (amount > 0),
  paid_date       date not null default current_date,
  method          text,
  note            text,
  created_at      timestamptz not null default now()
);

-- ── B. Supplier / airline payments (payable side) ───────────────────────────
-- booking_id is nullable so a bulk / BSP settlement can be attributed to a
-- supplier without a single booking (per-booking is the common case for v1).
create table public.supplier_payments (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  booking_id      bigint references public.flight_bookings (id) on delete cascade,
  supplier_id     bigint references public.flight_suppliers (id) on delete set null,
  amount          numeric(12, 2) not null check (amount > 0),
  paid_date       date not null default current_date,
  method          text,
  note            text,
  created_at      timestamptz not null default now()
);

-- ── C. Refunds / voids / reissues ───────────────────────────────────────────
create table public.booking_refunds (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  booking_id      bigint not null references public.flight_bookings (id) on delete cascade,
  refund_type     text not null default 'refund'
    check (refund_type in ('refund', 'void', 'reissue')),
  refund_date     date not null default current_date,
  customer_refund numeric(12, 2) not null default 0 check (customer_refund >= 0),  -- returned to customer
  supplier_refund numeric(12, 2) not null default 0 check (supplier_refund >= 0),  -- recovered from supplier
  penalty         numeric(12, 2) not null default 0 check (penalty >= 0),          -- airline penalty
  adm_amount      numeric(12, 2) not null default 0 check (adm_amount >= 0),       -- Agency Debit Memo cost
  note            text,
  created_at      timestamptz not null default now()
);

-- ── D. Indexes ──────────────────────────────────────────────────────────────
create index booking_payments_org_idx    on public.booking_payments (organization_id);
create index booking_payments_bkg_idx    on public.booking_payments (booking_id);
create index supplier_payments_org_idx   on public.supplier_payments (organization_id);
create index supplier_payments_bkg_idx   on public.supplier_payments (booking_id);
create index supplier_payments_supp_idx  on public.supplier_payments (supplier_id);
create index booking_refunds_org_idx     on public.booking_refunds (organization_id);
create index booking_refunds_bkg_idx     on public.booking_refunds (booking_id);

-- ── E. Auto-fill organization_id on insert ──────────────────────────────────
-- booking_payments and booking_refunds always have a booking → reuse
-- set_org_from_booking() (0027). supplier_payments may have no booking, so it
-- prefers the booking's org, then the supplier's, then the caller's current org.

create function public.set_org_for_supplier_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is null and new.booking_id is not null then
    select organization_id into new.organization_id
    from public.flight_bookings where id = new.booking_id;
  end if;
  if new.organization_id is null and new.supplier_id is not null then
    select organization_id into new.organization_id
    from public.flight_suppliers where id = new.supplier_id;
  end if;
  if new.organization_id is null then
    new.organization_id := public.current_org();
  end if;
  return new;
end;
$$;

create trigger booking_payments_set_org  before insert on public.booking_payments  for each row execute function public.set_org_from_booking();
create trigger booking_refunds_set_org   before insert on public.booking_refunds   for each row execute function public.set_org_from_booking();
create trigger supplier_payments_set_org before insert on public.supplier_payments for each row execute function public.set_org_for_supplier_payment();
