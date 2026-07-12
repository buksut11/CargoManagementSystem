"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Expense, Payment, Shipment } from "@/lib/types";
import {
  fmtDate,
  fmtKg,
  fmtMoney,
  shipmentRef,
  STATUS_CLASS,
  STATUS_LABEL,
} from "@/lib/format";
import {
  Badge,
  Card,
  EmptyState,
  IconChip,
  PageHeader,
  Td,
  Th,
} from "@/components/ui";
import { BoxIcon, ClockIcon, CoinsIcon, WalletIcon } from "@/components/icons";
import { CountUp } from "@/components/count-up";
import { TiltCard } from "@/components/tilt-card";
import {
  AreaChart,
  BarChart,
  CHART_COLORS,
  Donut,
  type ChartPoint,
} from "@/components/charts";

// Stable formatter for whole-number counts (kept module-level for CountUp).
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

// Shape the dashboard renders from — filled either by the database aggregation
// (the fast path) or computed in the browser (the fallback).
type Summary = {
  shipmentCount: number;
  totalKg: number;
  invoiced: number;
  income: number;
  received: number;
  spent: number;
  kgByMonth: Record<string, number>;
  payByMonth: Record<string, number>;
  recent: Pick<
    Shipment,
    "id" | "description" | "weight_kg" | "status" | "ship_date"
  >[];
};

// Bucket a list into { "YYYY-MM": sum } using the given month key + value.
function bucketByMonth<T>(
  rows: T[],
  monthOf: (row: T) => string,
  valueOf: (row: T) => number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const m = monthOf(row);
    out[m] = (out[m] ?? 0) + valueOf(row);
  }
  return out;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Fast path: the database returns just the totals, chart series and the 5
      // most recent shipments (migration 0023).
      const { data, error } = await supabase.rpc("dashboard_summary");
      if (!error && data) {
        const d = data as {
          shipment_count: number;
          total_kg: number;
          invoiced: number;
          income: number;
          received: number;
          spent: number;
          kg_by_month: Record<string, number>;
          pay_by_month: Record<string, number>;
          recent: Summary["recent"];
        };
        setSummary({
          shipmentCount: Number(d.shipment_count),
          totalKg: Number(d.total_kg),
          invoiced: Number(d.invoiced),
          income: Number(d.income),
          received: Number(d.received),
          spent: Number(d.spent),
          kgByMonth: d.kg_by_month ?? {},
          payByMonth: d.pay_by_month ?? {},
          recent: d.recent ?? [],
        });
        setLoading(false);
        return;
      }

      // Fallback (function not present yet): compute it client-side, exactly as
      // before, so the dashboard keeps working before the migration is run.
      const [s, p, e] = await Promise.all([
        supabase
          .from("shipments")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("payments").select("*"),
        supabase.from("expenses").select("*"),
      ]);
      const shipments = (s.data as Shipment[]) ?? [];
      const payments = (p.data as Payment[]) ?? [];
      const expenses = (e.data as Expense[]) ?? [];
      setSummary({
        shipmentCount: shipments.length,
        totalKg: shipments.reduce((sum, r) => sum + Number(r.weight_kg), 0),
        invoiced: shipments
          .filter((r) => r.invoice_id !== null)
          .reduce((sum, r) => sum + Number(r.total), 0),
        income: shipments.reduce((sum, r) => sum + Number(r.total), 0),
        received: payments.reduce((sum, r) => sum + Number(r.amount), 0),
        spent: expenses.reduce((sum, r) => sum + Number(r.amount), 0),
        kgByMonth: bucketByMonth(
          shipments,
          (r) => (r.ship_date ?? r.created_at.slice(0, 10)).slice(0, 7),
          (r) => Number(r.weight_kg),
        ),
        payByMonth: bucketByMonth(
          payments,
          (r) => r.paid_date.slice(0, 7),
          (r) => Number(r.amount),
        ),
        recent: shipments.slice(0, 5),
      });
      setLoading(false);
    }
    load();
  }, []);

  const totalKg = summary?.totalKg ?? 0;
  const invoiced = summary?.invoiced ?? 0;
  const received = summary?.received ?? 0;
  const outstanding = Math.max(0, invoiced - received);
  const income = summary?.income ?? 0;
  const spent = summary?.spent ?? 0;
  const netProfit = income - spent;
  const shipmentCount = summary?.shipmentCount ?? 0;
  const recent = summary?.recent ?? [];

  const months = lastMonths(6);

  const kgSeries: ChartPoint[] = months.map((m) => ({
    label: m.label,
    value: summary?.kgByMonth[m.key] ?? 0,
  }));
  const paySeries: ChartPoint[] = months.map((m) => ({
    label: m.label,
    value: summary?.payByMonth[m.key] ?? 0,
  }));

  const kgThisMonth = kgSeries[kgSeries.length - 1].value;
  const receivedThisMonth = paySeries[paySeries.length - 1].value;

  const stats = [
    { label: "Shipments", value: shipmentCount, format: fmtCount },
    { label: "Total weight", value: totalKg, format: fmtKg },
    { label: "Invoiced", value: invoiced, format: fmtMoney },
    {
      label: "Outstanding",
      value: outstanding,
      format: fmtMoney,
      accent: outstanding > 0,
    },
    { label: "Expenses", value: spent, format: fmtMoney, accent: spent > 0 },
    {
      label: "Net profit",
      value: netProfit,
      format: fmtMoney,
      accent: netProfit < 0,
    },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <TiltCard key={s.label} className="h-full">
            <Card className="h-full p-5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</div>
              <div
                className={`mt-1.5 break-words text-xl font-bold tracking-tight lg:text-2xl ${
                  s.accent ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"
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
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <IconChip>
                  <BoxIcon />
                </IconChip>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Kg shipped per month
                </div>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className="text-xl font-bold"
                  style={{ color: CHART_COLORS.blue }}
                >
                  ↑ {loading ? "…" : fmtKg(kgThisMonth)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">this month</span>
              </div>
            </div>
          </div>
          <div className="mt-2">
            <AreaChart
              points={kgSeries}
              color={CHART_COLORS.blue}
              format={fmtKg}
            />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2.5">
            <IconChip>
              <CoinsIcon />
            </IconChip>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Payment status
            </div>
          </div>
          {invoiced > 0 ? (
            <div className="mt-3">
              <Donut paid={received} due={outstanding} format={fmtMoney} />
            </div>
          ) : (
            <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Nothing invoiced yet — create your first invoice to see paid vs.
              due here.
            </p>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2.5">
            <IconChip>
              <WalletIcon />
            </IconChip>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Received per month
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="text-xl font-bold"
              style={{ color: CHART_COLORS.amber }}
            >
              ↑ {loading ? "…" : fmtMoney(receivedThisMonth)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">this month</span>
          </div>
          <div className="mt-2">
            <BarChart
              points={paySeries}
              color={CHART_COLORS.amber}
              format={fmtMoney}
            />
          </div>
        </Card>

        <Card className="table-scroll lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-4">
            <div className="flex items-center gap-2.5">
              <IconChip>
                <ClockIcon />
              </IconChip>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Recent shipments
              </h2>
            </div>
            <Link
              href="/shipments"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="mt-2 space-y-3 px-4 pb-4 md:hidden">
            {recent.map((s) => (
              <Link
                key={s.id}
                href={`/shipments/${s.id}`}
                className="block rounded-xl border border-slate-200/60 p-3 hover:bg-white/60 dark:border-white/10 dark:hover:bg-white/[0.08]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {shipmentRef(s.id)}
                  </span>
                  <Badge className={STATUS_CLASS[s.status]}>
                    {STATUS_LABEL[s.status]}
                  </Badge>
                </div>
                <div className="mt-1 text-sm">{s.description}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{fmtKg(Number(s.weight_kg))}</span>
                  <span>{fmtDate(s.ship_date)}</span>
                </div>
              </Link>
            ))}
          </div>
          <table className="mt-1 hidden w-full md:table">
            <thead>
              <tr>
                <Th>Ref</Th>
                <Th>Description</Th>
                <Th>Weight</Th>
                <Th>Status</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {recent.map((s) => (
                <tr key={s.id} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                  <Td className="whitespace-nowrap">
                    <Link
                      href={`/shipments/${s.id}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {shipmentRef(s.id)}
                    </Link>
                  </Td>
                  <Td>{s.description}</Td>
                  <Td className="whitespace-nowrap">
                    {fmtKg(Number(s.weight_kg))}
                  </Td>
                  <Td>
                    <Badge className={STATUS_CLASS[s.status]}>
                      {STATUS_LABEL[s.status]}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap">{fmtDate(s.ship_date)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && recent.length === 0 && (
            <EmptyState message="No shipments yet — add your first one from the Shipments page." />
          )}
        </Card>
      </div>
    </div>
  );
}
