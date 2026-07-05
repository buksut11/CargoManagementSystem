# Plan 7 — Flight cargo capacity & manifesting

**Read `SPEC.md` (§6.8) first.** Requires Plan 6.

## Build

### 1. Migration `supabase/migrations/0007_manifesting.sql`

- View or function giving per-flight cargo load: manifested+ shipments' chargeable kg and
  m³ vs the aircraft's `cargo_capacity_kg` / `cargo_capacity_m3`.
- `manifest_shipment(shipment_id, flight_id)` SECURITY DEFINER function: shipment must be
  `accepted`, its route must match the flight, flight `scheduled` and upcoming, and adding
  it must not exceed remaining kg **or** m³ (lock the flight row to prevent double-booking
  races). Sets status `manifested`, sets `flight_id`, writes the event.
- `unmanifest_shipment(shipment_id)`: admin only, back to `accepted`, event logged.
- `depart_flight(flight_id)` / `arrive_flight(flight_id)`: set the flight's own status and
  bulk-transition all of its `manifested` → `departed` → `arrived` shipments with events.
- Block cancelling a flight that still has manifested shipments (clear error).

### 2. Screens

- `/flights` (staff view, separate from admin settings): upcoming flights with route,
  date, aircraft, and **two load bars** (kg and m³; red above 90%).
- `/flights/[id]`: capacity summary, table of shipments on this flight, **Add shipments**
  panel listing compatible `accepted` shipments (matching route; shows each one's kg/m³;
  rows that would not fit are disabled with the reason), and **Depart** / **Arrive**
  buttons with confirmation dialogs stating how many shipments will move.
- Shipment detail: add **Manifest** action (dialog to pick a compatible flight) and, for
  admins, **Remove from flight**.

## How to verify

1. Run migration 0007. Give an aircraft e.g. 2 000 kg / 20 m³ capacity.
2. Book and accept two shipments on the same route; manifest both onto one flight — load
   bars rise correctly.
3. A shipment that exceeds remaining capacity is disabled with a reason, and even a forced
   attempt is rejected with a clear error toast.
4. Only `accepted` shipments appear in the Add-shipments panel (booked ones don't).
5. Depart the flight → flight and both shipments show `departed`, and it's in their
   timelines; Arrive → `arrived`.
6. As admin, remove a shipment from the flight before departure — capacity frees up.
   Cancelling a flight with cargo on it is blocked. Lint/test/build pass.
