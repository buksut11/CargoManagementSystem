# Plan 5 — Shipments: AWB numbers, booking wizard, list & detail

**Read `SPEC.md` (§5, §6.5, §6.6) first.** Requires Plans 1–4. This is the biggest plan —
the core object of the whole system.

## Build

### 1. Migration `supabase/migrations/0005_shipments.sql`

- `shipments`: id, `awb` text unique nullable (null while draft), shipper/consignee FKs to
  `cargo_customers`, origin/destination airport FKs, `flight_id` nullable FK, `commodity_id`
  FK, `description`, `declared_value` numeric, `status` check
  (`draft/booked/accepted/manifested/departed/arrived/delivered/cancelled`), `payment_terms`
  check (`prepaid`/`collect`), weight/volume totals (`gross_kg`, `volumetric_kg`,
  `chargeable_kg`, `volume_m3`), charges (`freight`, `fuel_surcharge`, `security_surcharge`,
  `awb_fee`, `total`), `manual_rate` boolean, `cancel_reason`, `created_by` FK to profiles,
  timestamps.
- `shipment_pieces`: shipment FK (cascade), `pieces_count` int, dims cm, `weight_kg`
  (booked values; verified columns come in Plan 6).
- `cargo_events`: shipment FK, `event_type` text, `staff_id` FK, `note`, `created_at`.
- AWB issuance: sequence `awb_serial_seq` + function `issue_awb()` returning
  `prefix || '-' || lpad(serial,7,'0') || (serial % 7)` using `cargo_settings.awb_prefix`.
- `book_shipment(...)` SECURITY DEFINER function: validates the caller is active staff,
  inserts shipment + pieces + a `booked` event, issues the AWB, and — if a flight is
  chosen — verifies the flight is scheduled (not cancelled/past). All-or-nothing.
- `transition_shipment(shipment_id, new_status, note)` function enforcing the forward-only
  lifecycle from SPEC §5 (cancel allowed before `departed`; only admins once `manifested`)
  and writing the matching `cargo_events` row. The UI must always go through this function.

### 2. Booking wizard `/shipments/new`

Four steps as SPEC §6.5, with a step indicator and back/next that preserve state:
route & optional flight (each upcoming scheduled flight shows its remaining cargo kg) →
parties (search `cargo_customers`, inline-create using the Plan 3 form in a dialog) →
cargo (commodity — dangerous disabled, description, declared value, pieces table with live
chargeable-weight totals from `lib/cargo/rating.ts`) → charges & confirm (rated breakdown;
if no rate card, allow "Manual rate" with a manually entered freight charge, stored with
`manual_rate = true`; choose prepaid/collect) → **Book** → success page with big AWB number
and links (view shipment / new shipment). Also wire the Plan 4 quote page's **Save as
draft shipment** button: creates a `draft` (no AWB) and opens the wizard pre-filled;
drafts get an AWB only when booked.

### 3. List `/shipments` and detail `/shipments/[id]`

- List: columns AWB (or "Draft"), route, shipper → consignee, pieces / chargeable kg,
  flight, status badge (via the shared `<StatusBadge>`), total. Filters: status, date
  range; server-side search by AWB / shipper / consignee.
- Detail: header (AWB, status badge, route, flight), parties card, pieces table, charges
  breakdown card, event timeline (newest first), and an actions area: **Book** (drafts),
  **Cancel** (dialog with required reason). Later plans add more actions here — structure
  the actions area so they slot in.
- Customer detail (`/customers/[id]`): replace the placeholder with the customer's
  shipments (as shipper or consignee) + lifetime totals (shipments, kg, billed).
- Zod schemas in `lib/validations/shipment.ts` with tests (pieces ≥ 1, weights > 0, dims
  > 0, origin ≠ destination).

## How to verify

1. Run migration 0005.
2. Book a shipment end-to-end → success page shows an AWB like `999-00000011`; the last
   digit equals the serial mod 7.
3. Its detail page shows chargeable weight and totals matching the quote screen for the
   same inputs.
4. The shipments list finds it by partial AWB and by shipper name; the status filter works.
5. Cancel a booked shipment → status `cancelled`, reason visible in the timeline;
   cancelled flights never appear in wizard step 1.
6. A draft saved from the quote page has no AWB until booked; the customer detail page now
   lists their shipments. Lint/test/build pass.
