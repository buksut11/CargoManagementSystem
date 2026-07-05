# Plan 11 — Dashboard, reports & final polish

**Read `SPEC.md` (§6.12, §8) first.** Requires Plan 10. This plan finishes v1.

## Build

### 1. Migration `supabase/migrations/0010_reporting.sql`

Admin-gated reporting functions/views: date-range revenue (from payments) and billed
totals (from shipments), tonnage (chargeable kg) flown, shipment counts by status, top 10
customers by revenue, top routes by tonnage, and the dashboard counters below.

### 2. Dashboard (`/`, replaces the Plan 1 placeholder)

Stat cards: shipments booked today, kg awaiting acceptance, shipments flying today, total
unpaid balance. Below: **Needs attention** list — accepted but unmanifested shipments
whose chosen flight departs within 24 h, and booked shipments older than 48 h not yet
accepted — each row links to the shipment. Empty state: "All caught up ✈️".

### 3. Reports (`/reports`, admin)

Date-range picker; sections: revenue vs billed, tonnage, shipments by status (small bars),
top customers table, top routes table. **Export CSV** via a route handler
(`/reports/export?from=…&to=…`) with one row per shipment in range: AWB, dates, route,
parties, kg, charges, paid, balance, status.

### 4. Final polish pass (whole app)

- Audit every screen against SPEC §8: loading skeletons, designed empty states, mobile
  layouts, dark mode, focus states, toasts on every action.
- Consistent `<StatusBadge>` colors everywhere (lists, details, flights, dashboard,
  track page).
- Sidebar: Shipments item shows a live count badge of shipments awaiting acceptance.
- Update `README.md`: mark the project as built (v1), document all migrations 0001–0010,
  the public `/track` page, and a short screenshots/feature list section.

## How to verify

1. Run migration 0010.
2. Dashboard shows correct counts matching your test data; every "needs attention" row
   opens the right shipment; empty state appears when nothing needs attention.
3. Reports: pick a range covering your test data — revenue, tonnage, and top customers
   look right; CSV downloads and opens in a spreadsheet with sensible columns.
4. Agents see the dashboard but not Reports (menu or direct URL).
5. Click through every screen at phone width and in dark mode — nothing broken.
6. `npm run lint`, `npm test`, `npm run build` all pass. 🎉 v1 complete.
