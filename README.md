# CargoBook — Air Cargo Management System

A complete, modern air-cargo management system for a small airline or cargo operator:
quote, book, accept, load, track, and bill air freight — with printable air waybills,
barcode labels, flight manifests, invoices, and a public shipment-tracking page.

**Status: specification & build plans.** This repository currently contains the full
product spec and eleven step-by-step build plans written so an AI coding assistant can
build the entire system, plan by plan.

## What's in this repo

| Path | What it is |
| --- | --- |
| `SPEC.md` | The full product specification — features, screens, business rules, data model, design system. The source of truth. |
| `plans/plan-01-…` → `plans/plan-11-…` | Eleven build plans, in order. Each is a self-contained task sized for a single AI coding session. |

## How to use this (you don't need to be a developer)

1. **Work through the plans in order, one at a time.** Each plan builds on the previous one.
2. **Start each AI session with this exact message:**

   > Read `SPEC.md` for full context, then implement `plans/plan-0X-….md` exactly as
   > written. Keep the code style consistent with what already exists in this repository.
   > When you are done, run `npm run lint`, `npm test`, and `npm run build`, fix anything
   > that fails, and commit.

3. **Apply the database migration.** Most plans add a SQL file under `supabase/migrations/`.
   Open your [Supabase dashboard](https://supabase.com) → SQL Editor → paste the new file's
   contents → Run. Do this before testing the plan's features. (Plan 1 walks you through
   creating the Supabase project itself — a one-time, ~10-minute setup.)
4. **Test it yourself.** Every plan ends with a "How to verify" checklist written in plain
   language — click through it in the running app (`npm run dev`).
5. **Only move to the next plan when the current one works.** If something is broken, tell
   the AI what you saw and ask it to fix it before continuing.

## Build order at a glance

1. **Plan 1 — Foundation & login:** project scaffold, Supabase auth, staff roles, app shell
2. **Plan 2 — Master data:** airports, aircraft, flight schedule, commodities, cargo settings
3. **Plan 3 — Customers:** shippers & consignees with search and history
4. **Plan 4 — Rates & quotes:** rate cards, chargeable-weight math, instant quote calculator
5. **Plan 5 — Shipments (AWB):** the booking wizard that issues air waybills
6. **Plan 6 — Warehouse acceptance:** verify real weights, re-price automatically
7. **Plan 7 — Capacity & manifests:** load flights without exceeding capacity; depart/arrive
8. **Plan 8 — Tracking & delivery:** internal timeline + public "track my shipment" page
9. **Plan 9 — Documents:** printable AWB, barcode piece labels, flight cargo manifest (PDF)
10. **Plan 10 — Payments & invoicing:** record payments, balances, printable invoices
11. **Plan 11 — Dashboard & reports:** KPIs, revenue/tonnage reports, CSV export, final polish

Rough expectation: each plan is one focused AI session. The whole system is eleven sessions.

## Technology

Next.js 15 (App Router, TypeScript) · Supabase (Postgres, Auth, Row-Level Security) ·
Tailwind CSS 4 · shadcn/ui · Zod · @react-pdf/renderer · Vitest. See `SPEC.md` §2.
