"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { downloadCsv } from "@/lib/csv";
import type { Shipment, ShipmentStatus } from "@/lib/types";
import {
  fmtDate,
  fmtKg,
  fmtMoney,
  invoiceRef,
  shipmentRef,
  STATUS_CLASS,
  STATUS_LABEL,
} from "@/lib/format";
import {
  Badge,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Td,
  Th,
} from "@/components/ui";

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ShipmentStatus>("");

  useEffect(() => {
    supabase
      .from("shipments")
      .select("*, destinations(id, name, country)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setShipments((data as Shipment[]) ?? []);
        setLoading(false);
      });
  }, []);

  function exportCsv() {
    downloadCsv("shipments.csv", [
      [
        "Ref",
        "Description",
        "Destination",
        "Weight (kg)",
        "Rate per kg",
        "Total",
        "Status",
        "Invoice",
        "Ship date",
      ],
      ...filtered.map((s) => [
        shipmentRef(s.id),
        s.description,
        s.destinations?.name ?? "",
        Number(s.weight_kg),
        s.rate_per_kg != null ? Number(s.rate_per_kg) : "",
        Number(s.total),
        STATUS_LABEL[s.status],
        s.invoice_id ? invoiceRef(s.invoice_id) : "",
        s.ship_date ?? "",
      ]),
    ]);
  }

  const q = query.trim().toLowerCase();
  const filtered = shipments.filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (!q) return true;
    return (
      s.description.toLowerCase().includes(q) ||
      (s.destinations?.name ?? "").toLowerCase().includes(q) ||
      shipmentRef(s.id).toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Shipments"
        action={
          <Link
            href="/shipments/new"
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            + New shipment
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search description, destination…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "" | ShipmentStatus)
            }
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </Select>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40 disabled:opacity-50"
        >
          ⬇ Export CSV
        </button>
      </div>
      <Card className="overflow-x-auto">
        <div className="space-y-3 p-3 md:hidden">
          {filtered.map((s) => (
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
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                {s.destinations?.name && <span>📍 {s.destinations.name}</span>}
                <span>{fmtKg(Number(s.weight_kg))}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {fmtMoney(Number(s.total))}
                </span>
                <span>
                  {s.invoice_id ? invoiceRef(s.invoice_id) : "not invoiced"}
                </span>
                <span>{fmtDate(s.ship_date)}</span>
              </div>
            </Link>
          ))}
        </div>
        <table className="hidden w-full md:table">
          <thead className="border-b border-slate-200 dark:border-slate-700">
            <tr>
              <Th>Ref</Th>
              <Th>Description</Th>
              <Th>Destination</Th>
              <Th>Weight</Th>
              <Th>Total</Th>
              <Th>Status</Th>
              <Th>Invoice</Th>
              <Th>Date</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {filtered.map((s) => (
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
                <Td>{s.destinations?.name ?? "—"}</Td>
                <Td className="whitespace-nowrap">
                  {fmtKg(Number(s.weight_kg))}
                </Td>
                <Td className="whitespace-nowrap">
                  {fmtMoney(Number(s.total))}
                </Td>
                <Td>
                  <Badge className={STATUS_CLASS[s.status]}>
                    {STATUS_LABEL[s.status]}
                  </Badge>
                </Td>
                <Td className="whitespace-nowrap">
                  {s.invoice_id ? (
                    <Link
                      href={`/invoices/${s.invoice_id}`}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {invoiceRef(s.invoice_id)}
                    </Link>
                  ) : (
                    <span className="text-slate-400">not invoiced</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap">{fmtDate(s.ship_date)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <EmptyState
            message={
              shipments.length === 0
                ? "No shipments yet — click “New shipment” to add your first."
                : "No shipments match your search."
            }
          />
        )}
      </Card>
    </div>
  );
}
