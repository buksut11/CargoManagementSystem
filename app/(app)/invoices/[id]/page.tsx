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
import {
  Badge,
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  Td,
  Th,
} from "@/components/ui";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = Number(id);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // payment form
  const [amount, setAmount] = useState("");
  const [paidDate, setPaidDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [method, setMethod] = useState("");
  const [busy, setBusy] = useState(false);

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    async function load() {
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
      if (!active) return;
      if (!i.data) {
        setNotFound(true);
        return;
      }
      setInvoice(i.data as Invoice);
      setShipments((s.data as Shipment[]) ?? []);
      setPayments((p.data as Payment[]) ?? []);
    }
    load();
    return () => {
      active = false;
    };
  }, [invoiceId, version]);

  const total = shipments.reduce((sum, s) => sum + Number(s.total), 0);
  const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = total - paid;

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("payments").insert({
      invoice_id: invoiceId,
      amount: parseFloat(amount),
      paid_date: paidDate,
      method: method.trim() || null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setAmount("");
    setMethod("");
    reload();
  }

  async function removePayment(p: Payment) {
    if (!confirm(`Delete payment of ${fmtMoney(Number(p.amount))}?`)) return;
    await supabase.from("payments").delete().eq("id", p.id);
    reload();
  }

  async function removeInvoice() {
    if (
      !confirm(
        `Delete ${invoiceRef(invoiceId)}? Its payments will be deleted and its shipments become uninvoiced again.`,
      )
    )
      return;
    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoiceId);
    if (error) setError(error.message);
    else router.push("/invoices");
  }

  if (notFound)
    return <p className="text-sm text-slate-500 dark:text-slate-400">Invoice not found.</p>;
  if (!invoice) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div>
      <PageHeader
        title={invoiceRef(invoice.id)}
        action={
          <div className="flex gap-2">
            <Link
              href={`/invoices/${invoice.id}/print`}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
            >
              🖨 Print
            </Link>
            <Button variant="danger" onClick={removeInvoice}>
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <div className="text-xs uppercase text-slate-500 dark:text-slate-400">Bill to</div>
                <div className="mt-0.5 font-medium">
                  {invoice.bill_to || "—"}
                </div>
                {invoice.phone && (
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    📞 {invoice.phone}
                  </div>
                )}
                {invoice.address && (
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    📍 {invoice.address}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500 dark:text-slate-400">Issued</div>
                <div className="mt-0.5 font-medium">
                  {fmtDate(invoice.issued_date)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500 dark:text-slate-400">Total</div>
                <div className="mt-0.5 font-medium">{fmtMoney(total)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500 dark:text-slate-400">Balance</div>
                <div
                  className={`mt-0.5 font-bold ${
                    balance > 0 ? "text-orange-600 dark:text-orange-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {fmtMoney(balance)}
                </div>
              </div>
            </div>
            {invoice.notes && (
              <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600 dark:text-slate-300">
                {invoice.notes}
              </p>
            )}
          </Card>

          <Card className="overflow-x-auto">
            <div className="space-y-3 p-3 md:hidden">
              {shipments.map((s) => (
                <Link
                  key={s.id}
                  href={`/shipments/${s.id}`}
                  className="block rounded-xl border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-orange-700 dark:text-orange-400">
                      {shipmentRef(s.id)}
                    </span>
                    <span className="text-sm font-semibold">
                      {fmtMoney(Number(s.total))}
                    </span>
                  </div>
                  <div className="mt-1 text-sm">{s.description}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                    {s.destinations?.name && <span>📍 {s.destinations.name}</span>}
                    <span>{fmtKg(Number(s.weight_kg))}</span>
                  </div>
                </Link>
              ))}
            </div>
            <table className="hidden w-full md:table">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <Th>Shipment</Th>
                  <Th>Description</Th>
                  <Th>Destination</Th>
                  <Th>Weight</Th>
                  <Th>Amount</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {shipments.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <Link
                        href={`/shipments/${s.id}`}
                        className="font-medium text-orange-700 dark:text-orange-400 hover:underline"
                      >
                        {shipmentRef(s.id)}
                      </Link>
                    </Td>
                    <Td>{s.description}</Td>
                    <Td>{s.destinations?.name ?? "—"}</Td>
                    <Td>{fmtKg(Number(s.weight_kg))}</Td>
                    <Td className="font-medium">
                      {fmtMoney(Number(s.total))}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="overflow-x-auto">
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="font-semibold">Payments</h2>
              {balance <= 0 && total > 0 ? (
                <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  Paid in full
                </Badge>
              ) : (
                <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  {fmtMoney(balance)} due
                </Badge>
              )}
            </div>
            <div className="mt-2 space-y-3 p-3 md:hidden">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                >
                  <div>
                    <div className="text-sm font-semibold">
                      {fmtMoney(Number(p.amount))}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {fmtDate(p.paid_date)}
                      {p.method ? ` · ${p.method}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => removePayment(p)}
                    className="text-sm text-red-600 dark:text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {payments.length === 0 && (
                <p className="px-4 py-3 text-sm text-slate-400">
                  No payments yet.
                </p>
              )}
            </div>
            <table className="mt-2 hidden w-full md:table">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <Th>Date</Th>
                  <Th>Amount</Th>
                  <Th>Method</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <Td>{fmtDate(p.paid_date)}</Td>
                    <Td className="font-medium">
                      {fmtMoney(Number(p.amount))}
                    </Td>
                    <Td>{p.method ?? "—"}</Td>
                    <Td className="text-right">
                      <button
                        onClick={() => removePayment(p)}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </Td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <Td className="text-slate-400">No payments yet.</Td>
                    <Td />
                    <Td />
                    <Td />
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        <div>
          <Card className="p-6">
            <h2 className="mb-4 font-semibold">Record a payment</h2>
            <form onSubmit={addPayment} className="space-y-4">
              <Field label="Amount">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  required
                />
              </Field>
              <Field label="Method (optional)">
                <Input
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder="cash, bank transfer…"
                />
              </Field>
              <ErrorNote message={error} />
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Saving…" : "Add payment"}
              </Button>
              {balance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(balance.toFixed(2))}
                  className="w-full text-center text-xs text-orange-700 dark:text-orange-400 hover:underline"
                >
                  Fill remaining balance ({fmtMoney(balance)})
                </button>
              )}
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
