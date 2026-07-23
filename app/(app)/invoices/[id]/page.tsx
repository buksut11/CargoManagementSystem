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
  ConfirmDialog,
  ErrorNote,
  Field,
  IconChip,
  Input,
  PageHeader,
  rowDeleteClass,
  Section,
  Td,
  Th,
} from "@/components/ui";
import { DatePicker } from "@/components/date-picker";
import { CoinsIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { useRole } from "@/components/role-context";
import { useT } from "@/lib/i18n";

export default function InvoiceDetailPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = Number(id);
  // Agents may only add payments — they cannot delete the invoice or remove
  // existing payments, so those controls are hidden from them.
  const isAgent = useRole() === "agent";

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
  const [pendingPayment, setPendingPayment] = useState<Payment | null>(null);
  const [confirmInvoiceOpen, setConfirmInvoiceOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  async function confirmRemovePayment() {
    if (!pendingPayment) return;
    setDeleting(true);
    await supabase.from("payments").delete().eq("id", pendingPayment.id);
    setDeleting(false);
    setPendingPayment(null);
    reload();
  }

  async function confirmRemoveInvoice() {
    setDeleting(true);
    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoiceId);
    setDeleting(false);
    if (error) {
      setError(error.message);
      setConfirmInvoiceOpen(false);
    } else router.push("/invoices");
  }

  if (notFound)
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t("Invoice not found.")}</p>;
  if (!invoice) return <p className="text-sm text-slate-400">{t("Loading…")}</p>;

  return (
    <div>
      <PageHeader
        title={invoiceRef(invoice.id)}
        action={
          <div className="flex gap-2">
            <Link
              href={`/invoices/${invoice.id}/print`}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
            >
              {t("🖨 Print")}
            </Link>
            {!isAgent && (
              <Button variant="danger" onClick={() => setConfirmInvoiceOpen(true)}>
                {t("Delete")}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <div className="text-xs uppercase text-slate-500 dark:text-slate-400">{t("Bill to")}</div>
                <div className="mt-0.5 font-medium">
                  {invoice.bill_to || "—"}
                </div>
                {invoice.phone && (
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <PhoneIcon className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    {invoice.phone}
                  </div>
                )}
                {invoice.address && (
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <PinIcon className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    {invoice.address}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500 dark:text-slate-400">{t("Issued")}</div>
                <div className="mt-0.5 font-medium">
                  {fmtDate(invoice.issued_date)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500 dark:text-slate-400">{t("Total")}</div>
                <div className="mt-0.5 font-medium">{fmtMoney(total)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500 dark:text-slate-400">{t("Balance")}</div>
                <div
                  className={`mt-0.5 font-bold ${
                    balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
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

          <Card className="table-scroll">
            <div className="space-y-3 p-3 lg:hidden">
              {shipments.map((s) => (
                <Link
                  key={s.id}
                  href={`/shipments/${s.id}`}
                  className="block rounded-2xl border border-slate-200/60 bg-white/40 p-4 shadow-sm dark:bg-white/[0.04] hover:bg-white/60 dark:border-white/10 dark:hover:bg-white/[0.08]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-amber-600 dark:text-amber-400">
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
            <table className="hidden w-full lg:table">
              <thead className="border-b border-slate-200/60 dark:border-white/10">
                <tr>
                  <Th>{t("Shipment")}</Th>
                  <Th>{t("Description")}</Th>
                  <Th>{t("Destination")}</Th>
                  <Th>{t("Weight")}</Th>
                  <Th>{t("Amount")}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
                {shipments.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <Link
                        href={`/shipments/${s.id}`}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
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

          <Card className="table-scroll">
            <div className="flex items-center justify-between px-4 pt-4">
              <div className="flex items-center gap-2.5">
                <IconChip>
                  <CoinsIcon />
                </IconChip>
                <h2 className="font-semibold">{t("Payments")}</h2>
              </div>
              {balance <= 0 && total > 0 ? (
                <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  {t("Paid in full")}
                </Badge>
              ) : (
                <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  {t("{amount} due", { amount: fmtMoney(balance) })}
                </Badge>
              )}
            </div>
            <div className="mt-2 space-y-3 p-3 lg:hidden">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/60 bg-white/40 p-4 shadow-sm dark:bg-white/[0.04] dark:border-white/10"
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
                  {!isAgent && (
                    <button
                      onClick={() => setPendingPayment(p)}
                      className={rowDeleteClass}
                    >
                      {t("Delete")}
                    </button>
                  )}
                </div>
              ))}
              {payments.length === 0 && (
                <p className="px-4 py-3 text-sm text-slate-400">
                  {t("No payments yet.")}
                </p>
              )}
            </div>
            <table className="mt-2 hidden w-full lg:table">
              <thead className="border-b border-slate-200/60 dark:border-white/10">
                <tr>
                  <Th>{t("Date")}</Th>
                  <Th>{t("Amount")}</Th>
                  <Th>{t("Method")}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <Td>{fmtDate(p.paid_date)}</Td>
                    <Td className="font-medium">
                      {fmtMoney(Number(p.amount))}
                    </Td>
                    <Td>{p.method ?? "—"}</Td>
                    <Td className="text-right">
                      {!isAgent && (
                        <button
                          onClick={() => setPendingPayment(p)}
                          className={rowDeleteClass}
                        >
                          {t("Delete")}
                        </button>
                      )}
                    </Td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <Td className="text-slate-400">{t("No payments yet.")}</Td>
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
          <Section
            icon={<CoinsIcon />}
            title={t("Record a payment")}
            subtitle={t("Log what the customer has paid on this invoice")}
          >
            <form onSubmit={addPayment} className="space-y-4">
              <Field label={t("Amount")}>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </Field>
              <Field label={t("Date")}>
                <DatePicker value={paidDate} onChange={setPaidDate} required />
              </Field>
              <Field label={t("Method (optional)")}>
                <Input
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder={t("cash, bank transfer…")}
                />
              </Field>
              <ErrorNote message={error} />
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? t("Saving…") : t("Add payment")}
              </Button>
              {balance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(balance.toFixed(2))}
                  className="w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t("Fill remaining balance ({amount})", { amount: fmtMoney(balance) })}
                </button>
              )}
            </form>
          </Section>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingPayment}
        title={t("Delete payment?")}
        message={
          pendingPayment
            ? t("This removes the {amount} payment. This cannot be undone.", {
                amount: fmtMoney(Number(pendingPayment.amount)),
              })
            : undefined
        }
        busy={deleting}
        onConfirm={confirmRemovePayment}
        onCancel={() => setPendingPayment(null)}
      />
      <ConfirmDialog
        open={confirmInvoiceOpen}
        title={t("Delete {ref}?", { ref: invoiceRef(invoiceId) })}
        message={t("Its payments will be deleted and its shipments become uninvoiced again. This cannot be undone.")}
        busy={deleting}
        onConfirm={confirmRemoveInvoice}
        onCancel={() => setConfirmInvoiceOpen(false)}
      />
    </div>
  );
}
