# Plan 3 — Customers (shippers & consignees)

**Read `SPEC.md` (§6.3) first.** Requires Plan 2.

## Build

### 1. Migration `supabase/migrations/0003_customers.sql`

- `cargo_customers`: id, `kind` check (`company`/`individual`), `name`, `contact_person`,
  `phone`, `email`, `address`, `city`, `country`, `tax_id`, `notes`, timestamps.
- RLS: active staff read/write.

### 2. Screens

- `/customers`: searchable list (server-side search-as-you-type across name/phone/email,
  debounced input), columns name, kind badge, phone, email, city. "New customer" button →
  dialog. Row click → detail.
- `/customers/[id]`: contact card with edit dialog, notes, and a "Shipments" section that
  for now renders the designed empty state "No shipments yet" (wired up in Plan 5).
- Build the create/edit form as a reusable component (`components/customer-form.tsx`) —
  Plan 5's booking wizard opens the same form in a dialog.
- Zod `lib/validations/customer.ts` + tests: name and phone required, email format when
  present, kind enum.

## How to verify

1. Run migration 0003.
2. Create a company and an individual customer; both appear instantly in the list.
3. Search finds them by partial name, phone fragment, and email fragment.
4. Edit a customer → changes persist; validation blocks empty name and bad email with
   friendly field-level messages.
5. Empty states: a fresh search with no hits, and the detail page's shipments section,
   both look designed (icon + explanation), not blank.
6. Lint/test/build pass.
