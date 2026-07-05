# CargoBook — Product Specification

**Version 1.0 · Standalone air-cargo management system**

CargoBook is a complete operations system for a small airline or air-cargo operator. Staff
log in to quote, book, accept, load, track, and bill air freight; customers track their
shipments on a public page — no login needed.

This document is the **source of truth**. The eleven plans in `plans/` describe the build
order; when a plan and this spec disagree, this spec wins.

---

## 1. Vision & design bar

The goal is a system that feels like a modern flagship SaaS product, not an internal tool:

- **Fast to operate.** A trained agent can quote a shipment in under 30 seconds and book one
  in under 2 minutes. Every list screen has search-as-you-type and keyboard-friendly forms.
- **Impossible to get wrong.** The UI prevents mistakes instead of reporting them: you cannot
  overload a flight, book a cancelled flight, or accept more pieces than were booked.
  Chargeable weight, totals, and balances are always computed by the database — never typed in.
- **Beautiful by default.** A confident, distinctive look (see §9): cargo-orange primary on
  slate neutrals, light + dark themes, shadcn/ui components. Every screen has a designed
  empty state, loading skeletons, and toast feedback. Status is always a colored badge,
  never plain text.
- **Trustworthy.** Every shipment has a complete, timestamped event history showing who did
  what. Money amounts are computed server-side and immutable once invoiced.

## 2. Technology (fixed — do not change)

- **Next.js 15**, App Router, TypeScript `strict`, Turbopack.
- **Supabase**: Postgres + Auth + Row-Level Security, via `@supabase/supabase-js` +
  `@supabase/ssr` (browser client, server client, middleware session refresh).
- **Tailwind CSS 4 + shadcn/ui**, `next-themes` for light/dark, `lucide-react` icons,
  `sonner` toasts.
- **react-hook-form + Zod** for every form (client and server-action validation).
- **@react-pdf/renderer** for all printable documents.
- **date-fns** for dates; **Vitest** for unit tests.
- Conventions: numbered SQL migrations in `supabase/migrations/0001_*.sql` applied via the
  Supabase SQL Editor; RLS enabled on **every** table; business rules enforced by Postgres
  functions (`SECURITY DEFINER`) so they hold even if the UI misbehaves; pages are server
  components, mutations are server actions in `actions.ts`, dialogs are client components;
  pure business math lives in `lib/` with tests.

## 3. Users & permissions

Auth is Supabase email + password. Public sign-up is **disabled** — staff accounts are
created by admins. A `profiles` table (1:1 with auth users) stores full name, role
(`admin`/`agent`), and `active` flag; deactivated staff are locked out on next request.
SQL helpers `is_admin()` and `is_active_staff()` gate every RLS policy.

| Role | Can do |
| --- | --- |
| **Agent** | Everything operational: quotes, shipments, acceptance, manifesting, payments, tracking, customers. |
| **Admin** | Everything agents can, plus: staff management, airports/aircraft/flights, rate cards, commodity & cargo settings, voiding invoices, reports, cancelling manifested shipments. |
| **Public (no login)** | One page only: track a shipment by AWB number. Read-only, no prices shown. |

## 4. Glossary (plain-language)

- **AWB (Air Waybill):** the cargo equivalent of a ticket — the contract and ID for one
  shipment. Format: `XXX-NNNNNNNC` (3-digit airline prefix, 7-digit serial, 1 check digit).
- **Shipper / Consignee:** who sends the cargo / who receives it.
- **Piece:** one physical box/pallet. A shipment has one or more pieces.
- **Gross weight:** what the scale says, in kg.
- **Volumetric weight:** `(length × width × height in cm) ÷ 6000` per piece — the IATA
  standard, so bulky-but-light cargo pays fairly.
- **Chargeable weight:** `max(gross, volumetric)`, rounded **up** to the next 0.5 kg. This is
  what the customer pays for.
- **Manifest:** the official list of all cargo loaded on one flight.
- **Commodity:** what the goods are (electronics, perishables, documents…), used for
  handling rules and rating.

## 5. Shipment lifecycle (the heart of the system)

```
DRAFT → BOOKED → ACCEPTED → MANIFESTED → DEPARTED → ARRIVED → DELIVERED
                    (any state before DEPARTED can go to → CANCELLED)
```

| Status | Meaning | Who sets it |
| --- | --- | --- |
| `draft` | Quote saved, not confirmed. Holds no capacity. | Agent (wizard step) |
| `booked` | Confirmed with the customer. AWB number issued. Reserves flight capacity if a flight was chosen. | Agent |
| `accepted` | Cargo physically received at warehouse; real weights/dims verified and re-rated. | Agent (acceptance screen) |
| `manifested` | Locked onto a specific flight's manifest. | Agent |
| `departed` | Flight left. Set for all manifested shipments in one click. | Agent |
| `arrived` | Reached destination airport. | Agent |
| `delivered` | Handed to consignee (name of receiver recorded). | Agent |
| `cancelled` | Cancelled with reason. Releases capacity. After `manifested`, only admins can cancel. | Agent / Admin |

Rules:
- Transitions only move forward (plus cancel). Enforced in the database, not just the UI.
- Every transition writes a row to `cargo_events` (timestamp, staff member, optional note) —
  this powers tracking.
- A shipment cannot be `manifested` unless payment terms allow it: prepaid shipments must be
  fully paid; collect shipments may fly unpaid (paid on arrival).

## 6. Modules & screens

### 6.1 App shell & authentication

- `/login`: email + password, Zod-validated, friendly errors, deactivated-account guard.
- Protected dashboard layout: sidebar (desktop) + bottom nav (mobile) with sections
  **Dashboard, Shipments, Quote, Flights, Customers, Reports (admin), Settings (admin)**;
  user menu (profile, theme toggle, sign out). Middleware redirects signed-out users to
  `/login` (except the public `/track` page).
- `/profile`: staff member edits own name and password.

### 6.2 Settings (admin only, `/settings/…`)

- **Staff:** list, invite/create (email + temp password), edit role, deactivate/reactivate,
  reset password.
- **Airports:** IATA code (3 letters, unique), name, city, country, active flag.
- **Aircraft:** registration, type/model, `cargo_capacity_kg`, `cargo_capacity_m3`, active.
- **Flights:** flight number, origin, destination, departure datetime (airline-local),
  aircraft, status (`scheduled`/`departed`/`arrived`/`cancelled`). List filterable by
  route/date; create/edit/cancel dialogs. Cancelling a flight with manifested cargo is
  blocked until the cargo is removed.
- **Commodities:** code + name + flags: `is_dangerous` (blocked from booking, shown with a
  warning), `requires_cold_chain`, `is_valuable`. Seed ~10 sensible defaults (GEN General,
  PER Perishables, DOC Documents, ELE Electronics, PHA Pharma, …).
- **Cargo settings:** airline name (for documents), AWB prefix (3 digits), currency code
  (display only, single-currency system), volumetric divisor (default 6000), fuel
  surcharge %, security surcharge % (both applied to the freight charge), fixed AWB fee.
- **Rate cards:** see 6.4.

### 6.3 Customers (`/customers`)

Companies and individuals who ship or receive.

- Fields: type (company/individual), name, contact person, phone, email, address, city,
  country, tax/ID number, internal notes.
- List with instant search (name/phone/email), detail page showing full shipment history and
  lifetime totals (shipments, kg, revenue).
- Any customer can act as shipper on one shipment and consignee on another — one shared list.
- Created inline from the booking wizard (dialog) as well as from the customers screen.

### 6.4 Rates & quoting (`/quote` + settings)

- A **rate card** = origin airport + destination airport + commodity (or "any") + valid-from
  date, with **weight-break pricing**: minimum charge, then per-kg price at breaks
  `≥1 / ≥45 / ≥100 / ≥300 / ≥500 kg` (editable). The applicable price is the cheaper of
  "your break price × chargeable weight" and "next break price × next break minimum"
  (standard air-cargo under-pricing), never below the minimum charge.
- Rating picks the most specific active card (exact commodity beats "any"; latest
  valid-from wins). If no card exists, the quote screen says so and the shipment cannot be
  priced (agent may enter a manual freight charge, flagged as `manual_rate`).
- **Quote calculator:** pick route, commodity, enter pieces (count, dims, weight) → instant
  breakdown: gross, volumetric, chargeable weight, freight, surcharges, fees, total. Quotes
  can be saved as `draft` shipments or discarded. Charge math lives in
  `lib/cargo/rating.ts` with thorough Vitest coverage.

### 6.5 Shipment booking wizard (`/shipments/new`)

Four steps:

1. **Route & flight:** origin/destination airports; optionally pick a specific upcoming
   flight (shows remaining cargo capacity per flight); or "no flight yet" (assign later).
2. **Parties:** shipper and consignee — search existing customers or create inline.
3. **Cargo:** commodity, description, declared value, special-handling flags, and a pieces
   table (rows of count × dims × weight) with live chargeable-weight totals.
4. **Charges & confirm:** rated breakdown (or manual rate if permitted), payment terms
   (**prepaid** or **collect**), review, then **Book** → issues the AWB number and shows a
   success page with the AWB, a link to the shipment, and a "print AWB" button.

AWB numbers: `prefix-serialC` where serial is a Postgres sequence padded to 7 digits and
`C = serial mod 7` (IATA check digit). Issued atomically by a database function at booking.

### 6.6 Shipments list & detail (`/shipments`, `/shipments/[id]`)

- List: filter by status, route, flight, date range; search by AWB, shipper, consignee.
  Columns: AWB, route, shipper → consignee, pieces/kg (chargeable), flight, status badge,
  payment badge (`unpaid` / `partial` / `paid`), total.
- Detail: everything about one shipment — parties, pieces, charges breakdown, payment
  status, flight, event timeline, actions appropriate to its status (accept, manifest,
  record payment, cancel, print documents). This is the screen agents live in.

### 6.7 Warehouse acceptance (part of shipment detail)

For a `booked` shipment: an acceptance form to confirm/correct actual pieces, weights, and
dims (pre-filled from booking). On save: shipment becomes `accepted`, is **re-rated** from
verified figures, and the event log records both the old and new figures if they changed.

### 6.8 Flight capacity & manifests (`/flights`, `/flights/[id]`)

- Flights inherit cargo capacity (kg and m³) from their aircraft.
- Flight cargo page: capacity bars (kg and m³, red above 90%), list of shipments on the
  flight, and an "add shipments" picker showing compatible `accepted` shipments (same
  route; rows that would not fit are disabled with the reason).
- Manifesting is transactional: the database rejects any assignment that would exceed
  remaining capacity in kg **or** volume (row-locked against races).
- One click: **Depart flight** (all manifested → `departed`, flight → `departed`) and
  **Arrive flight** (→ `arrived`), each with a confirmation dialog.

### 6.9 Tracking

- **Internal:** vertical timeline on the shipment detail (event, time, staff, note) with
  icons and human wording.
- **Public (`/track`):** no login. Enter an AWB number → status stepper, route, piece
  count, and the milestone timeline (no names, no prices, no addresses). Invalid AWB →
  friendly "not found". Served by a `SECURITY DEFINER` Postgres function that exposes only
  these safe fields; the anonymous role has no direct table access.

### 6.10 Documents (PDF)

- **Air Waybill:** professional AWB layout — parties, routing, pieces, weights, charges,
  terms — printable from the shipment detail. Includes the AWB number as a Code-128
  barcode (implemented with a small in-repo barcode-drawing helper, no heavy new deps).
- **Piece labels:** one A6 label per piece (AWB barcode, piece X of Y, route codes in very
  large type, weight, handling badges), printed as one multi-page PDF.
- **Cargo manifest:** per-flight PDF listing all manifested shipments with totals, for the
  crew/handling agent. Printable from the flight cargo page.

### 6.11 Payments & invoicing

- Record payments (cash / card / transfer) against a shipment, with server-computed
  balance; overpayment blocked. Payment badge everywhere; prepaid shipments cannot be
  manifested until balance = 0.
- **Invoice:** generated per shipment on demand, printable PDF with a sequential invoice
  number, itemized charges, payments received, and balance. Once an invoice exists, the
  shipment's charges are frozen (admin can void + reissue with a reason).

### 6.12 Dashboard & reports

- Dashboard (home page): today's shipments booked, kg awaiting acceptance, shipments
  flying today, unpaid balance total, and a "needs attention" list (accepted but
  unmanifested shipments whose chosen flight departs within 24 h; booked shipments not
  accepted within 48 h).
- Reports (`/reports`, admin only): date-range revenue, tonnage, shipment counts by
  status, top 10 customers, top routes; CSV export.

## 7. Data model (tables the plans will create)

| Table | Purpose / key columns |
| --- | --- |
| `profiles` | Staff: full name, role (`admin`/`agent`), active. 1:1 with `auth.users`. |
| `airports` | IATA code (unique), name, city, country, active. |
| `aircraft` | Registration, type, `cargo_capacity_kg`, `cargo_capacity_m3`, active. |
| `flights` | Flight number, origin/destination FKs, departure timestamp, aircraft FK, status. |
| `cargo_customers` | Shippers & consignees (6.3 fields). |
| `commodities` | Code, name, handling flags, active. |
| `cargo_settings` | Single row: airline name, AWB prefix, currency, divisor, surcharge %, fees. |
| `rate_cards` + `rate_breaks` | Route/commodity pricing with weight breaks. |
| `shipments` | AWB (unique), shipper/consignee FKs, route, optional flight FK, commodity, status, payment terms, declared value, weight/volume totals, charge fields, `manual_rate`, delivery fields, `created_by`, timestamps. |
| `shipment_pieces` | Per-piece count, dims (cm), weight; booked and verified values. |
| `cargo_events` | Shipment FK, event type, staff FK, note, `created_at`. |
| `cargo_payments` | Shipment FK, amount, method, staff FK, note. |
| `cargo_invoices` | Sequential number, shipment FK, frozen line items (jsonb), status (`issued`/`void`), void reason. |

All tables: RLS enabled; staff read/write via `is_active_staff()`; settings/master data
writable via `is_admin()`; the public tracking function is the only anonymous surface.
Status transitions, AWB issuance, manifesting (capacity check), payment recording, and
invoice freezing are Postgres functions so the rules hold even if the UI misbehaves.

## 8. Quality bar (applies to every plan)

- `npm run lint`, `npm test`, and `npm run build` pass after every plan.
- All money/weight math has unit tests, including rounding and weight-break edge cases.
- Zod validation on every form (client + server action); friendly field-level errors.
- Every list has: loading skeleton, designed empty state (icon + one-line explanation +
  primary action), and mobile-responsive layout.
- Dates/times via `date-fns`, formatted by shared helpers in `lib/format.ts`.
- Accessible: labels on all inputs, focus states, AA contrast in both themes.

## 9. Design system

- **Palette:** primary cargo-orange `#ea580c` (dark mode `#fb923c`), neutral slate scale
  for backgrounds/text, semantic colors — green (paid/delivered), amber (partial/awaiting),
  red (cancelled/over-capacity), sky (in transit). Define once as CSS variables in
  `app/globals.css` following the shadcn theming convention; never hard-code hex in
  components.
- **Type & spacing:** system font stack via Tailwind defaults; generous whitespace; cards
  with subtle borders (no heavy shadows); 8-pt spacing rhythm.
- **Status badges:** one shared `<StatusBadge>` component mapping every shipment/flight/
  payment status to a consistent color + label; used everywhere, including PDFs' text
  equivalents.
- **Both themes always:** every screen and every state must look intentional in light and
  dark mode.

## 10. Explicitly out of scope (v1)

Multi-currency, dangerous-goods documentation (DG is simply blocked), customs/EDI
integrations (CargoIMP/CargoXML), ULD/container planning, multi-leg routing with transfers,
customer self-service portal (beyond public tracking), and email/SMS notifications. These
are natural v2 items; nothing in the v1 schema should make them impossible.
