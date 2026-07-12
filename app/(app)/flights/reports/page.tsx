"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { downloadCsv } from "@/lib/csv";
import type { FlightBooking } from "@/lib/types";
import { fmtMoney } from "@/lib/format";
import {
  Card,
  EmptyState,
  IconChip,
  PageHeader,
  Td,
  Th,
} from "@/components/ui";
import { BuildingIcon, UsersIcon } from "@/components/icons";

type Row = { key: string; bookings: number; sales: number; profit: number };

export default function FlightReportsPage() {
  const [bookings, setBookings] = useState<FlightBooking[]>([]);
  const [paid, setPaid] = useState<Record<number, number>>({});
  const [refunded, setRefunded] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [b, p, rf] = await Promise.all([
        supabase
          .from("flight_bookings")
          .select("*, flight_customers(id, name)")
          .neq("status", "void"),
        supabase.from("booking_payments").select("booking_id, amount"),
        supabase.from("booking_refunds").select("booking_id, customer_refund"),
      ]);
      const paidMap: Record<number, number> = {};
      for (const r of (p.data as { booking_id: number; amount: number }[]) ?? []) {
        paidMap[r.booking_id] = (paidMap[r.booking_id] ?? 0) + Number(r.amount);
      }
      const refundMap: Record<number, number> = {};
      for (const r of (rf.data as { booking_id: number; customer_refund: number }[]) ??
        []) {
        refundMap[r.booking_id] =
          (refundMap[r.booking_id] ?? 0) + Number(r.customer_refund);
      }
      setPaid(paidMap);
      setRefunded(refundMap);
      setBookings((b.data as FlightBooking[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // Airline-wise performance.
  const byAirline = useMemo(() => {
    const map = new Map<string, Row>();
    for (const b of bookings) {
      const key = b.airline?.trim() || "—";
      const row = map.get(key) ?? { key, bookings: 0, sales: 0, profit: 0 };
      row.bookings += 1;
      row.sales += Number(b.sale_total);
      row.profit += Number(b.profit);
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.sales - a.sales);
  }, [bookings]);

  // Customer outstanding (receivable). Net received nets out refunds, and a
  // refund is also a credit on the balance, so it lowers the outstanding.
  const byCustomer = useMemo(() => {
    const map = new Map<
      string,
      { name: string; sales: number; received: number; outstanding: number }
    >();
    for (const b of bookings) {
      const name = b.flight_customers?.name ?? "— No customer —";
      const row =
        map.get(name) ?? { name, sales: 0, received: 0, outstanding: 0 };
      const sale = Number(b.sale_total);
      const p = paid[b.id] ?? 0;
      const rf = refunded[b.id] ?? 0;
      row.sales += sale;
      row.received += p - rf;
      row.outstanding += sale - p - rf;
      map.set(name, row);
    }
    return [...map.values()]
      .filter((r) => r.outstanding > 0.005)
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [bookings, paid, refunded]);

  const totalSales = bookings.reduce((s, b) => s + Number(b.sale_total), 0);
  const totalProfit = bookings.reduce((s, b) => s + Number(b.profit), 0);

  return (
    <div>
      <PageHeader
        title="Reports"
        action={
          <button
            onClick={() =>
              downloadCsv("flight-airline-report.csv", [
                ["Airline", "Bookings", "Sales", "Profit"],
                ...byAirline.map((r) => [r.key, r.bookings, r.sales, r.profit]),
              ])
            }
            disabled={byAirline.length === 0}
            className="rounded-full border border-white/60 bg-white/35 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur hover:bg-white/60 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            ⬇ Export CSV
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Bookings" value={loading ? "…" : String(bookings.length)} />
        <Stat label="Sales" value={loading ? "…" : fmtMoney(totalSales)} />
        <Stat label="Net profit" value={loading ? "…" : fmtMoney(totalProfit)} />
        <Stat
          label="Margin"
          value={
            loading || totalSales === 0
              ? "—"
              : `${((totalProfit / totalSales) * 100).toFixed(1)}%`
          }
        />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card className="overflow-x-auto">
          <div className="flex items-center gap-2.5 px-5 pt-4">
            <IconChip>
              <BuildingIcon />
            </IconChip>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              By airline
            </div>
          </div>
          <table className="mt-2 w-full">
            <thead className="border-b border-slate-200/60 dark:border-white/10">
              <tr>
                <Th>Airline</Th>
                <Th>Bookings</Th>
                <Th>Sales</Th>
                <Th>Profit</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {byAirline.map((r) => (
                <tr key={r.key} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                  <Td className="font-medium">{r.key}</Td>
                  <Td>{r.bookings}</Td>
                  <Td>{fmtMoney(r.sales)}</Td>
                  <Td>{fmtMoney(r.profit)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && byAirline.length === 0 && (
            <EmptyState message="No bookings yet." />
          )}
        </Card>

        <Card className="overflow-x-auto">
          <div className="flex items-center gap-2.5 px-5 pt-4">
            <IconChip>
              <UsersIcon />
            </IconChip>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Customer outstanding
            </div>
          </div>
          <table className="mt-2 w-full">
            <thead className="border-b border-slate-200/60 dark:border-white/10">
              <tr>
                <Th>Customer</Th>
                <Th>Sales</Th>
                <Th>Received</Th>
                <Th>Outstanding</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {byCustomer.map((r) => (
                <tr key={r.name} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                  <Td className="font-medium">{r.name}</Td>
                  <Td>{fmtMoney(r.sales)}</Td>
                  <Td>{fmtMoney(r.received)}</Td>
                  <Td className="font-medium text-amber-600 dark:text-amber-400">
                    {fmtMoney(r.outstanding)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && byCustomer.length === 0 && (
            <EmptyState message="Nothing outstanding — every booking is fully collected." />
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </Card>
  );
}
