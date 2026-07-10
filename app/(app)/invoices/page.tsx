"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Invoice, Payment, Shipment } from "@/lib/types";
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
  PageHeader,
  Td,
  Th,
} from "@/components/ui";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [i, s, p] = await Promise.all([
        supabase
          .from("invoices")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("shipments").select("id, total, invoice_id"),
        supabase.from("payments").select("id, invoice_id, amount"),
      ]);
      setInvoices((i.data as Invoice[]) ?? []);
      setShipments((s.data as Shipment[]) ?? []);
      setPayments((p.data as Payment[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // Roll up shipment totals and payments per invoice in a single pass each,
  // then look them up by id — avoids re-scanning every shipment and payment
  // for every invoice row on every render (was O(invoices × rows)).
  const totalsByInvoice = useMemo(() => {
    const totals = new Map<number, number>();
    for (const s of shipments) {
      if (s.invoice_id == null) continue;
      totals.set(s.invoice_id, (totals.get(s.invoice_id) ?? 0) + Number(s.total));
    }
    const paidByInvoice = new Map<number, number>();
    for (const p of payments) {
      paidByInvoice.set(
        p.invoice_id,
        (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount),
      );
    }
    return { totals, paidByInvoice };
  }, [shipments, payments]);

  function totals(inv: Invoice) {
    const total = totalsByInvoice.totals.get(inv.id) ?? 0;
    const paid = totalsByInvoice.paidByInvoice.get(inv.id) ?? 0;
    return { total, paid, balance: total - paid, state: paymentState(total, paid) };
  }

  function StatusBadge({ state }: { state: ReturnType<typeof paymentState> }) {
    return <Badge className={PAYMENT_CLASS[state]}>{PAYMENT_LABEL[state]}</Badge>;
  }

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
      <Card className="overflow-x-auto">
        <div className="space-y-3 p-3 md:hidden">
          {invoices.map((inv) => {
            const t = totals(inv);
            return (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="block rounded-xl border border-slate-200/60 p-3 hover:bg-white/60 dark:border-white/10 dark:hover:bg-white/[0.08]"
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
        <table className="hidden w-full md:table">
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
            {invoices.map((inv) => {
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
        {!loading && invoices.length === 0 && (
          <EmptyState message="No invoices yet — create one from your uninvoiced shipments." />
        )}
      </Card>
    </div>
  );
}
