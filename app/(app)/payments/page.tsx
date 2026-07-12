"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { downloadCsv } from "@/lib/csv";
import type { Invoice, Payment } from "@/lib/types";
import { fmtDate, fmtMoney, invoiceRef } from "@/lib/format";
import { Card, EmptyState, PageHeader, Td, Th } from "@/components/ui";

type PaymentRow = Payment & { invoices?: Pick<Invoice, "id" | "bill_to"> | null };

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("payments")
      .select("*, invoices(id, bill_to)")
      .order("paid_date", { ascending: false })
      .then(({ data }) => {
        setPayments((data as PaymentRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  function exportCsv() {
    downloadCsv("payments.csv", [
      ["Date", "Amount", "Invoice", "From", "Method", "Note"],
      ...payments.map((p) => [
        p.paid_date,
        Number(p.amount),
        invoiceRef(p.invoice_id),
        p.invoices?.bill_to ?? "",
        p.method ?? "",
        p.note ?? "",
      ]),
    ]);
  }

  return (
    <div>
      <PageHeader
        title="Payments"
        action={
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Total received:{" "}
              <span className="font-bold">{fmtMoney(total)}</span>
            </span>
            <button
              onClick={exportCsv}
              disabled={payments.length === 0}
              className="rounded-full border border-white/60 dark:border-white/10 bg-white/35 dark:bg-white/[0.05] backdrop-blur px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/[0.08] disabled:opacity-50"
            >
              ⬇ Export CSV
            </button>
          </div>
        }
      />
      <Card className="table-scroll">
        <div className="space-y-3 p-3 md:hidden">
          {payments.map((p) => (
            <Link
              key={p.id}
              href={`/invoices/${p.invoice_id}`}
              className="block rounded-xl border border-slate-200/60 p-3 hover:bg-white/60 dark:border-white/10 dark:hover:bg-white/[0.08]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">
                  {fmtMoney(Number(p.amount))}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {fmtDate(p.paid_date)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="text-amber-600 dark:text-amber-400">
                  {invoiceRef(p.invoice_id)}
                </span>
                {p.invoices?.bill_to && <span>{p.invoices.bill_to}</span>}
                {p.method && <span>{p.method}</span>}
              </div>
            </Link>
          ))}
        </div>
        <table className="hidden w-full md:table">
          <thead className="border-b border-slate-200/60 dark:border-white/10">
            <tr>
              <Th>Date</Th>
              <Th>Amount</Th>
              <Th>Invoice</Th>
              <Th>From</Th>
              <Th>Method</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                <Td>{fmtDate(p.paid_date)}</Td>
                <Td className="font-medium">{fmtMoney(Number(p.amount))}</Td>
                <Td>
                  <Link
                    href={`/invoices/${p.invoice_id}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {invoiceRef(p.invoice_id)}
                  </Link>
                </Td>
                <Td>{p.invoices?.bill_to || "—"}</Td>
                <Td>{p.method ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && payments.length === 0 && (
          <EmptyState message="No payments yet — record them from an invoice page." />
        )}
      </Card>
    </div>
  );
}
