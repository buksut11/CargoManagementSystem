"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Payment, Shipment } from "@/lib/types";
import {
  fmtDate,
  fmtKg,
  fmtMoney,
  shipmentRef,
  STATUS_CLASS,
  STATUS_LABEL,
} from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Td, Th } from "@/components/ui";
import {
  AreaChart,
  BarChart,
  CHART_COLORS,
  Donut,
  type ChartPoint,
} from "@/components/charts";

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

export default function DashboardPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, p] = await Promise.all([
        supabase
          .from("shipments")
          .select("*, destinations(id, name, country)")
          .order("created_at", { ascending: false }),
        supabase.from("payments").select("*"),
      ]);
      setShipments((s.data as Shipment[]) ?? []);
      setPayments((p.data as Payment[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const totalKg = shipments.reduce((sum, s) => sum + Number(s.weight_kg), 0);
  const invoiced = shipments
    .filter((s) => s.invoice_id !== null)
    .reduce((sum, s) => sum + Number(s.total), 0);
  const received = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = Math.max(0, invoiced - received);

  const months = lastMonths(6);

  const kgSeries: ChartPoint[] = months.map((m) => ({
    label: m.label,
    value: shipments
      .filter((s) =>
        (s.ship_date ?? s.created_at.slice(0, 10)).startsWith(m.key),
      )
      .reduce((sum, s) => sum + Number(s.weight_kg), 0),
  }));
  const paySeries: ChartPoint[] = months.map((m) => ({
    label: m.label,
    value: payments
      .filter((p) => p.paid_date.startsWith(m.key))
      .reduce((sum, p) => sum + Number(p.amount), 0),
  }));

  const kgThisMonth = kgSeries[kgSeries.length - 1].value;
  const receivedThisMonth = paySeries[paySeries.length - 1].value;

  const stats = [
    { label: "Shipments", value: String(shipments.length) },
    { label: "Total weight", value: fmtKg(totalKg) },
    { label: "Invoiced", value: fmtMoney(invoiced) },
    {
      label: "Outstanding",
      value: fmtMoney(outstanding),
      accent: outstanding > 0,
    },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</div>
            <div
              className={`mt-1.5 text-2xl font-bold tracking-tight whitespace-nowrap ${
                s.accent ? "text-orange-600 dark:text-orange-400" : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {loading ? "…" : s.value}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Kg shipped per month
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className="text-xl font-bold"
                  style={{ color: CHART_COLORS.indigo }}
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
              color={CHART_COLORS.indigo}
              format={fmtKg}
            />
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Payment status
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
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Received per month
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="text-xl font-bold"
              style={{ color: CHART_COLORS.orange }}
            >
              ↑ {loading ? "…" : fmtMoney(receivedThisMonth)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">this month</span>
          </div>
          <div className="mt-2">
            <BarChart
              points={paySeries}
              color={CHART_COLORS.orange}
              format={fmtMoney}
            />
          </div>
        </Card>

        <Card className="overflow-x-auto lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent shipments
            </h2>
            <Link
              href="/shipments"
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="mt-2 space-y-3 px-4 pb-4 md:hidden">
            {shipments.slice(0, 5).map((s) => (
              <Link
                key={s.id}
                href={`/shipments/${s.id}`}
                className="block rounded-xl border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {shipments.slice(0, 5).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <Td className="whitespace-nowrap">
                    <Link
                      href={`/shipments/${s.id}`}
                      className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
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
          {!loading && shipments.length === 0 && (
            <EmptyState message="No shipments yet — add your first one from the Shipments page." />
          )}
        </Card>
      </div>
    </div>
  );
}
