# Plan 10 — Payments & invoicing

**Read `SPEC.md` (§6.11) first.** Requires Plan 9.

## Build

### 1. Migration `supabase/migrations/0009_payments.sql`

- `cargo_payments`: shipment FK, `amount` numeric > 0, `method` check
  (`cash`/`card`/`transfer`), `staff_id`, `note`, `created_at`.
- `record_cargo_payment(shipment_id, amount, method, note)` function: rejects overpayment
  (sum of payments may never exceed shipment total) and payments on `draft`/`cancelled`
  shipments; writes a `payment` event.
- Payment status is **derived** (view or function): `unpaid` / `partial` / `paid`.
- Enforce SPEC §5: `manifest_shipment` now also requires prepaid shipments to be fully
  paid (collect shipments may fly unpaid).
- `cargo_invoices`: `invoice_no` from a sequence formatted `INV-000123`, shipment FK,
  `line_items` jsonb (frozen itemized charges), `total`, `status` (`issued`/`void`),
  `void_reason`, `issued_by`, timestamps. `issue_invoice(shipment_id)` freezes the current
  charges; while an `issued` invoice exists, charge-changing operations (re-rating on
  acceptance, manual rate edits) are rejected with a clear error. `void_invoice(id,
  reason)` is admin-only and re-allows changes.

### 2. UI

- Shipment detail: payments card — running list of payments, balance, **Record payment**
  dialog (amount pre-filled with the balance, method, optional note). Payment badge
  (`unpaid`/`partial`/`paid`) on the detail header and in the shipments list.
- Manifesting an unpaid **prepaid** shipment is blocked in the UI with the reason shown
  ("Prepaid — 250.00 outstanding") and rejected by the database.
- **Invoice**: "Issue invoice" button (shipment `booked`+) → creates the invoice; then
  "Print invoice" → PDF (`/shipments/[id]/invoice/route.tsx`, using the Plan 9 shared PDF
  theme): invoice number, dates, parties, itemized charges, payments received, balance
  due. Admin sees "Void invoice" with a required reason; voided invoices stay listed,
  struck through.
- Zod schemas + tests in `lib/validations/payment.ts` (amount > 0, ≤ balance).

## How to verify

1. Run migration 0009.
2. Record a partial payment → badge `partial`, balance correct; overpaying is rejected
   with a friendly message.
3. A prepaid, unpaid shipment cannot be manifested; pay it in full → it can. A collect
   shipment manifests while unpaid.
4. Issue an invoice, then try to accept-with-changed-weight → clearly rejected; admin
   voids the invoice with a reason → acceptance/re-rate works again.
5. Invoice PDF shows charges, payments, and balance matching the screen.
6. Lint/test/build pass.
