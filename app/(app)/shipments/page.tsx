"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { downloadCsv } from "@/lib/csv";
import type { Payment, Shipment, ShipmentStatus } from "@/lib/types";
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

export default function ShipmentsPage() {
  const role = useRole();
  const isAdmin = role === "admin";
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [payments, setPayments] = useState<Pick<Payment, "invoice_id" | "amount">[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ShipmentStatus>("");

  useEffect(() => {
    // Both admins and agents read the shipments (with destination + invoice
    // info). Agents can see the details but the database still lets them
    // change only the status and notes. Payments come along too so the list
    // can show a Paid / Partial / Unpaid badge (agents may read, not write,
    // payments — see migration 0020).
    async function load() {
      const [s, p] = await Promise.all([
        supabase
          .from("shipments")
          .select(
            "*, destinations(id, name, country), invoices(id, bill_to, phone, address)",
          )
          .order("created_at", { ascending: false }),
        supabase.from("payments").select("invoice_id, amount"),
      ]);
      setShipments((s.data as Shipment[]) ?? []);
      setPayments(
        (p.data as Pick<Payment, "invoice_id" | "amount">[]) ?? [],
      );
      setLoading(false);
    }
    load();
  }, []);

  // Roll shipment totals and payments up per invoice so each shipment can show
  // whether its invoice is paid, partially paid, or unpaid. An invoice can hold
  // several shipments, so the status reflects the whole invoice, not one line.
  const payStateByInvoice = useMemo(() => {
    const totalByInvoice = new Map<number, number>();
    for (const s of shipments) {
      if (s.invoice_id == null) continue;
      totalByInvoice.set(
        s.invoice_id,
        (totalByInvoice.get(s.invoice_id) ?? 0) + Number(s.total),
      );
    }
    const paidByInvoice = new Map<number, number>();
    for (const p of payments) {
      paidByInvoice.set(
        p.invoice_id,
        (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount),
      );
    }
    const state = new Map<number, ReturnType<typeof paymentState>>();
    for (const [invoiceId, total] of totalByInvoice) {
      state.set(invoiceId, paymentState(total, paidByInvoice.get(invoiceId) ?? 0));
    }
    return state;
  }, [shipments, payments]);

  function payBadge(s: Shipment) {
    if (s.invoice_id == null) return null;
    const state = payStateByInvoice.get(s.invoice_id);
    if (!state) return null;
    return (
      <Badge className={PAYMENT_CLASS[state]}>{PAYMENT_LABEL[state]}</Badge>
    );
  }

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shipments.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.description.toLowerCase().includes(q) ||
        (s.destinations?.name ?? "").toLowerCase().includes(q) ||
        (s.invoices?.bill_to ?? "").toLowerCase().includes(q) ||
        shipmentRef(s.id).toLowerCase().includes(q)
      );
    });
  }, [shipments, query, statusFilter]);

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
            disabled={filtered.length === 0}
            className="rounded-full border border-white/60 dark:border-white/10 bg-white/35 dark:bg-white/[0.05] backdrop-blur px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/[0.08] disabled:opacity-50"
          >
            ⬇ Export CSV
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
                : "No shipments match your search."
            }
          />
        )}
      </Card>
    </div>
  );
}
