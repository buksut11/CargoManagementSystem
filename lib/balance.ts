import { supabase } from "./supabase";

// A customer's outstanding balance is the same figure the statement calls
// "Balance due": the sum of every non-void booking's sale_total, minus every
// payment received and every customer refund/credit across those bookings.
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
      .neq("status", "void"),
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
    .neq("status", "void");

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
