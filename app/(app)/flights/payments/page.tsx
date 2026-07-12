"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { downloadCsv } from "@/lib/csv";
import type { BookingPayment } from "@/lib/types";
import { bookingRef, fmtDate, fmtMoney } from "@/lib/format";
import { Card, EmptyState, PageHeader, Td, Th } from "@/components/ui";

export default function FlightReceiptsPage() {
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("booking_payments")
      .select("*, flight_bookings(id, booking_ref)")
      .order("paid_date", { ascending: false })
      .then(({ data }) => {
        setPayments((data as BookingPayment[]) ?? []);
        setLoading(false);
      });
  }, []);

  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  function exportCsv() {
    downloadCsv("flight-receipts.csv", [
      ["Date", "Amount", "Booking", "Method", "Note"],
      ...payments.map((p) => [
        p.paid_date,
        Number(p.amount),
        bookingRef(p.booking_id),
        p.method ?? "",
        p.note ?? "",
      ]),
    ]);
  }

  return (
    <div>
      <PageHeader
        title="Customer receipts"
        action={
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Total received: <span className="font-bold">{fmtMoney(total)}</span>
            </span>
            <button
              onClick={exportCsv}
              disabled={payments.length === 0}
              className="rounded-full border border-white/60 bg-white/35 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur hover:bg-white/60 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.08]"
            >
              ⬇ Export CSV
            </button>
          </div>
        }
      />
      <Card className="table-scroll">
        <div className="space-y-3 p-3 lg:hidden">
          {payments.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-slate-200/60 p-3 dark:border-white/10"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{fmtMoney(Number(p.amount))}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {fmtDate(p.paid_date)}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <Link
                  href={`/flights/bookings/${p.booking_id}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {bookingRef(p.booking_id)}
                </Link>
                {p.method && <span>{p.method}</span>}
                {p.note && <span>{p.note}</span>}
              </div>
            </div>
          ))}
        </div>
        <table className="hidden w-full lg:table">
          <thead className="border-b border-slate-200/60 dark:border-white/10">
            <tr>
              <Th>Date</Th>
              <Th>Amount</Th>
              <Th>Booking</Th>
              <Th>Method</Th>
              <Th>Note</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                <Td className="whitespace-nowrap">{fmtDate(p.paid_date)}</Td>
                <Td className="font-medium">{fmtMoney(Number(p.amount))}</Td>
                <Td>
                  <Link
                    href={`/flights/bookings/${p.booking_id}`}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {bookingRef(p.booking_id)}
                  </Link>
                </Td>
                <Td>{p.method ?? "—"}</Td>
                <Td>{p.note ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && payments.length === 0 && (
          <EmptyState message="No receipts yet — record them from a booking's page." />
        )}
      </Card>
    </div>
  );
}
