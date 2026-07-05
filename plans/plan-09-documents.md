# Plan 9 — Documents: AWB PDF, piece labels, flight manifest

**Read `SPEC.md` (§6.10) first.** Requires Plan 8. Add `@react-pdf/renderer` and serve each
document from a route handler (`route.tsx`) that renders the PDF server-side. Establish a
shared visual style (`lib/pdf/theme.ts`): airline name from `cargo_settings`, consistent
typography, header/footer — all three documents must look like one family.

## Build

### 1. Barcode helper

`lib/cargo/barcode.ts`: encode Code 128 as bar-widths for a given string, drawn as rects
inside react-pdf — **no new heavy dependencies**. Unit-test the encoding against a known
reference value.

### 2. Air Waybill PDF — `/shipments/[id]/awb/route.tsx`

A clean single-page AWB: header with airline name + AWB number (text + barcode), shipper
and consignee blocks, routing (origin → destination, flight + date if assigned), pieces
table (count, dims, gross/chargeable weight), commodity + description + declared value,
itemized charges with total and payment terms, "PREPAID"/"COLLECT" stamp, signature lines
(shipper/carrier), issue date + issuing staff name. Available once `booked` or later;
"Print AWB" button on the shipment detail and the booking success page.

### 3. Piece labels PDF — `/shipments/[id]/labels/route.tsx`

One A6 page per physical piece (expand `pieces_count`): large AWB barcode + number,
"Piece i of N", origin → destination IATA codes in very large type, weight, commodity
code, and handling badges (cold chain / valuable) when applicable. Button on shipment
detail.

### 4. Cargo manifest PDF — `/flights/[id]/manifest/route.tsx`

Per-flight manifest: flight number, route, date, aircraft; table of all `manifested`+
shipments (AWB, shipper, consignee, pieces, gross kg, chargeable kg, m³, commodity,
handling flags); totals row; capacity vs load summary; generated-at timestamp + staff
name. "Print manifest" button on the flight cargo page (enabled once at least one
shipment is manifested).

All three must render correctly with long names (truncate gracefully) and many pieces
(multi-page), and must require an authenticated staff session (documents are not public).

## How to verify

1. From a booked shipment: Print AWB → a professional one-page PDF; barcode present;
   charges match the detail page.
2. Print labels for a 3-piece shipment → 3 A6 pages, "Piece 1 of 3" … "3 of 3".
3. Manifest a couple of shipments, print the flight manifest → all rows + correct totals.
4. Scan a label's barcode with a phone barcode-scanner app → it reads the AWB number
   exactly.
5. Open a document URL in a signed-out browser window → redirected to login, not served.
6. Lint/test/build pass.
