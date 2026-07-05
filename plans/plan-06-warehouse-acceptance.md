# Plan 6 — Warehouse acceptance & verification

**Read `SPEC.md` (§6.7) first.** Requires Plan 5.

## Build

### 1. Migration `supabase/migrations/0006_acceptance.sql`

- Add verified columns to `shipment_pieces`: `verified_pieces_count`, `verified_length_cm`,
  `verified_width_cm`, `verified_height_cm`, `verified_weight_kg` (nullable until accepted).
- `accept_shipment(shipment_id, verified_pieces jsonb)` SECURITY DEFINER function:
  shipment must be `booked`; stores the verified figures, **re-rates** the shipment
  (recompute volumetric/chargeable weight and, unless `manual_rate`, recompute all charges
  from the current rate card and settings), sets status `accepted`, and writes an
  `accepted` event whose note records old → new chargeable kg when they differ.

### 2. UI

- Shipment detail, when `booked`: an **Accept cargo** action opening a large dialog: the
  pieces table pre-filled with booked values, editable (counts, dims, weights), live
  recalculated totals beside the booked totals, and a highlighted delta ("Chargeable
  weight 120 kg → 136.5 kg — charges will be recalculated"). Confirm → toast + refreshed
  detail showing verified figures.
- Pieces table on the detail page now shows booked vs verified values side by side, with
  the verified column emphasized once present.
- Shipments list: the `booked` status filter becomes the warehouse work queue — add a
  subtle "awaiting acceptance since {time}" hint on booked rows.
- Extend `lib/cargo/rating.ts` tests to cover re-rating with changed figures.

## How to verify

1. Run migration 0006.
2. Book a shipment (20 kg), then Accept it changing the weight to 30 kg → status
   `accepted`, chargeable weight and total charges increase accordingly, and the timeline
   note shows the old → new weight.
3. Accepting without changing anything works and does not create a misleading delta note.
4. Only `booked` shipments show the Accept action (not drafts, not cancelled).
5. Lint/test/build pass.
