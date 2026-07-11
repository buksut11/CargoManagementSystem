# CargoBook → Flight Booking & Financial Management module

A concrete, reviewable plan for adding a **Flight Booking & Financial
Management System** for passenger-ticketing agents on top of the existing
multi-tenant CargoBook platform. Written before any code so we agree on the
shape first — same spirit as [`SAAS_PLAN.md`](SAAS_PLAN.md).

**Decisions locked in for this plan**

- **Booking type:** **passenger air ticketing** (airline tickets sold to
  customers — PNR, passengers, itinerary, fares), not air-cargo capacity.
- **Data source:** **manual entry now, GDS-ready schema** — the model is
  shaped so an Amadeus / Sabre / airline import can be added later without a
  rewrite (segments table, IATA codes, per-passenger ticket numbers, a
  `source` column).
- **Financial depth:** **full agency ledger** — per-booking
  sale / cost / commission / tax / fee → profit, **plus** a customer
  **receivables** ledger, a supplier/airline **payables** ledger, and
  **refund / void / reissue** handling with reports.
- **Coexistence:** **per-org module toggle** — an organization enables Cargo,
  Flights, or both; the sidebar adapts. Nothing forces a cargo customer to see
  flights, or vice-versa.
- **Roles:** **agents are read-only** in the flight module (view bookings and
  itinerary). Booking-desk and back-office staff are `manager`; owner/admin
  keep full control. This is identical to how cargo already treats agents.
- **Non-negotiable:** the current cargo app keeps working, untouched. The
  module is **purely additive** — new tables, new routes — with a single,
  guarded edit to the shared sidebar.

---

## 1. Where the app is today (baseline the module builds on)

- **Stack:** Next.js 16 (App Router) + React 19 + Tailwind v4 + TypeScript,
  data in Supabase (Postgres + Auth + Storage), optional Stripe. Data access is
  client-side via the anon key + RLS, with a service-role surface under
  `app/api/*` for trusted operations.
- **Tenancy (already built, reused as-is):** shared DB isolated by
  `organization_id` + Postgres Row-Level Security. Helper functions:
  - `public.is_org_member(org)` — any member (read).
  - `public.is_org_editor(org)` — owner/admin/manager (business writes).
  - `public.is_org_admin(org)` — owner/admin (members, settings, billing).
  - `public.current_org()` — the caller's org, used by auto-fill triggers.
- **Insert ergonomics:** business tables carry a `BEFORE INSERT` trigger
  (`set_org_from_current()` / `set_org_from_*`) that fills `organization_id`, so
  client code inserts rows **without setting the org** (see
  `components/shipment-form.tsx`). The flight tables reuse this pattern.
- **App shell:** `app/(app)/*` pages are gated by role in `layout.tsx`
  (`ADMIN_NAV` / `MANAGER_NAV` / `AGENT_NAV`, `pathAllowed`); org + role come
  from `components/org-context.tsx` / `role-context.tsx`.
- **Aggregation:** the dashboard uses an RPC (`dashboard_summary()`,
  SECURITY INVOKER so RLS still applies) instead of downloading rows. The
  flight dashboard mirrors this.
- **Migrations:** numbered `00NN_*.sql`, run by hand in the Supabase SQL Editor
  in order, always re-runnable and non-breaking. Next free number: **`0026`**.

**Implication:** the flight module does **not** touch the tenant boundary,
auth, roles, or any cargo table. It plugs into the existing rails.

---

## 2. Target architecture

### 2.1 Additive, side-by-side module

```
organizations ──< memberships >── auth.users
     │  modules text[]  ('cargo' | 'flights')
     │
     ├─ (cargo, unchanged)  shipments / invoices / payments / expenses / …
     │
     └─ (flights, new)      flight_customers / flight_suppliers
                            flight_bookings ──< flight_segments
                                            └──< flight_passengers
                            booking_payments   (receivables)
                            supplier_payments  (payables)
                            booking_refunds    (refund / void / reissue)
```

Every flight table carries `organization_id NOT NULL` and is governed by the
same RLS helpers as cargo. No flight table references a cargo table, so cargo
cannot regress from anything in this module.

### 2.2 Per-org module enablement

- `organizations.modules text[] not null default '{cargo}'`. Existing orgs are
  backfilled to `{cargo}` — i.e. no change until someone opts in.
- Toggled in **Settings** by an owner/admin (the existing org-update policy
  already gates this; no new policy needed). Later this can be plan-gated.
- The sidebar renders cargo nav when `'cargo' ∈ modules` and flight nav when
  `'flights' ∈ modules`.

### 2.3 Permissions (reusing the three helpers, no new roles)

| Capability | owner/admin | manager | agent |
| --- | --- | --- | --- |
| View bookings & itinerary | ✓ | ✓ | ✓ (read only) |
| Create / edit bookings, customers, suppliers | ✓ | ✓ | ✗ |
| Customer receipts, supplier payments, refunds | ✓ | ✓ | ✗ |
| Reports & financial dashboard | ✓ | ✓ | ✗ |
| Enable / disable the module (Settings) | ✓ | ✗ | ✗ |

Writes gate on `is_org_editor()`, reads on `is_org_member()` — the exact cargo
pattern, so agents stay read-only across the module.

---

## 3. Data model (migrations, continuing from `0026`)

Sketches show intent, not final SQL. Each table enables RLS, gets an
`organization_id` index, and an auto-fill insert trigger.

### `0026_org_modules.sql`

```sql
alter table public.organizations
  add column modules text[] not null default '{cargo}';
update public.organizations set modules = '{cargo}' where modules is null;
```

### `0027_flight_core.sql`

```sql
-- Reference data (per-org, mirrors destinations)
create table public.flight_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, email text, phone text, address text,
  created_at timestamptz not null default now()
);

create table public.flight_suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null default 'airline'
    check (type in ('airline','consolidator','bsp','gds','other')),
  contact text,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

-- The booking, with money as base columns + generated totals
create table public.flight_bookings (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  booking_ref text, pnr text,
  customer_id uuid references public.flight_customers(id) on delete set null,
  supplier_id uuid references public.flight_suppliers(id) on delete set null,
  airline text,
  trip_type text not null default 'oneway'
    check (trip_type in ('oneway','return','multicity')),
  status text not null default 'booked'
    check (status in ('quote','booked','ticketed','cancelled','refunded','void')),
  booking_date date not null default current_date,
  travel_date date,
  source text not null default 'manual',      -- GDS-ready hook
  base_fare numeric not null default 0,
  taxes numeric not null default 0,
  service_fee numeric not null default 0,
  markup numeric not null default 0,
  commission_amount numeric not null default 0,
  net_cost numeric not null default 0,
  sale_total numeric generated always as
    (base_fare + taxes + service_fee + markup) stored,
  profit numeric generated always as
    (base_fare + taxes + service_fee + markup - net_cost) stored,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organization_id, booking_ref)
);

create table public.flight_segments (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  booking_id bigint not null references public.flight_bookings(id) on delete cascade,
  segment_no int not null default 1,
  airline text, flight_number text,
  origin text, destination text,            -- IATA codes
  departure_at timestamptz, arrival_at timestamptz,
  cabin_class text,
  created_at timestamptz not null default now()
);

create table public.flight_passengers (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  booking_id bigint not null references public.flight_bookings(id) on delete cascade,
  full_name text not null,
  type text not null default 'adult' check (type in ('adult','child','infant')),
  ticket_number text,
  created_at timestamptz not null default now()
);
```

- **Auto-fill triggers:** `flight_customers`, `flight_suppliers`,
  `flight_bookings` reuse `set_org_from_current()`; `flight_segments`,
  `flight_passengers` use a new `set_org_from_booking()` (looks up the parent
  booking's org, mirroring `set_org_from_shipment()`).
- **Indexes:** `organization_id` on every table, plus
  `flight_segments(booking_id)`, `flight_passengers(booking_id)`,
  `flight_bookings(customer_id)`, `flight_bookings(supplier_id)`.

### `0028_flight_financials.sql`

```sql
create table public.booking_payments (        -- money IN (receivable)
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  booking_id bigint not null references public.flight_bookings(id) on delete cascade,
  amount numeric not null,
  paid_date date not null default current_date,
  method text, note text,
  created_at timestamptz not null default now()
);

create table public.supplier_payments (       -- money OUT (payable)
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  booking_id bigint references public.flight_bookings(id) on delete cascade,
  supplier_id uuid references public.flight_suppliers(id) on delete set null,
  amount numeric not null,
  paid_date date not null default current_date,
  method text, note text,
  created_at timestamptz not null default now()
);

create table public.booking_refunds (         -- refund / void / reissue
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  booking_id bigint not null references public.flight_bookings(id) on delete cascade,
  refund_type text not null default 'refund'
    check (refund_type in ('refund','void','reissue')),
  refund_date date not null default current_date,
  customer_refund numeric not null default 0,  -- returned to customer
  supplier_refund numeric not null default 0,  -- recovered from supplier
  penalty numeric not null default 0,          -- airline penalty
  adm_amount numeric not null default 0,       -- Agency Debit Memo cost
  note text,
  created_at timestamptz not null default now()
);
```

- **Outstanding receivable** per booking = `sale_total − Σ booking_payments`.
- **Outstanding payable** per booking = `net_cost − Σ supplier_payments`.
- Refund rows adjust the effective profit; reports net them out.
- Auto-fill: all three use `set_org_from_booking()`.

### `0029_rls_flights.sql`

For **every** flight table, the cargo pattern:

```sql
alter table public.flight_bookings enable row level security;
create policy "members read flight bookings" on public.flight_bookings
  for select to authenticated using (public.is_org_member(organization_id));
create policy "editors write flight bookings" on public.flight_bookings
  for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));
```

Reference/booking tables: `is_org_member` read, `is_org_editor` write. Money
tables (`booking_payments`, `supplier_payments`, `booking_refunds`):
`is_org_editor` for both read and write — agents don't see the ledger.

### `0030_flight_dashboard.sql`

`flight_dashboard_summary()` — a SECURITY INVOKER SQL function (so RLS still
scopes it to the caller's org) returning the flight KPIs, a monthly sales
series, and recent bookings in a few hundred bytes — exactly like
`dashboard_summary()`:

```
sales_total, cost_total, profit_total, received, receivable_outstanding,
paid_to_suppliers, payable_outstanding, booking_count,
sales_by_month, recent_bookings
```

### `0031_flight_audit.sql` (optional, Phase E)

A booking audit trail parallel to the shipment one, writing to a **separate**
`flight_audit_log` table so cargo's `audit_log` is never touched.

---

## 4. Application changes (Next.js)

### 4.1 The only edit to a load-bearing file

`app/(app)/layout.tsx` — resolve `organizations.modules` alongside the
membership, and build the sidebar from it (cargo nav for `'cargo'`, flight nav
for `'flights'`). **Guarded:** if `modules` is absent or the query errors, fall
back to today's cargo-only nav, so existing installs behave exactly as now
until a module is enabled.

### 4.2 New routes (all inside the existing `(app)` shell)

```
/flights            → financial dashboard (sales, receivables, payables, profit, charts)
/flights/bookings   → list · /new · /[id] detail (passengers, segments, payments, refunds)
/flights/customers  → CRUD + receivable balance
/flights/suppliers  → CRUD + payable balance
/flights/payments   → customer receipts ledger
/flights/payables   → supplier payments ledger
/flights/reports    → daily sales, airline-wise, outstanding, profit
app/flights/bookings/[id]/print → printable ticket / invoice (mirrors shipment print)
```

Path gating extends `pathAllowed`: agents may only reach `/flights/bookings`
(read); manager+ reach the rest. Nav lists come from the enabled modules.

### 4.3 Supporting pieces

- `lib/types.ts` — additive `FlightCustomer`, `FlightSupplier`,
  `FlightBooking`, `FlightSegment`, `FlightPassenger`, `BookingPayment`,
  `SupplierPayment`, `BookingRefund`, and `modules: string[]` on
  `Organization`.
- `components/icons.tsx` — a `PlaneIcon` (additive).
- `app/(app)/settings/page.tsx` — a "Modules" toggle (owner/admin).
- CSV export via the existing `lib/csv.ts`; currency via the existing
  `CURRENCY` in `lib/format.ts` (single-currency for v1).

---

## 5. Phased roadmap (each phase ships & verifies on its own)

1. **Phase A — DB foundation** (`0026`–`0030`): tables, RLS, triggers, report
   RPC. Flights are in **no** org's `modules` yet, so there is **zero
   user-visible change**. Verify cross-tenant RLS isolation (org A can never
   see org B's bookings/ledger) per `SAAS_PLAN.md` §6.
2. **Phase B — Plumbing:** types, guarded modules-aware sidebar, Settings
   toggle, `PlaneIcon`. Enable `flights` for the test org.
3. **Phase C — Booking desk:** bookings list / new / detail, customers,
   suppliers, passengers, segments.
4. **Phase D — Financials:** customer receipts, supplier payables,
   refund / void / reissue, flight dashboard + reports, printable invoice, CSV.
5. **Phase E — Polish:** booking audit trail, plan-gating the module, a GDS
   import stub that populates bookings + segments.

Order matters: the isolation boundary (Phase A) lands and is tested before any
money or UI is built on top of it.

---

## 6. Security & testing

- **RLS is the boundary.** Test that a member of org A cannot read or write any
  `flight_*` row of org B — bookings, segments, passengers, payments,
  supplier_payments, refunds.
- **Agent restriction:** an agent sees bookings (read) but cannot write any
  flight table and cannot read the money tables.
- **Editor scope:** managers get full booking + ledger access but still cannot
  toggle the module (that stays owner/admin via `is_org_admin`).
- Build + visual check with the `verify` skill at each phase.

---

## 7. Open decisions (deferred, non-blocking)

- **Multi-currency** — v1 is single-currency (existing `CURRENCY`). A later add
  would put `currency` on the booking and store amounts per-currency.
- **Booking-desk agents** — if you later want cheaper `agent` seats to *create*
  bookings, add a member-write policy on the booking tables plus a
  field-restriction trigger (like `enforce_agent_status_only`). Left out of v1
  by decision (agents read-only).
- **Bulk BSP settlement** — v1 attributes supplier payments per booking;
  bulk/periodic settlement can be layered on later.
- **GDS integration** — the schema is import-ready; the actual Amadeus/Sabre
  connector is Phase E+ and needs credentials.

---

## 8. First concrete step when we start building

Phase A: `0026_org_modules.sql` through `0030_flight_dashboard.sql`, followed by
an RLS isolation check. Nothing user-facing changes until Phase B, which makes
Phase A safe to ship and verify on its own.
