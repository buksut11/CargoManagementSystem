"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Invoice, Payment, Shipment } from "@/lib/types";
import {
  fmtDate,
  fmtKg,
  fmtMoney,
  invoiceRef,
  shipmentRef,
} from "@/lib/format";

export default function PrintInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = Number(id);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        router.replace("/login");
        return;
      }
      const [i, s, p] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", invoiceId).single(),
        supabase
          .from("shipments")
          .select("*, destinations(id, name, country)")
          .eq("invoice_id", invoiceId)
          .order("id"),
        supabase
          .from("payments")
          .select("*")
          .eq("invoice_id", invoiceId)
          .order("paid_date"),
      ]);
      setInvoice((i.data as Invoice) ?? null);
      setShipments((s.data as Shipment[]) ?? []);
      setPayments((p.data as Payment[]) ?? []);
    }
    load();
  }, [invoiceId, router]);

  if (!invoice) {
    return (
      <p className="p-8 text-sm text-slate-400">Loading invoice…</p>
    );
  }

  const total = shipments.reduce((sum, s) => sum + Number(s.total), 0);
  const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = total - paid;
  const totalKg = shipments.reduce((sum, s) => sum + Number(s.weight_kg), 0);

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-slate-900 print:p-0">
      <div className="no-print mb-6 flex gap-3">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          🖨 Print / Save as PDF
        </button>
        <Link
          href={`/invoices/${invoice.id}`}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          ← Back to invoice
        </Link>
      </div>

      <div className="border border-slate-300 p-10">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold">📦 CargoBook</div>
            <div className="mt-1 text-sm text-slate-500">Cargo invoice</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">{invoiceRef(invoice.id)}</div>
            <div className="mt-1 text-sm text-slate-500">
              Issued {fmtDate(invoice.issued_date)}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Bill to
          </div>
          <div className="mt-1 text-lg font-medium">
            {invoice.bill_to || "—"}
          </div>
          {invoice.phone && (
            <div className="mt-0.5 text-sm text-slate-600">{invoice.phone}</div>
          )}
          {invoice.address && (
            <div className="mt-0.5 text-sm text-slate-600">
              {invoice.address}
            </div>
          )}
        </div>

        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y-2 border-slate-800 text-left">
              <th className="py-2 pr-4 font-semibold">Shipment</th>
              <th className="py-2 pr-4 font-semibold">Description</th>
              <th className="py-2 pr-4 font-semibold">Destination</th>
              <th className="py-2 pr-4 text-right font-semibold">Weight</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s.id} className="border-b border-slate-200">
                <td className="py-2.5 pr-4">{shipmentRef(s.id)}</td>
                <td className="py-2.5 pr-4">{s.description}</td>
                <td className="py-2.5 pr-4">
                  {s.destinations
                    ? `${s.destinations.name}${
                        s.destinations.country
                          ? `, ${s.destinations.country}`
                          : ""
                      }`
                    : "—"}
                </td>
                <td className="py-2.5 pr-4 text-right">
                  {fmtKg(Number(s.weight_kg))}
                </td>
                <td className="py-2.5 text-right">
                  {fmtMoney(Number(s.total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="py-1 pr-8 text-slate-500">Total weight</td>
                <td className="py-1 text-right">{fmtKg(totalKg)}</td>
              </tr>
              <tr>
                <td className="py-1 pr-8 text-slate-500">Total</td>
                <td className="py-1 text-right font-medium">
                  {fmtMoney(total)}
                </td>
              </tr>
              <tr>
                <td className="py-1 pr-8 text-slate-500">Paid</td>
                <td className="py-1 text-right">{fmtMoney(paid)}</td>
              </tr>
              <tr className="border-t-2 border-slate-800">
                <td className="py-2 pr-8 font-bold">Balance due</td>
                <td className="py-2 text-right text-lg font-bold">
                  {fmtMoney(balance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {invoice.notes && (
          <p className="mt-8 border-t border-slate-200 pt-4 text-sm text-slate-600">
            {invoice.notes}
          </p>
        )}

        <p className="mt-10 text-center text-xs text-slate-400">
          Generated by CargoBook · {fmtDate(new Date().toISOString())}
        </p>
      </div>
    </div>
  );
}
