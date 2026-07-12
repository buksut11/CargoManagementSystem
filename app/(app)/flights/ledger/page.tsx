"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { downloadCsv } from "@/lib/csv";
import type {
  BookingPayment,
  BookingRefund,
  SupplierPayment,
} from "@/lib/types";
import { bookingRef, fmtDate, fmtMoney } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Td, Th } from "@/components/ui";

// A unified cash ledger for the flight module: every money movement in one
// chronological list — customer receipts (in), supplier payments (out),
// customer refunds (out) and supplier recoveries (in).
type Entry = {
  key: string;
  date: string;
  kind: "receipt" | "supplier" | "refund_out" | "refund_in";
  description: string;
  bookingId: number | null;
  inAmt: number;
  outAmt: number;
};

const KIND_LABEL: Record<Entry["kind"], string> = {
  receipt: "Receipt",
  supplier: "Supplier",
  refund_out: "Refund",
  refund_in: "Recovery",
};

const KIND_CLASS: Record<Entry["kind"], string> = {
  receipt:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  supplier: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  refund_out: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
  refund_in:
    "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
};

export default function FlightLedgerPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [p, s, r] = await Promise.all([
        supabase.from("booking_payments").select("*"),
        supabase.from("supplier_payments").select("*, flight_suppliers(id, name)"),
        supabase.from("booking_refunds").select("*"),
      ]);
      const receipts = ((p.data as BookingPayment[]) ?? []).map(
        (row): Entry => ({
          key: `p-${row.id}`,
          date: row.paid_date,
          kind: "receipt",
          description: `Customer payment${row.method ? ` (${row.method})` : ""}`,
          bookingId: row.booking_id,
          inAmt: Number(row.amount),
          outAmt: 0,
        }),
      );
      const suppliers = ((s.data as SupplierPayment[]) ?? []).map(
        (row): Entry => ({
          key: `s-${row.id}`,
          date: row.paid_date,
          kind: "supplier",
          description: `Paid ${row.flight_suppliers?.name ?? "supplier"}${
            row.method ? ` (${row.method})` : ""
          }`,
          bookingId: row.booking_id,
          inAmt: 0,
          outAmt: Number(row.amount),
        }),
      );
      const refunds = ((r.data as BookingRefund[]) ?? []).flatMap(
        (row): Entry[] => {
          const out: Entry[] = [];
          if (Number(row.customer_refund) > 0) {
            out.push({
              key: `ro-${row.id}`,
              date: row.refund_date,
              kind: "refund_out",
              description: `Refund to customer (${row.refund_type})`,
              bookingId: row.booking_id,
              inAmt: 0,
              outAmt: Number(row.customer_refund),
            });
          }
          if (Number(row.supplier_refund) > 0) {
            out.push({
              key: `ri-${row.id}`,
              date: row.refund_date,
              kind: "refund_in",
              description: `Recovered from supplier (${row.refund_type})`,
              bookingId: row.booking_id,
              inAmt: Number(row.supplier_refund),
              outAmt: 0,
            });
          }
          return out;
        },
      );
      setEntries(
        [...receipts, ...suppliers, ...refunds].sort(
          (a, b) => b.date.localeCompare(a.date) || b.key.localeCompare(a.key),
        ),
      );
      setLoading(false);
    }
    load();
  }, []);

  const totalIn = entries.reduce((sum, e) => sum + e.inAmt, 0);
  const totalOut = entries.reduce((sum, e) => sum + e.outAmt, 0);

  function exportCsv() {
    downloadCsv("flight-ledger.csv", [
      ["Date", "Type", "Description", "Booking", "In", "Out"],
      ...entries.map((e) => [
        e.date,
        KIND_LABEL[e.kind],
        e.description,
        e.bookingId ? bookingRef(e.bookingId) : "",
        e.inAmt || "",
        e.outAmt || "",
      ]),
    ]);
  }

  return (
    <div>
      <PageHeader
        title="Ledger"
        action={
          <button
            onClick={exportCsv}
            disabled={entries.length === 0}
            className="rounded-full border border-white/60 bg-white/35 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur hover:bg-white/60 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            ⬇ Export CSV
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Money in
          </div>
          <div className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? "…" : fmtMoney(totalIn)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Money out
          </div>
          <div className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">
            {loading ? "…" : fmtMoney(totalOut)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Net cash
          </div>
          <div
            className={`mt-1 text-lg font-bold ${
              totalIn - totalOut < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-900 dark:text-slate-100"
            }`}
          >
            {loading ? "…" : fmtMoney(totalIn - totalOut)}
          </div>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200/60 dark:border-white/10">
            <tr>
              <Th>Date</Th>
              <Th>Type</Th>
              <Th>Description</Th>
              <Th>Booking</Th>
              <Th>In</Th>
              <Th>Out</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
            {entries.map((e) => (
              <tr key={e.key} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                <Td className="whitespace-nowrap">{fmtDate(e.date)}</Td>
                <Td>
                  <Badge className={KIND_CLASS[e.kind]}>{KIND_LABEL[e.kind]}</Badge>
                </Td>
                <Td>{e.description}</Td>
                <Td>
                  {e.bookingId ? (
                    <Link
                      href={`/flights/bookings/${e.bookingId}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {bookingRef(e.bookingId)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="whitespace-nowrap font-medium text-emerald-600 dark:text-emerald-400">
                  {e.inAmt ? fmtMoney(e.inAmt) : ""}
                </Td>
                <Td className="whitespace-nowrap font-medium text-rose-600 dark:text-rose-400">
                  {e.outAmt ? fmtMoney(e.outAmt) : ""}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && entries.length === 0 && (
          <EmptyState message="No money movements yet — receipts, supplier payments and refunds will appear here." />
        )}
      </Card>
    </div>
  );
}
