"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { downloadCsv } from "@/lib/csv";
import { usePagedRows } from "@/lib/use-paged-rows";
import type { Shipment, ShipmentStatus } from "@/lib/types";
import {
  fmtDate,
  fmtKg,
  fmtMoney,
  invoiceRef,
  PAYMENT_CLASS,
  PAYMENT_LABEL,
  paymentState,
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
import { useRole } from "@/components/role-context";

type InvoiceTotals = { invoiced: number; paid: number };

const SHIPMENT_COLUMNS =
  "*, destinations(id, name, country), invoices(id, bill_to, phone, address)";
const PAGE_SIZE = 100;

export default function ShipmentsPage() {
  const role = useRole();
  const isAdmin = role === "admin";
  const [invoiceTotals, setInvoiceTotals] = useState<Map<number, InvoiceTotals>>(
    () => new Map(),
  );
  const [exporting, setExporting] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ShipmentStatus>("");

  // Both admins and agents read the shipments (with destination + invoice
  // info). Agents can see the details but the database still lets them change
  // only the status and notes. The list loads newest-first a page at a time,
  // so the payload no longer grows with the whole shipment history.
  const {
    rows: shipments,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  } = usePagedRows<Shipment>(
    (from, to) =>
      supabase
        .from("shipments")
        .select(SHIPMENT_COLUMNS)
        .order("created_at", { ascending: false })
        .range(from, to)
        .then(({ data }) => ({ data: data as Shipment[] | null })),
    PAGE_SIZE,
  );

  useEffect(() => {
    // The Paid / Partial / Unpaid badge comes from the
    // invoice_payment_totals() rollup (migration 0032) — one row per invoice
    // instead of every payment row, and correct regardless of how many
    // shipment pages are loaded (agents may read, not write, payments — see
    // migration 0020).
    async function loadTotals() {
      const { data, error } = await supabase.rpc("invoice_payment_totals");
      if (!error && data) {
        setInvoiceTotals(
          new Map(
            (data as { invoice_id: number; invoiced: number; paid: number }[]).map(
              (r) => [
                r.invoice_id,
                { invoiced: Number(r.invoiced), paid: Number(r.paid) },
              ],
            ),
          ),
        );
        return;
      }
      // Fallback (function not present yet): aggregate in the browser from
      // the raw rows, exactly as before the migration.
      const [s, p] = await Promise.all([
        supabase.from("shipments").select("total, invoice_id"),
        supabase.from("payments").select("invoice_id, amount"),
      ]);
      const map = new Map<number, InvoiceTotals>();
      for (const row of (s.data as { total: number; invoice_id: number | null }[]) ??
        []) {
        if (row.invoice_id == null) continue;
        const cur = map.get(row.invoice_id) ?? { invoiced: 0, paid: 0 };
        cur.invoiced += Number(row.total);
        map.set(row.invoice_id, cur);
      }
      for (const row of (p.data as { invoice_id: number; amount: number }[]) ?? []) {
        const cur = map.get(row.invoice_id) ?? { invoiced: 0, paid: 0 };
        cur.paid += Number(row.amount);
        map.set(row.invoice_id, cur);
      }
      setInvoiceTotals(map);
    }
    loadTotals();
  }, []);

  // Each shipment shows whether its invoice is paid, partially paid, or
  // unpaid. An invoice can hold several shipments, so the status reflects the
  // whole invoice, not one line.
  const payStateByInvoice = useMemo(() => {
    const state = new Map<number, ReturnType<typeof paymentState>>();
    for (const [invoiceId, t] of invoiceTotals) {
      if (t.invoiced === 0 && t.paid === 0) continue;
      state.set(invoiceId, paymentState(t.invoiced, t.paid));
    }
    return state;
  }, [invoiceTotals]);

  function payBadge(s: Shipment) {
    if (s.invoice_id == null) return null;
    const state = payStateByInvoice.get(s.invoice_id);
    if (!state) return null;
    return (
      <Badge className={PAYMENT_CLASS[state]}>{PAYMENT_LABEL[state]}</Badge>
    );
  }

  const matchesFilters = useCallback(
    (s: Shipment) => {
      const q = query.trim().toLowerCase();
      if (statusFilter && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.description.toLowerCase().includes(q) ||
        (s.destinations?.name ?? "").toLowerCase().includes(q) ||
        (s.invoices?.bill_to ?? "").toLowerCase().includes(q) ||
        shipmentRef(s.id).toLowerCase().includes(q)
      );
    },
    [query, statusFilter],
  );

  const filtered = useMemo(
    () => shipments.filter(matchesFilters),
    [shipments, matchesFilters],
  );

  async function exportCsv() {
    // The list on screen is loaded a page at a time, but a CSV export must
    // cover every matching shipment — so re-fetch the full set just for the
    // file, applying the same search/status filter as the visible list.
    setExporting(true);
    const { data } = await supabase
      .from("shipments")
      .select(SHIPMENT_COLUMNS)
      .order("created_at", { ascending: false });
    setExporting(false);
    const all = ((data as Shipment[]) ?? []).filter(matchesFilters);
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
      ...all.map((s) => [
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

  return (
    <div>
      <PageHeader
        title="Shipments"
        action={
          isAdmin ? (
            <Link
              href="/shipments/new"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
            >
              + New shipment
            </Link>
          ) : undefined
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
        {isAdmin && (
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0 || exporting}
            className="rounded-full border border-white/60 dark:border-white/10 bg-white/35 dark:bg-white/[0.05] backdrop-blur px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/[0.08] disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "⬇ Export CSV"}
          </button>
        )}
      </div>
      <Card className="table-scroll">
        <div className="space-y-3 p-3 lg:hidden">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/shipments/${s.id}`}
              className="block rounded-2xl border border-slate-200/60 bg-white/40 p-4 shadow-sm dark:bg-white/[0.04] hover:bg-white/60 dark:border-white/10 dark:hover:bg-white/[0.08]"
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
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                {s.destinations?.name && <span>📍 {s.destinations.name}</span>}
                <span>{fmtKg(Number(s.weight_kg))}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {fmtMoney(Number(s.total))}
                </span>
                {isAdmin && (
                  <span>
                    {s.invoice_id ? invoiceRef(s.invoice_id) : "not invoiced"}
                  </span>
                )}
                {s.invoices?.bill_to && <span>👤 {s.invoices.bill_to}</span>}
                {s.invoices?.phone && <span>📞 {s.invoices.phone}</span>}
                <span>{fmtDate(s.ship_date)}</span>
                {payBadge(s)}
              </div>
            </Link>
          ))}
        </div>
        <table className="hidden w-full lg:table">
          <thead className="border-b border-slate-200/60 dark:border-white/10">
            <tr>
              <Th>Ref</Th>
              <Th>Description</Th>
              <Th>Destination</Th>
              <Th>Weight</Th>
              <Th>Total</Th>
              <Th>Status</Th>
              <Th>Payment</Th>
              {isAdmin && <Th>Invoice</Th>}
              {!isAdmin && <Th>Bill to</Th>}
              <Th>Date</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
            {filtered.map((s) => (
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
                <Td>{payBadge(s) ?? <span className="text-slate-400">—</span>}</Td>
                {isAdmin && (
                  <Td className="whitespace-nowrap">
                    {s.invoice_id ? (
                      <Link
                        href={`/invoices/${s.invoice_id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {invoiceRef(s.invoice_id)}
                      </Link>
                    ) : (
                      <span className="text-slate-400">not invoiced</span>
                    )}
                  </Td>
                )}
                {!isAdmin && (
                  <Td>
                    {s.invoices?.bill_to || "—"}
                    {s.invoices?.phone && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        📞 {s.invoices.phone}
                      </div>
                    )}
                  </Td>
                )}
                <Td className="whitespace-nowrap">{fmtDate(s.ship_date)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <EmptyState
            message={
              shipments.length === 0
                ? isAdmin
                  ? "No shipments yet — click “New shipment” to add your first."
                  : "No shipments yet."
                : hasMore
                  ? "No match in the loaded shipments — “Load older shipments” below widens the search."
                  : "No shipments match your search."
            }
          />
        )}
      </Card>
      {hasMore && (
        <div className="mt-4 flex flex-col items-center gap-1.5">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full border border-white/60 dark:border-white/10 bg-white/35 dark:bg-white/[0.05] backdrop-blur px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/[0.08] disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load older shipments"}
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing the {shipments.length} most recent — search covers what’s loaded.
          </span>
        </div>
      )}
    </div>
  );
}
