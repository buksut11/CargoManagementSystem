"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Invoice } from "@/lib/types";
import {
  fmtDate,
  fmtMoney,
  invoiceRef,
  PAYMENT_CLASS,
  PAYMENT_LABEL,
  paymentState,
} from "@/lib/format";
import {
  Badge,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Td,
  Th,
} from "@/components/ui";

type InvoiceTotals = { invoiced: number; paid: number };

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceTotals, setInvoiceTotals] = useState<Map<number, InvoiceTotals>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    // The per-invoice total/paid/balance columns come from the
    // invoice_payment_totals() rollup (migration 0032) — one row per invoice
    // instead of downloading every shipment and payment row.
    async function load() {
      const [i, t] = await Promise.all([
        supabase
          .from("invoices")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.rpc("invoice_payment_totals"),
      ]);
      setInvoices((i.data as Invoice[]) ?? []);
      if (!t.error && t.data) {
        setInvoiceTotals(
          new Map(
            (t.data as { invoice_id: number; invoiced: number; paid: number }[]).map(
              (r) => [
                r.invoice_id,
                { invoiced: Number(r.invoiced), paid: Number(r.paid) },
              ],
            ),
          ),
        );
      } else {
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
      setLoading(false);
    }
    load();
  }, []);

  function totals(inv: Invoice) {
    const t = invoiceTotals.get(inv.id);
    const total = t?.invoiced ?? 0;
    const paid = t?.paid ?? 0;
    return { total, paid, balance: total - paid, state: paymentState(total, paid) };
  }

  function StatusBadge({ state }: { state: ReturnType<typeof paymentState> }) {
    return <Badge className={PAYMENT_CLASS[state]}>{PAYMENT_LABEL[state]}</Badge>;
  }

  // Filter by invoice reference or the "bill to" name, matching the search on
  // the Shipments list.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (inv) =>
        invoiceRef(inv.id).toLowerCase().includes(q) ||
        (inv.bill_to ?? "").toLowerCase().includes(q),
    );
  }, [invoices, query]);

  return (
    <div>
      <PageHeader
        title="Invoices"
        action={
          <Link
            href="/invoices/new"
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
          >
            + New invoice
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search invoice # or bill to…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <Card className="table-scroll">
        <div className="space-y-3 p-3 lg:hidden">
          {filtered.map((inv) => {
            const t = totals(inv);
            return (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="block rounded-2xl border border-slate-200/60 bg-white/40 p-4 shadow-sm dark:bg-white/[0.04] hover:bg-white/60 dark:border-white/10 dark:hover:bg-white/[0.08]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {invoiceRef(inv.id)}
                  </span>
                  <StatusBadge state={t.state} />
                </div>
                <div className="mt-1 text-sm">{inv.bill_to || "—"}</div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>Total {fmtMoney(t.total)}</span>
                  <span>Paid {fmtMoney(t.paid)}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    Balance {fmtMoney(t.balance)}
                  </span>
                  <span>{fmtDate(inv.issued_date)}</span>
                </div>
              </Link>
            );
          })}
        </div>
        <table className="hidden w-full lg:table">
          <thead className="border-b border-slate-200/60 dark:border-white/10">
            <tr>
              <Th>Invoice</Th>
              <Th>Bill to</Th>
              <Th>Issued</Th>
              <Th>Total</Th>
              <Th>Paid</Th>
              <Th>Balance</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
            {filtered.map((inv) => {
              const t = totals(inv);
              return (
                <tr key={inv.id} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                  <Td>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {invoiceRef(inv.id)}
                    </Link>
                  </Td>
                  <Td>{inv.bill_to || "—"}</Td>
                  <Td>{fmtDate(inv.issued_date)}</Td>
                  <Td>{fmtMoney(t.total)}</Td>
                  <Td>{fmtMoney(t.paid)}</Td>
                  <Td className="font-medium">{fmtMoney(t.balance)}</Td>
                  <Td>
                    <StatusBadge state={t.state} />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <EmptyState
            message={
              invoices.length === 0
                ? "No invoices yet — create one from your uninvoiced shipments."
                : "No invoices match your search."
            }
          />
        )}
      </Card>
    </div>
  );
}
