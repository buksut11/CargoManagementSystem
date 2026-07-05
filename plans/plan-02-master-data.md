# Plan 2 — Master data: airports, aircraft, flights, commodities, cargo settings

**Read `SPEC.md` (§6.2) first.** Requires Plan 1. This plan creates everything shipments
will reference.

## Build

### 1. Migration `supabase/migrations/0002_master_data.sql`

- `airports`: id, `iata` char(3) unique uppercase, `name`, `city`, `country`, `active`.
- `aircraft`: id, `registration` unique, `type` (e.g. "ATR 72-500F"),
  `cargo_capacity_kg` numeric ≥ 0, `cargo_capacity_m3` numeric ≥ 0, `active`.
- `flights`: id, `flight_no`, origin/destination airport FKs (must differ), `departs_at`
  timestamptz, aircraft FK, `status` check (`scheduled`/`departed`/`arrived`/`cancelled`),
  timestamps. Unique (flight_no, departs_at::date).
- `commodities`: id, `code` char(3) unique uppercase, `name`, `is_dangerous`,
  `requires_cold_chain`, `is_valuable`, `active`. Seed: GEN General cargo, DOC Documents,
  PER Perishables, ELE Electronics, PHA Pharmaceuticals, TEX Textiles, SPX Spare parts,
  VAL Valuables (is_valuable), COL Cold chain (requires_cold_chain), DGR Dangerous goods
  (is_dangerous).
- `cargo_settings`: single-row table (constant-id check): `airline_name` text default
  'CargoBook Air', `awb_prefix` char(3) default '999', `currency` char(3) default 'USD',
  `volumetric_divisor` int default 6000, `fuel_surcharge_pct` numeric default 0,
  `security_surcharge_pct` numeric default 0, `awb_fee` numeric default 0. Seed the row.
- RLS everywhere: active staff read; admin write.

### 2. Screens (all under `/settings`, admin-gated like staff)

- `/settings/airports`: table + add/edit dialog (IATA exactly 3 letters, auto-uppercase),
  active toggle. Zod `lib/validations/master-data.ts` + tests.
- `/settings/aircraft`: table + dialog with capacity fields (kg, m³).
- `/settings/flights`: filterable list (route, date range, status badge) + create/edit
  dialog (flight number, route selects from active airports, departure date+time, aircraft
  select showing its capacities) + cancel-flight dialog with required reason. Origin =
  destination rejected; past departure times warned.
- `/settings/commodities`: table with handling flags as small badges + add/edit dialog +
  active toggle.
- `/settings/cargo`: form for the settings row (prefix exactly 3 digits, divisor ≥ 1000,
  percentages 0–100, fee ≥ 0).
- `/settings` index page: card grid linking to the five sections (plus Staff from Plan 1).
- Shared `<StatusBadge>` component (SPEC §9) introduced here for flight statuses.

## How to verify

1. Run migration 0002.
2. As admin, create 3+ airports, 2 aircraft with different cargo capacities, and a few
   scheduled flights between them; edit and cancel one flight (reason required).
3. Commodities page shows the 10 seeded rows with correct badges.
4. Cargo settings save and persist (set your real airline name and AWB prefix).
5. An agent account can see none of these settings pages (menu or direct URL).
6. Lint/test/build pass.
