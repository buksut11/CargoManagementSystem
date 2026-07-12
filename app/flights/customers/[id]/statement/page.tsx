"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type {
  BookingPayment,
  BookingRefund,
  FlightBooking,
  FlightCustomer,
  Organization,
} from "@/lib/types";
import { bookingRef, fmtDate, fmtMoney } from "@/lib/format";

// One line of the statement: a charge (booking) or a credit (payment/refund).
type Line = {
  date: string;
  description: string;
  debit: number;
  credit: number;
};

export default function CustomerStatementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const customerId = Number(id);

  const [customer, setCustomer] = useState<FlightCustomer | null>(null);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [org, setOrg] = useState<Pick<
    Organization,
    "name" | "logo_url" | "address" | "phone" | "email"
  > | null>(null);

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        router.replace("/login");
        return;
      }
      const { data: cust } = await supabase
        .from("flight_customers")
        .select("*")
        .eq("id", customerId)
        .single();
      const c = (cust as FlightCustomer) ?? null;
      setCustomer(c);
      if (!c) {
        setLines([]);
        return;
      }

      const { data: b } = await supabase
        .from("flight_bookings")
        .select("*")
        .eq("customer_id", customerId)
        .neq("status", "void")
        .order("booking_date");
      const bookings = (b as FlightBooking[]) ?? [];
      const ids = bookings.map((r) => r.id);

      let payments: BookingPayment[] = [];
      let refunds: BookingRefund[] = [];
      if (ids.length) {
        const [p, r] = await Promise.all([
          supabase.from("booking_payments").select("*").in("booking_id", ids),
          supabase.from("booking_refunds").select("*").in("booking_id", ids),
        ]);
        payments = (p.data as BookingPayment[]) ?? [];
        refunds = (r.data as BookingRefund[]) ?? [];
      }

      const rows: Line[] = [
        ...bookings.map((bk) => ({
          date: bk.booking_date,
          description: `${bookingRef(bk.id)}${bk.pnr ? ` · PNR ${bk.pnr}` : ""}${
            bk.airline ? ` · ${bk.airline}` : ""
          }`,
          debit: Number(bk.sale_total),
          credit: 0,
        })),
        ...payments.map((p) => ({
          date: p.paid_date,
          description: `Payment received${p.method ? ` (${p.method})` : ""} — ${bookingRef(p.booking_id)}`,
          debit: 0,
          credit: Number(p.amount),
        })),
        ...refunds.map((r) => ({
          date: r.refund_date,
          description: `${r.refund_type === "void" ? "Void" : r.refund_type === "reissue" ? "Reissue credit" : "Refund"} — ${bookingRef(r.booking_id)}`,
          debit: 0,
          credit: Number(r.customer_refund),
        })),
      ].sort((a, b2) => a.date.localeCompare(b2.date));
      setLines(rows);

      if (c.organization_id) {
        const { data: o } = await supabase
          .from("organizations")
          .select("name, logo_url, address, phone, email")
          .eq("id", c.organization_id)
          .single();
        setOrg((o as typeof org) ?? null);
      }
    }
    load();
  }, [customerId, router]);

  if (!customer || lines === null) {
    return <p className="p-8 text-sm text-slate-400">Loading statement…</p>;
  }

  const charged = lines.reduce((s, l) => s + l.debit, 0);
  const credited = lines.reduce((s, l) => s + l.credit, 0);
  const balance = charged - credited;
  // Running balance per line, precomputed so render stays pure.
  const runningBalances: number[] = [];
  lines.forEach((l, i) => {
    runningBalances.push((runningBalances[i - 1] ?? 0) + l.debit - l.credit);
  });

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-slate-900 print:p-0">
      <div className="no-print mb-6 flex gap-3">
        <button
          onClick={() => window.print()}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
        >
          🖨 Print / Save as PDF
        </button>
        <Link
          href="/flights/customers"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          ← Back to customers
        </Link>
      </div>

      <div className="border border-slate-300 p-10">
        <div className="flex flex-col items-center text-center">
          {org?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logo_url}
              alt={`${org.name} logo`}
              className="h-16 w-16 shrink-0 object-contain"
            />
          )}
          <div className="mt-2 text-2xl font-bold leading-tight">
            {org?.name ?? "✈️ CargoBook"}
          </div>
          {org?.address && (
            <div className="mt-2 whitespace-pre-line text-xs text-slate-600">
              {org.address}
            </div>
          )}
          {(org?.phone || org?.email) && (
            <div className="mt-0.5 text-xs text-slate-600">
              {[org.phone, org.email].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-lg font-bold uppercase tracking-wide text-slate-800">
          Customer statement
        </div>

        <div className="mt-6 flex justify-between text-sm">
          <div className="text-slate-600">
            <div className="font-semibold text-slate-800">Statement for</div>
            <div>{customer.name}</div>
            {customer.phone && <div>{customer.phone}</div>}
            {customer.email && <div>{customer.email}</div>}
            {customer.address && <div>{customer.address}</div>}
          </div>
          <div className="text-right text-slate-500">
            <div>Date: {fmtDate(new Date().toISOString())}</div>
            <div>Entries: {lines.length}</div>
          </div>
        </div>

        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
              <th className="py-2 pr-2">Date</th>
              <th className="py-2 pr-2">Description</th>
              <th className="py-2 pr-2 text-right">Charge</th>
              <th className="py-2 pr-2 text-right">Payment</th>
              <th className="py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-slate-200">
                <td className="py-2 pr-2 whitespace-nowrap">{fmtDate(l.date)}</td>
                <td className="py-2 pr-2">{l.description}</td>
                <td className="py-2 pr-2 text-right">
                  {l.debit ? fmtMoney(l.debit) : "—"}
                </td>
                <td className="py-2 pr-2 text-right">
                  {l.credit ? fmtMoney(l.credit) : "—"}
                </td>
                <td className="py-2 text-right font-medium">
                  {fmtMoney(runningBalances[i])}
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  No bookings for this customer yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-6 space-y-1 text-right text-sm">
          <div className="text-slate-600">Total charged: {fmtMoney(charged)}</div>
          <div className="text-slate-600">
            Total payments &amp; credits: {fmtMoney(credited)}
          </div>
          <div className="flex items-baseline justify-end gap-4 pt-1">
            <span className="text-sm text-slate-500">Balance due</span>
            <span
              className={`text-2xl font-bold ${balance > 0 ? "text-slate-900" : "text-emerald-700"}`}
            >
              {fmtMoney(Math.max(balance, 0))}
            </span>
          </div>
          {balance <= 0 && (
            <div className="text-xs text-emerald-700">
              Account fully settled{balance < 0 ? ` (credit ${fmtMoney(-balance)})` : ""}.
            </div>
          )}
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          Generated by {org?.name ?? "CargoBook"} · {fmtDate(new Date().toISOString())}
        </p>
      </div>
    </div>
  );
}
