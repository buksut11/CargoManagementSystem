# Plan 8 — Tracking: delivery, timeline polish, public tracking page

**Read `SPEC.md` (§6.9) first.** Requires Plan 7.

## Build

### 1. Migration `supabase/migrations/0008_tracking.sql`

- Add `delivered_to` text and `delivered_at` timestamptz to `shipments`.
- `deliver_shipment(shipment_id, receiver_name)` function: `arrived` → `delivered`,
  records receiver + timestamp, writes the event.
- `track_shipment(awb text)` SECURITY DEFINER function callable by the `anon` role,
  returning **only**: AWB, status, origin/destination airport codes + names, piece count,
  chargeable kg (no prices, no names, no addresses), flight date if manifested, and the
  event list as (event_type, created_at). Null result for unknown AWB. This is the sole
  anonymous surface — verify no cargo table has anon policies.

### 2. UI

- Shipment detail: **Deliver** action for `arrived` shipments (dialog asks who received
  it); delivered shipments show a green completed banner with receiver + time.
- Timeline polish: each event gets an icon and human wording ("Accepted at warehouse —
  weight verified 136.5 kg", "Loaded on flight CB123", "Departed …"), not raw codes.
- **Public page `/track`** (outside the dashboard group, no auth, linked from the login
  page footer as "Track a shipment"): centered AWB input with the `XXX-XXXXXXXX` format
  hint → result card with a status stepper (booked → accepted → on flight → departed →
  arrived → delivered; current step highlighted; cancelled shown distinctly) and the
  timeline. Friendly not-found state. Fully responsive, works in both themes. Update the
  middleware allowlist so `/track` is reachable signed-out.

## How to verify

1. Run migration 0008.
2. Deliver an `arrived` shipment entering a receiver name → banner shows it.
3. Signed out, open `/track`, enter that AWB → stepper fully complete, milestones listed,
   **no** prices/names/addresses anywhere on the page or in the network response
   (check the browser's network tab or ask the AI to confirm the function's return shape).
4. A made-up AWB → friendly "not found", no error screen.
5. `/track` works on a phone-sized window and in dark mode. Lint/test/build pass.
