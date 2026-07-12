"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { FlightBooking } from "@/lib/types";
import {
  bookingRef,
  fmtDate,
  fmtMoney,
  FLIGHT_STATUS_CLASS,
  FLIGHT_STATUS_LABEL,
} from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { CountUp } from "@/components/count-up";
import { TiltCard } from "@/components/tilt-card";
import { AreaChart, CHART_COLORS, type ChartPoint } from "@/components/charts";

const fmtCount = (n: number) => Math.round(n).toLocaleString("en-US");

function lastMonths(n: number) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
    });
  }
  return months;
}

type RecentBooking = Pick<
  FlightBooking,
  "id" | "booking_ref" | "pnr" | "airline" | "status" | "travel_date" | "sale_total"
>;

type Summary = {
  bookingCount: number;
  salesTotal: number;
  costTotal: number;
  profitTotal: number;
  received: number;
  paidSuppliers: number;
  receivable: number;
  payable: number;
  salesByMonth: Record<string, number>;
  recent: RecentBooking[];
};

export default function FlightDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Fast path: database aggregation (migration 0030).
      const { data, error } = await supabase.rpc("flight_dashboard_summary");
      if (!error && data) {
        const d = data as Record<string, unknown>;
        setSummary({
          bookingCount: Number(d.booking_count ?? 0),
          salesTotal: Number(d.sales_total ?? 0),
          costTotal: Number(d.cost_total ?? 0),
          profitTotal: Number(d.profit_total ?? 0),
          received: Number(d.received ?? 0),
          paidSuppliers: Number(d.paid_suppliers ?? 0),
          receivable: Number(d.receivable ?? 0),
          payable: Number(d.payable ?? 0),
          salesByMonth: (d.sales_by_month as Record<string, number>) ?? {},
          recent: (d.recent as RecentBooking[]) ?? [],
        });
        setLoading(false);
        return;
      }

      // Fallback: compute client-side so the page works before the migration.
      const [b, p, s] = await Promise.all([
        supabase
          .from("flight_bookings")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("booking_payments").select("amount"),
        supabase.from("supplier_payments").select("amount"),
      ]);
      const bookings = ((b.data as FlightBooking[]) ?? []).filter(
        (r) => r.status !== "void",
      );
      const received = ((p.data as { amount: number }[]) ?? []).reduce(
        (sum, r) => sum + Number(r.amount),
        0,
      );
      const paidSuppliers = ((s.data as { amount: number }[]) ?? []).reduce(
        (sum, r) => sum + Number(r.amount),
        0,
      );
      const salesTotal = bookings.reduce((sum, r) => sum + Number(r.sale_total), 0);
      const costTotal = bookings.reduce((sum, r) => sum + Number(r.net_cost), 0);
      const salesByMonth: Record<string, number> = {};
      for (const r of bookings) {
        const m = r.booking_date.slice(0, 7);
        salesByMonth[m] = (salesByMonth[m] ?? 0) + Number(r.sale_total);
      }
      setSummary({
        bookingCount: bookings.length,
        salesTotal,
        costTotal,
        profitTotal: bookings.reduce((sum, r) => sum + Number(r.profit), 0),
        received,
        paidSuppliers,
        receivable: salesTotal - received,
        payable: costTotal - paidSuppliers,
        salesByMonth,
        recent: bookings.slice(0, 5),
      });
      setLoading(false);
    }
    load();
  }, []);

  const months = lastMonths(6);
  const salesSeries: ChartPoint[] = months.map((m) => ({
    label: m.label,
    value: summary?.salesByMonth[m.key] ?? 0,
  }));

  const stats = [
    { label: "Bookings", value: summary?.bookingCount ?? 0, format: fmtCount },
    { label: "Sales", value: summary?.salesTotal ?? 0, format: fmtMoney },
    { label: "Net profit", value: summary?.profitTotal ?? 0, format: fmtMoney, accent: (summary?.profitTotal ?? 0) < 0 },
    { label: "Receivable", value: Math.max(0, summary?.receivable ?? 0), format: fmtMoney, accent: (summary?.receivable ?? 0) > 0 },
    { label: "Payable", value: Math.max(0, summary?.payable ?? 0), format: fmtMoney, accent: (summary?.payable ?? 0) > 0 },
    { label: "Received", value: summary?.received ?? 0, format: fmtMoney },
  ];

  const recent = summary?.recent ?? [];

  return (
    <div>
      <PageHeader title="Flights" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <TiltCard key={s.label} className="h-full">
            <Card className="h-full p-5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {s.label}
              </div>
              <div
                className={`mt-1.5 break-words text-xl font-bold tracking-tight lg:text-2xl ${
                  s.accent
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-900 dark:text-slate-100"
                }`}
              >
                {loading ? "…" : <CountUp value={s.value} format={s.format} />}
              </div>
            </Card>
          </TiltCard>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Sales per month
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold" style={{ color: CHART_COLORS.blue }}>
              {loading ? "…" : fmtMoney(salesSeries[salesSeries.length - 1].value)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">this month</span>
          </div>
          <div className="mt-2">
            <AreaChart points={salesSeries} color={CHART_COLORS.blue} format={fmtMoney} />
          </div>
        </Card>

        <Card className="overflow-x-auto">
          <div className="flex items-center justify-between px-5 pt-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent bookings
            </h2>
            <Link
              href="/flights/bookings"
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              View all →
            </Link>
          </div>
          <div className="mt-2 space-y-3 px-4 pb-4">
            {recent.map((b) => (
              <Link
                key={b.id}
                href={`/flights/bookings/${b.id}`}
                className="block rounded-xl border border-slate-200/60 p-3 hover:bg-white/60 dark:border-white/10 dark:hover:bg-white/[0.08]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {bookingRef(b.id)}
                  </span>
                  <Badge className={FLIGHT_STATUS_CLASS[b.status]}>
                    {FLIGHT_STATUS_LABEL[b.status]}
                  </Badge>
                </div>
                <div className="mt-1 text-sm">{b.airline ?? "—"}</div>
                <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{fmtDate(b.travel_date)}</span>
                  <span>{fmtMoney(Number(b.sale_total))}</span>
                </div>
              </Link>
            ))}
            {!loading && recent.length === 0 && (
              <EmptyState message="No bookings yet — create your first from the Bookings page." />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
