"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { downloadCsv } from "@/lib/csv";
import type { FlightBooking } from "@/lib/types";
import { fmtMoney, REVERSED_IN_LIST } from "@/lib/format";
import {
  Card,
  EmptyState,
  IconChip,
  PageHeader,
  Td,
  Th,
} from "@/components/ui";
import { BuildingIcon, UsersIcon } from "@/components/icons";
import { FlightBreakdownModal } from "@/components/flight-breakdown-modal";
import { useT } from "@/lib/i18n";

type Row = { key: string; bookings: number; sales: number; profit: number };

export default function FlightReportsPage() {
  const t = useT();
  const [bookings, setBookings] = useState<FlightBooking[]>([]);
  const [paid, setPaid] = useState<Record<number, number>>({});
  const [refunded, setRefunded] = useState<Record<number, number>>({});
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // Customer whose balance drill-down is open (opened from the Outstanding cell).
  const [breakdownFor, setBreakdownFor] = useState<{
    id: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const [b, p, rf, ex] = await Promise.all([
        supabase
          .from("flight_bookings")
          .select("*, flight_customers(id, name)")
          .not("status", "in", REVERSED_IN_LIST),
        supabase.from("booking_payments").select("booking_id, amount"),
        supabase.from("booking_refunds").select("booking_id, customer_refund"),
        supabase.from("flight_expenses").select("amount"),
      ]);
      setExpensesTotal(
        ((ex.data as { amount: number }[]) ?? []).reduce(
          (sum, r) => sum + Number(r.amount),
          0,
        ),
      );
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
      {
        id: number | null;
        name: string;
        sales: number;
        received: number;
        outstanding: number;
      }
    >();
    for (const b of bookings) {
      const cust = b.flight_customers ?? null;
      // Group by customer id so a drill-down can target the right customer;
      // bookings with no customer collapse into one "— No customer —" row.
      const key = cust ? `c${cust.id}` : "none";
      const row =
        map.get(key) ?? {
          id: cust?.id ?? null,
          name: cust?.name ?? "— No customer —",
          sales: 0,
          received: 0,
          outstanding: 0,
        };
      const sale = Number(b.sale_total);
      const p = paid[b.id] ?? 0;
      const rf = refunded[b.id] ?? 0;
      row.sales += sale;
      row.received += p - rf;
      row.outstanding += sale - p - rf;
      map.set(key, row);
    }
    return [...map.values()]
      .filter((r) => r.outstanding > 0.005)
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [bookings, paid, refunded]);

  const totalSales = bookings.reduce((s, b) => s + Number(b.sale_total), 0);
  const grossProfit = bookings.reduce((s, b) => s + Number(b.profit), 0);
  const netProfit = grossProfit - expensesTotal;

  return (
    <div>
      <PageHeader
        title={t("Reports")}
        action={
          <button
            onClick={() =>
              downloadCsv("flight-airline-report.csv", [
                [t("Airline"), t("Bookings"), t("Sales"), t("Profit")],
                ...byAirline.map((r) => [r.key, r.bookings, r.sales, r.profit]),
              ])
            }
            disabled={byAirline.length === 0}
            className="rounded-full border border-white/60 bg-white/35 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur hover:bg-white/60 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            {t("⬇ Export CSV")}
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t("Bookings")} value={loading ? "…" : String(bookings.length)} />
        <Stat label={t("Sales")} value={loading ? "…" : fmtMoney(totalSales)} />
        <Stat label={t("Gross profit")} value={loading ? "…" : fmtMoney(grossProfit)} />
        <Stat
          label={t("Op. expenses")}
          value={loading ? "…" : `−${fmtMoney(expensesTotal)}`}
        />
        <Stat label={t("Net profit")} value={loading ? "…" : fmtMoney(netProfit)} />
        <Stat
          label={t("Net margin")}
          value={
            loading || totalSales === 0
              ? "—"
              : `${((netProfit / totalSales) * 100).toFixed(1)}%`
          }
        />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card className="table-scroll">
          <div className="flex items-center gap-2.5 px-5 pt-4">
            <IconChip>
              <BuildingIcon />
            </IconChip>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("By airline")}
            </div>
          </div>
          <div className="space-y-3 p-3 lg:hidden">
            {byAirline.map((r) => (
              <div
                key={r.key}
                className="rounded-2xl border border-slate-200/60 bg-white/40 p-4 shadow-sm dark:bg-white/[0.04] dark:border-white/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.key}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {r.bookings} {t("bookings")}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span>
                    <span className="text-slate-500 dark:text-slate-400">{t("Sales")} </span>
                    {fmtMoney(r.sales)}
                  </span>
                  <span>
                    <span className="text-slate-500 dark:text-slate-400">{t("Profit")} </span>
                    {fmtMoney(r.profit)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <table className="mt-2 hidden w-full lg:table">
            <thead className="border-b border-slate-200/60 dark:border-white/10">
              <tr>
                <Th>{t("Airline")}</Th>
                <Th>{t("Bookings")}</Th>
                <Th>{t("Sales")}</Th>
                <Th>{t("Profit")}</Th>
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
            <EmptyState message={t("No bookings yet.")} />
          )}
        </Card>

        <Card className="table-scroll">
          <div className="flex items-center gap-2.5 px-5 pt-4">
            <IconChip>
              <UsersIcon />
            </IconChip>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("Customer outstanding")}
            </div>
          </div>
          <div className="space-y-3 p-3 lg:hidden">
            {byCustomer.map((r) => (
              <div
                key={r.id ?? r.name}
                className="rounded-2xl border border-slate-200/60 bg-white/40 p-4 shadow-sm dark:bg-white/[0.04] dark:border-white/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{t(r.name)}</span>
                  {r.id != null ? (
                    <button
                      type="button"
                      onClick={() =>
                        setBreakdownFor({ id: r.id!, name: r.name })
                      }
                      title={t("See what makes up {name}'s balance", { name: r.name })}
                      className="-mr-2 rounded-full px-2 py-0.5 font-medium text-amber-600 transition-colors hover:bg-amber-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 dark:text-amber-400 dark:hover:bg-amber-400/15"
                    >
                      {fmtMoney(r.outstanding)}
                    </button>
                  ) : (
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      {fmtMoney(r.outstanding)}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <span>{t("Sales")} {fmtMoney(r.sales)}</span>
                  <span>{t("Received")} {fmtMoney(r.received)}</span>
                </div>
              </div>
            ))}
          </div>
          <table className="mt-2 hidden w-full lg:table">
            <thead className="border-b border-slate-200/60 dark:border-white/10">
              <tr>
                <Th>{t("Customer")}</Th>
                <Th>{t("Sales")}</Th>
                <Th>{t("Received")}</Th>
                <Th>{t("Outstanding")}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {byCustomer.map((r) => (
                <tr key={r.id ?? r.name} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                  <Td className="font-medium">{t(r.name)}</Td>
                  <Td>{fmtMoney(r.sales)}</Td>
                  <Td>{fmtMoney(r.received)}</Td>
                  <Td className="font-medium">
                    {r.id != null ? (
                      <button
                        type="button"
                        onClick={() => setBreakdownFor({ id: r.id!, name: r.name })}
                        title={t("See what makes up {name}'s balance", { name: r.name })}
                        className="-mx-2 rounded-full px-2 py-0.5 text-amber-600 transition-colors hover:bg-amber-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 dark:text-amber-400 dark:hover:bg-amber-400/15"
                      >
                        {fmtMoney(r.outstanding)}
                      </button>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        {fmtMoney(r.outstanding)}
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && byCustomer.length === 0 && (
            <EmptyState message={t("Nothing outstanding — every booking is fully collected.")} />
          )}
        </Card>
      </div>

      {breakdownFor && (
        <FlightBreakdownModal
          customerId={breakdownFor.id}
          customerName={breakdownFor.name}
          onClose={() => setBreakdownFor(null)}
        />
      )}
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
