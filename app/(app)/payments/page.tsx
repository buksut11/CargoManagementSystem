"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
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

  return (
    <div>
      <PageHeader
        title="Payments"
        action={
          <span className="text-sm text-slate-500">
            Total received: <span className="font-bold">{fmtMoney(total)}</span>
          </span>
        }
      />
      <Card className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200">
            <tr>
              <Th>Date</Th>
              <Th>Amount</Th>
              <Th>Invoice</Th>
              <Th>From</Th>
              <Th>Method</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <Td>{fmtDate(p.paid_date)}</Td>
                <Td className="font-medium">{fmtMoney(Number(p.amount))}</Td>
                <Td>
                  <Link
                    href={`/invoices/${p.invoice_id}`}
                    className="text-orange-700 hover:underline"
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
