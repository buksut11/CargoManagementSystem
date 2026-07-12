import type { SupabaseClient } from "@supabase/supabase-js";

// Organization data backup & restore (Settings page).
//
// Backup: reads every business table through the normal client — RLS scopes
// it to the caller's organization — and downloads one JSON file.
//
// Restore: re-inserts that JSON into the CURRENT organization. It is
// insert-only (never deletes or overwrites), and because primary keys are
// GENERATED ALWAYS the database assigns fresh ids — so all cross-references
// (shipment → invoice, booking → customer, …) are remapped old-id → new-id
// as the parents are inserted. Reference rows that already exist by name
// (destinations, expense types, flight customers/suppliers) are reused, so a
// restore doesn't duplicate them. Restoring the same backup twice WILL
// duplicate transactional rows (shipments, invoices, bookings, payments) —
// the Settings UI warns about this. Audit logs are exported for the record
// but never restored (they are trigger-written and read-only by design).

type Row = Record<string, unknown>;
type Db = SupabaseClient;

export type Backup = {
  app: "cargobook";
  version: 1;
  exported_at: string;
  tables: Record<string, Row[]>;
};

const EXPORT_TABLES = [
  "destinations",
  "expense_categories",
  "invoices",
  "shipments",
  "payments",
  "expenses",
  "audit_log",
  "flight_customers",
  "flight_suppliers",
  "flight_bookings",
  "flight_segments",
  "flight_passengers",
  "booking_payments",
  "supplier_payments",
  "booking_refunds",
  "flight_audit_log",
] as const;

export async function exportBackup(db: Db): Promise<Backup> {
  const tables: Record<string, Row[]> = {};
  for (const table of EXPORT_TABLES) {
    // Tables from migrations the project hasn't run yet just get skipped.
    const { data, error } = await db.from(table).select("*").order("id");
    if (!error && data) tables[table] = data as Row[];
  }
  return {
    app: "cargobook",
    version: 1,
    exported_at: new Date().toISOString(),
    tables,
  };
}

export function downloadBackup(backup: Backup) {
  const blob = new Blob([JSON.stringify(backup, null, 1)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cargobook-backup-${backup.exported_at.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export type RestoreSummary = {
  inserted: Record<string, number>;
  reused: Record<string, number>;
  skipped: Record<string, number>;
};

// Keys never sent on insert: ids are generated, organization_id is filled by
// the DB triggers, generated columns are computed, created_by may reference a
// user that doesn't exist in this project.
const STRIP = new Set([
  "id",
  "organization_id",
  "created_at",
  "sale_total",
  "profit",
  "created_by",
]);

function clean(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (!STRIP.has(k)) out[k] = v;
  }
  return out;
}

// Insert rows in chunks, returning the new id for each input row (in order).
async function insertMapped(
  db: Db,
  table: string,
  rows: Row[],
): Promise<number[]> {
  const ids: number[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { data, error } = await db.from(table).insert(chunk).select("id");
    if (error) throw new Error(`${table}: ${error.message}`);
    for (const r of (data as { id: number }[]) ?? []) ids.push(r.id);
  }
  return ids;
}

// Reference tables: reuse an existing row with the same name, insert the rest.
// Returns old-id → current-id, and mutates the summary counts.
async function matchOrInsert(
  db: Db,
  table: string,
  rows: Row[],
  summary: RestoreSummary,
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (rows.length === 0) return map;
  const { data: existing, error } = await db.from(table).select("id, name");
  if (error) throw new Error(`${table}: ${error.message}`);
  const byName = new Map(
    ((existing as { id: number; name: string }[]) ?? []).map((r) => [
      r.name.trim().toLowerCase(),
      r.id,
    ]),
  );
  const toInsert: Row[] = [];
  const pendingOldIds: number[] = [];
  for (const row of rows) {
    const oldId = Number(row.id);
    const key = String(row.name ?? "").trim().toLowerCase();
    const hit = byName.get(key);
    if (hit != null) {
      map.set(oldId, hit);
      summary.reused[table] = (summary.reused[table] ?? 0) + 1;
    } else {
      toInsert.push(clean(row));
      pendingOldIds.push(oldId);
    }
  }
  const newIds = await insertMapped(db, table, toInsert);
  newIds.forEach((newId, i) => map.set(pendingOldIds[i], newId));
  summary.inserted[table] = toInsert.length;
  return map;
}

// Remap a foreign-key column through an old→new id map. Rows whose parent is
// not in the map (parent missing from the backup) keep null when the column is
// nullable, or are dropped when it is required.
function remap(
  rows: Row[],
  column: string,
  map: Map<number, number>,
  requiredParent: boolean,
  table: string,
  summary: RestoreSummary,
): Row[] {
  const out: Row[] = [];
  for (const row of rows) {
    const oldRef = row[column];
    if (oldRef == null) {
      out.push(row);
      continue;
    }
    const newRef = map.get(Number(oldRef));
    if (newRef != null) {
      out.push({ ...row, [column]: newRef });
    } else if (!requiredParent) {
      out.push({ ...row, [column]: null });
    } else {
      summary.skipped[table] = (summary.skipped[table] ?? 0) + 1;
    }
  }
  return out;
}

export async function restoreBackup(
  db: Db,
  backup: Backup,
  onProgress: (step: string) => void,
): Promise<RestoreSummary> {
  if (backup.app !== "cargobook" || !backup.tables) {
    throw new Error("This file is not a CargoBook backup.");
  }
  const t = (name: string): Row[] => backup.tables[name] ?? [];
  const summary: RestoreSummary = { inserted: {}, reused: {}, skipped: {} };

  // ── Cargo ──────────────────────────────────────────────────────────────
  onProgress("Restoring destinations & expense types…");
  const destMap = await matchOrInsert(db, "destinations", t("destinations"), summary);
  const catMap = await matchOrInsert(db, "expense_categories", t("expense_categories"), summary);
  void catMap; // categories are referenced by name in expenses, not by id

  onProgress("Restoring invoices…");
  const invoiceRows = t("invoices").map(clean);
  const invoiceIds = await insertMapped(db, "invoices", invoiceRows);
  const invoiceMap = new Map(t("invoices").map((r, i) => [Number(r.id), invoiceIds[i]]));
  summary.inserted["invoices"] = invoiceRows.length;

  onProgress("Restoring shipments…");
  let shipmentSrc = remap(t("shipments"), "destination_id", destMap, false, "shipments", summary);
  shipmentSrc = remap(shipmentSrc, "invoice_id", invoiceMap, false, "shipments", summary);
  const shipmentIds = await insertMapped(db, "shipments", shipmentSrc.map(clean));
  const shipmentMap = new Map(shipmentSrc.map((r, i) => [Number(r.id), shipmentIds[i]]));
  summary.inserted["shipments"] = shipmentSrc.length;

  onProgress("Restoring payments & expenses…");
  const payRows = remap(t("payments"), "invoice_id", invoiceMap, true, "payments", summary);
  await insertMapped(db, "payments", payRows.map(clean));
  summary.inserted["payments"] = payRows.length;
  const expRows = remap(t("expenses"), "shipment_id", shipmentMap, true, "expenses", summary);
  await insertMapped(db, "expenses", expRows.map(clean));
  summary.inserted["expenses"] = expRows.length;

  // ── Flights ────────────────────────────────────────────────────────────
  onProgress("Restoring flight customers & airlines…");
  const custMap = await matchOrInsert(db, "flight_customers", t("flight_customers"), summary);
  const suppMap = await matchOrInsert(db, "flight_suppliers", t("flight_suppliers"), summary);

  onProgress("Restoring bookings…");
  let bookingSrc = remap(t("flight_bookings"), "customer_id", custMap, false, "flight_bookings", summary);
  bookingSrc = remap(bookingSrc, "supplier_id", suppMap, false, "flight_bookings", summary);
  // booking_ref is unique per org — null out refs that already exist here.
  const { data: existingRefs } = await db
    .from("flight_bookings")
    .select("booking_ref")
    .not("booking_ref", "is", null);
  const taken = new Set(
    ((existingRefs as { booking_ref: string }[]) ?? []).map((r) => r.booking_ref),
  );
  bookingSrc = bookingSrc.map((r) =>
    r.booking_ref != null && taken.has(String(r.booking_ref))
      ? { ...r, booking_ref: null }
      : r,
  );
  const bookingIds = await insertMapped(db, "flight_bookings", bookingSrc.map(clean));
  const bookingMap = new Map(bookingSrc.map((r, i) => [Number(r.id), bookingIds[i]]));
  summary.inserted["flight_bookings"] = bookingSrc.length;

  onProgress("Restoring itineraries, passengers & flight ledger…");
  for (const [table, requiredParent] of [
    ["flight_segments", true],
    ["flight_passengers", true],
    ["booking_payments", true],
    ["booking_refunds", true],
    ["supplier_payments", false],
  ] as const) {
    let rows = remap(t(table), "booking_id", bookingMap, requiredParent, table, summary);
    if (table === "supplier_payments") {
      rows = remap(rows, "supplier_id", suppMap, false, table, summary);
      // A supplier payment with neither booking nor supplier has lost its
      // context — the org triggers can still place it, so keep it.
    }
    await insertMapped(db, table, rows.map(clean));
    summary.inserted[table] = rows.length;
  }

  onProgress("Done.");
  return summary;
}
