import { supabase } from "./supabase";
import { REVERSED_IN_LIST, bookingRef } from "./format";

// A customer's outstanding balance is the same figure the statement calls
// "Balance due": the sum of every recognised (non-reversed) booking's
// sale_total, minus every payment received and every customer refund/credit
// across those bookings. Cancelled/refunded/voided bookings drop out entirely.
// A new unpaid ticket therefore stacks straight onto what the customer already
// owes. A negative result means the customer is in credit.

type BalanceBooking = {
  id: number;
  customer_id: number | null;
  sale_total: number | string;
};

// Outstanding balance for every customer, keyed by customer id. Used where we
// need all customers at once (the customers list). Runs three org-scoped
// queries and aggregates in memory, mirroring the bookings list page.
export async function fetchCustomerBalances(): Promise<Record<number, number>> {
  const [b, p, r] = await Promise.all([
    supabase
      .from("flight_bookings")
      .select("id, customer_id, sale_total, status")
      .not("status", "in", REVERSED_IN_LIST),
    supabase.from("booking_payments").select("booking_id, amount"),
    supabase.from("booking_refunds").select("booking_id, customer_refund"),
  ]);

  const bookings = (b.data as BalanceBooking[]) ?? [];
  // Map each (non-void) booking to its customer so payments/refunds, which are
  // keyed by booking, can be attributed to the right customer.
  const bookingCustomer = new Map<number, number>();
  const balances: Record<number, number> = {};
  for (const bk of bookings) {
    if (bk.customer_id == null) continue;
    bookingCustomer.set(bk.id, bk.customer_id);
    balances[bk.customer_id] =
      (balances[bk.customer_id] ?? 0) + Number(bk.sale_total);
  }
  for (const pay of (p.data as { booking_id: number; amount: number }[]) ?? []) {
    const cid = bookingCustomer.get(pay.booking_id);
    if (cid != null) balances[cid] -= Number(pay.amount);
  }
  for (const ref of (r.data as
    | { booking_id: number; customer_refund: number }[]
    | null) ?? []) {
    const cid = bookingCustomer.get(ref.booking_id);
    if (cid != null) balances[cid] -= Number(ref.customer_refund);
  }
  return balances;
}

// One booking's contribution to a customer's balance, kept per-booking so a
// drill-down can show *where* the "balance due" comes from: which tickets are
// still unpaid and by how much. `remaining = charged − paid − refunded` is the
// same arithmetic fetchCustomerBalance sums across the whole customer, just not
// collapsed. A positive `remaining` is money still owed on that ticket.
export type CustomerBookingBreakdownLine = {
  bookingId: number;
  ref: string;
  date: string;
  route: string; // "Baidoa → Mogadishu", or "" when no segments recorded
  pnr: string | null;
  airline: string | null;
  charged: number;
  paid: number;
  refunded: number;
  remaining: number;
};

// Per-booking breakdown for a single customer, newest-owed first. Mirrors the
// recognised (non-reversed) filter used everywhere else, and pulls payments,
// refunds and route in three id-scoped queries. Lazy-loaded when a customer's
// "due" badge is opened, so the customers list itself stays cheap.
export async function fetchCustomerBookingBreakdown(
  customerId: number,
): Promise<CustomerBookingBreakdownLine[]> {
  const { data: b } = await supabase
    .from("flight_bookings")
    .select("id, booking_date, pnr, airline, sale_total, status")
    .eq("customer_id", customerId)
    .not("status", "in", REVERSED_IN_LIST)
    .order("booking_date");

  const bookings =
    (b as {
      id: number;
      booking_date: string;
      pnr: string | null;
      airline: string | null;
      sale_total: number | string;
    }[]) ?? [];
  const ids = bookings.map((bk) => bk.id);
  if (ids.length === 0) return [];

  const [p, r, seg] = await Promise.all([
    supabase
      .from("booking_payments")
      .select("booking_id, amount")
      .in("booking_id", ids),
    supabase
      .from("booking_refunds")
      .select("booking_id, customer_refund")
      .in("booking_id", ids),
    supabase
      .from("flight_segments")
      .select("booking_id, segment_no, origin, destination")
      .in("booking_id", ids)
      .order("segment_no"),
  ]);

  const paidBy = new Map<number, number>();
  for (const pay of (p.data as { booking_id: number; amount: number }[]) ?? []) {
    paidBy.set(pay.booking_id, (paidBy.get(pay.booking_id) ?? 0) + Number(pay.amount));
  }
  const refundBy = new Map<number, number>();
  for (const ref of (r.data as
    | { booking_id: number; customer_refund: number }[]
    | null) ?? []) {
    refundBy.set(
      ref.booking_id,
      (refundBy.get(ref.booking_id) ?? 0) + Number(ref.customer_refund),
    );
  }

  // Chain each booking's segments into a route, collapsing repeated stops —
  // identical to the statement page so both read the same way.
  const segsBy = new Map<
    number,
    { origin: string | null; destination: string | null }[]
  >();
  for (const s of (seg.data as {
    booking_id: number;
    origin: string | null;
    destination: string | null;
  }[]) ?? []) {
    const list = segsBy.get(s.booking_id) ?? [];
    list.push(s);
    segsBy.set(s.booking_id, list);
  }
  const routeLabel = (id: number): string => {
    const stops: string[] = [];
    for (const s of segsBy.get(id) ?? []) {
      for (const stop of [s.origin, s.destination]) {
        const t = stop?.trim();
        if (t && stops[stops.length - 1] !== t) stops.push(t);
      }
    }
    return stops.join(" → ");
  };

  return bookings.map((bk) => {
    const charged = Number(bk.sale_total);
    const paid = paidBy.get(bk.id) ?? 0;
    const refunded = refundBy.get(bk.id) ?? 0;
    return {
      bookingId: bk.id,
      ref: bookingRef(bk.id),
      date: bk.booking_date,
      route: routeLabel(bk.id),
      pnr: bk.pnr,
      airline: bk.airline,
      charged,
      paid,
      refunded,
      remaining: charged - paid - refunded,
    };
  });
}

// ── Cargo ───────────────────────────────────────────────────────────────────
// A cargo customer's outstanding balance is the same figure the cargo statement
// calls "Balance due": the sum of every shipment total on their invoices, minus
// every payment recorded against those invoices. Cargo has no refunds. Invoices
// with no customer (customer_id null) drop out. A negative result means the
// customer is in credit.
export async function fetchCargoCustomerBalances(): Promise<
  Record<number, number>
> {
  const [inv, s, p] = await Promise.all([
    supabase.from("invoices").select("id, customer_id"),
    supabase.from("shipments").select("invoice_id, total"),
    supabase.from("payments").select("invoice_id, amount"),
  ]);

  // Map each invoice to its customer so shipments/payments, which are keyed by
  // invoice, can be attributed to the right customer.
  const invoiceCustomer = new Map<number, number>();
  for (const iv of (inv.data as { id: number; customer_id: number | null }[]) ??
    []) {
    if (iv.customer_id != null) invoiceCustomer.set(iv.id, iv.customer_id);
  }

  const balances: Record<number, number> = {};
  for (const sh of (s.data as { invoice_id: number | null; total: number }[]) ??
    []) {
    if (sh.invoice_id == null) continue;
    const cid = invoiceCustomer.get(sh.invoice_id);
    if (cid != null) balances[cid] = (balances[cid] ?? 0) + Number(sh.total);
  }
  for (const pay of (p.data as { invoice_id: number; amount: number }[]) ?? []) {
    const cid = invoiceCustomer.get(pay.invoice_id);
    if (cid != null) balances[cid] = (balances[cid] ?? 0) - Number(pay.amount);
  }
  return balances;
}

// Outstanding balance for a single customer. `excludeBookingId` leaves one
// booking out of the total — used by the booking form so the figure it shows is
// the "existing" balance from the customer's *other* tickets, which the ticket
// being created/edited then adds onto.
export async function fetchCustomerBalance(
  customerId: number,
  excludeBookingId?: number,
): Promise<number> {
  const { data } = await supabase
    .from("flight_bookings")
    .select("id, sale_total, status")
    .eq("customer_id", customerId)
    .not("status", "in", REVERSED_IN_LIST);

  const bookings = ((data as { id: number; sale_total: number | string }[]) ?? [])
    .filter((bk) => bk.id !== excludeBookingId);
  const ids = bookings.map((bk) => bk.id);
  const charged = bookings.reduce((sum, bk) => sum + Number(bk.sale_total), 0);
  if (ids.length === 0) return charged;

  const [p, r] = await Promise.all([
    supabase.from("booking_payments").select("amount").in("booking_id", ids),
    supabase
      .from("booking_refunds")
      .select("customer_refund")
      .in("booking_id", ids),
  ]);
  const paid = ((p.data as { amount: number }[]) ?? []).reduce(
    (sum, x) => sum + Number(x.amount),
    0,
  );
  const refunded = ((r.data as { customer_refund: number }[]) ?? []).reduce(
    (sum, x) => sum + Number(x.customer_refund),
    0,
  );
  return charged - paid - refunded;
}
