import type {
  FlightBookingStatus,
  ShipmentStatus,
  TransportMode,
  TripType,
} from "./types";

// Change this if you bill in a different currency.
export const CURRENCY = "USD";

// Whole amounts show with no decimals ($200, not $200.00); cents appear only
// when the value actually carries them ($200.50 stays $200.50).
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
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

export function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

// Whether an invoice is fully paid, partially paid, or not paid at all — the
// same three-way rule the invoices page uses, extracted so agents can see it
// on shipments too.
export type PaymentState = "paid" | "partial" | "unpaid";

export function paymentState(total: number, paid: number): PaymentState {
  if (total > 0 && paid >= total) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

export const PAYMENT_LABEL: Record<PaymentState, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
};

export const PAYMENT_CLASS: Record<PaymentState, string> = {
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  partial: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  unpaid: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
};

// ── Flight module formatting ────────────────────────────────────────────────

export function bookingRef(id: number): string {
  return `FLT-${String(id).padStart(4, "0")}`;
}

export const FLIGHT_STATUS_LABEL: Record<FlightBookingStatus, string> = {
  quote: "Quote",
  booked: "Booked",
  ticketed: "Ticketed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  void: "Void",
};

export const FLIGHT_STATUS_CLASS: Record<FlightBookingStatus, string> = {
  quote: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  booked: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  ticketed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  cancelled: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  refunded: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
  void: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
};

export const TRIP_TYPE_LABEL: Record<TripType, string> = {
  oneway: "One-way",
  return: "Round-Trip",
};

// A booking in one of these states has been reversed — cancelled, refunded or
// voided — so its money is not the agency's: it must never count toward sales,
// profit or receivables anywhere in the app. Only quote/booked/ticketed
// bookings are recognised revenue. Keep this list in sync with the same filter
// in flight_dashboard_summary() (migration 0035).
export const REVERSED_STATUSES: readonly FlightBookingStatus[] = [
  "cancelled",
  "refunded",
  "void",
];

export function isReversed(status: string): boolean {
  return (REVERSED_STATUSES as readonly string[]).includes(status);
}

// In listings that show a booking next to its status, a refunded booking's
// sale is displayed as a negative amount (e.g. -$130) because the money was
// returned to the customer. Recognised (non-refunded) bookings show their
// sale as-is. This affects presentation only — not recognised revenue totals.
export function displaySaleTotal(status: string, saleTotal: number): number {
  return status === "refunded" ? -Math.abs(saleTotal) : saleTotal;
}

// PostgREST `in` list for filtering reversed bookings out of a query, e.g.
//   supabase.from("flight_bookings").not("status", "in", REVERSED_IN_LIST)
export const REVERSED_IN_LIST = `(${REVERSED_STATUSES.join(",")})`;

export const SUPPLIER_TYPE_LABEL: Record<string, string> = {
  airline: "Airline",
  consolidator: "Consolidator",
  bsp: "BSP",
  gds: "GDS",
  other: "Other",
};
