import type { ShipmentStatus, TransportMode } from "./types";

// Change this if you bill in a different currency.
export const CURRENCY = "USD";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: CURRENCY,
});

export function fmtMoney(n: number): string {
  return money.format(n);
}

export function fmtKg(n: number): string {
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} kg`;
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "short", day: "numeric" },
  );
}

export function shipmentRef(id: number): string {
  return `SHP-${String(id).padStart(4, "0")}`;
}

export function invoiceRef(id: number): string {
  return `INV-${String(id).padStart(4, "0")}`;
}

export const STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: "Pending",
  shipped: "Shipped",
  delivered: "Delivered",
};

export const MODE_LABEL: Record<TransportMode, string> = {
  airplane: "✈️ Airplane",
  car: "🚗 Car",
  motorcycle: "🏍️ Motorcycle",
  other: "📦 Other",
};

// Categories are free text since migration 0004; old rows may still hold the
// legacy keys ('car', …), so map those to their labels.
export function modeLabel(mode: string): string {
  return (MODE_LABEL as Record<string, string>)[mode] ?? mode;
}

export const STATUS_CLASS: Record<ShipmentStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  shipped: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  delivered:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
};
