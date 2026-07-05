"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Invoice, Payment, Shipment } from "@/lib/types";
import { fmtDate, fmtMoney, invoiceRef } from "@/lib/format";
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
        supabase.from("shipments").select("*"),
        supabase.from("payments").select("*"),
      ]);
      setInvoices((i.data as Invoice[]) ?? []);
      setShipments((s.data as Shipment[]) ?? []);
      setPayments((p.data as Payment[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function totals(inv: Invoice) {
    const total = shipments
      .filter((s) => s.invoice_id === inv.id)
      .reduce((sum, s) => sum + Number(s.total), 0);
    const paid = payments
      .filter((p) => p.invoice_id === inv.id)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return { total, paid, balance: total - paid };
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        action={
          <Link
            href="/invoices/new"
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
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
                className="block rounded-xl border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-orange-700 dark:text-orange-400">
                    {invoiceRef(inv.id)}
                  </span>
                  {t.balance <= 0 && t.total > 0 ? (
                    <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                      Paid
                    </Badge>
                  ) : t.paid > 0 ? (
                    <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
                      Partial
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
                      Unpaid
                    </Badge>
                  )}
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
          <thead className="border-b border-slate-200 dark:border-slate-700">
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
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {invoices.map((inv) => {
              const t = totals(inv);
              return (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <Td>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-medium text-orange-700 dark:text-orange-400 hover:underline"
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
                    {t.balance <= 0 && t.total > 0 ? (
                      <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                        Paid
                      </Badge>
                    ) : t.paid > 0 ? (
                      <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
                        Partial
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        Unpaid
                      </Badge>
                    )}
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
