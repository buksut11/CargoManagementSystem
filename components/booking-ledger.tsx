"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  BookingPayment,
  BookingRefund,
  FlightBooking,
  FlightBookingStatus,
  RefundType,
  SupplierPayment,
} from "@/lib/types";
import { fmtDate, fmtMoney } from "@/lib/format";
import { fetchCustomerBalance } from "@/lib/balance";
import {
  Button,
  ErrorNote,
  Input,
  rowActionClass,
  rowDeleteClass,
  Section,
  Select,
} from "@/components/ui";
import { BuildingIcon, CoinsIcon, ReceiptIcon } from "@/components/icons";
import { DatePicker } from "@/components/date-picker";
import { useT } from "@/lib/i18n";
import type { ReactNode } from "react";

const today = () => new Date().toISOString().slice(0, 10);

export function BookingLedger({
  booking,
  onStatusChange,
}: {
  booking: FlightBooking;
  onStatusChange?: (status: FlightBookingStatus) => void;
}) {
  const t = useT();
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [supplierPays, setSupplierPays] = useState<SupplierPayment[]>([]);
  const [refunds, setRefunds] = useState<BookingRefund[]>([]);
  const [customerDue, setCustomerDue] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    async function fetchAll() {
      const [p, s, r] = await Promise.all([
        supabase
          .from("booking_payments")
          .select("*")
          .eq("booking_id", booking.id)
          .order("paid_date", { ascending: false }),
        supabase
          .from("supplier_payments")
          .select("*")
          .eq("booking_id", booking.id)
          .order("paid_date", { ascending: false }),
        supabase
          .from("booking_refunds")
          .select("*")
          .eq("booking_id", booking.id)
          .order("refund_date", { ascending: false }),
      ]);
      if (!active) return;
      setPayments((p.data as BookingPayment[]) ?? []);
      setSupplierPays((s.data as SupplierPayment[]) ?? []);
      setRefunds((r.data as BookingRefund[]) ?? []);
    }
    fetchAll();
    return () => {
      active = false;
    };
  }, [booking.id, version]);

  // The customer's total outstanding across all their bookings (including this
  // one) — recomputed when a payment/refund is added so it stays live.
  useEffect(() => {
    if (booking.customer_id == null) return;
    let active = true;
    fetchCustomerBalance(booking.customer_id).then((bal) => {
      if (active) setCustomerDue(bal);
    });
    return () => {
      active = false;
    };
  }, [booking.customer_id, booking.id, version]);

  const received = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const paidSupplier = supplierPays.reduce((sum, p) => sum + Number(p.amount), 0);
  const refunded = refunds.reduce((sum, r) => sum + Number(r.customer_refund), 0);
  const saleTotal = Number(booking.sale_total);
  const netCost = Number(booking.net_cost);
  // A customer refund is a credit against the balance, so it lowers what is
  // still receivable just like a payment does.
  const receivable = Math.max(0, saleTotal - received - refunded);
  const payable = Math.max(0, netCost - paidSupplier);

  // Keep the booking's status in step with its refunds: once the customer has
  // been refunded the full sale it is effectively reversed, so flip it to
  // "Refunded" (which drops it out of sales/profit everywhere and shows the
  // badge). If a refund is later removed and the total falls back below the
  // sale, restore it to "Booked". Manual Cancelled/Void are left untouched.
  async function syncRefundStatus() {
    const { data } = await supabase
      .from("booking_refunds")
      .select("customer_refund")
      .eq("booking_id", booking.id);
    const total = ((data as { customer_refund: number }[]) ?? []).reduce(
      (sum, r) => sum + Number(r.customer_refund),
      0,
    );
    const fullyRefunded = saleTotal > 0 && total >= saleTotal - 0.005;
    let next: FlightBookingStatus | null = null;
    if (
      fullyRefunded &&
      (booking.status === "quote" ||
        booking.status === "booked" ||
        booking.status === "ticketed")
    ) {
      next = "refunded";
    } else if (!fullyRefunded && booking.status === "refunded") {
      next = "booked";
    }
    if (next) {
      await supabase
        .from("flight_bookings")
        .update({ status: next })
        .eq("id", booking.id);
      onStatusChange?.(next);
    }
  }

  return (
    <div className="space-y-5">
      <Section icon={<CoinsIcon />} title={t("Financial summary")}>
        <dl className="space-y-2 text-sm">
          <Row label={t("Sale total")} value={fmtMoney(saleTotal)} />
          <Row label={t("Received")} value={fmtMoney(received)} />
          <Row
            label={t("Receivable")}
            value={fmtMoney(receivable)}
            accent={receivable > 0 ? "amber" : "emerald"}
          />
          {customerDue != null && customerDue !== receivable && (
            <Row
              label={t("Customer total due")}
              value={fmtMoney(Math.max(0, customerDue))}
              accent={customerDue > 0 ? "amber" : "emerald"}
            />
          )}
          <div className="my-2 border-t border-slate-200/60 dark:border-white/10" />
          <Row label={t("Net cost")} value={fmtMoney(netCost)} />
          <Row label={t("Paid to airline")} value={fmtMoney(paidSupplier)} />
          <Row
            label={t("Payable")}
            value={fmtMoney(payable)}
            accent={payable > 0 ? "amber" : "emerald"}
          />
          <div className="my-2 border-t border-slate-200/60 dark:border-white/10" />
          <Row
            label={t("Profit")}
            value={fmtMoney(Number(booking.profit))}
            accent={Number(booking.profit) < 0 ? "rose" : "emerald"}
            bold
          />
          {refunded > 0 && (
            <Row label={t("Refunded to customer")} value={fmtMoney(refunded)} />
          )}
        </dl>
      </Section>

      <ErrorNote message={error} />

      <LedgerSection<BookingPayment>
        icon={<CoinsIcon />}
        title={t("Customer receipts")}
        rows={payments}
        rowLabel={(p) => (
          <>
            <span className="font-medium">{fmtMoney(Number(p.amount))}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {fmtDate(p.paid_date)}
              {p.method ? ` · ${p.method}` : ""}
            </span>
          </>
        )}
        toForm={(p) => ({
          amount: Number(p.amount),
          date: p.paid_date,
          method: p.method ?? "",
          note: p.note ?? "",
        })}
        onDelete={async (id) => {
          await supabase.from("booking_payments").delete().eq("id", id);
          load();
        }}
        onAdd={async (form) => {
          const { error } = await supabase.from("booking_payments").insert({
            booking_id: booking.id,
            amount: form.amount,
            paid_date: form.date,
            method: form.method || null,
            note: form.note || null,
          });
          if (error) {
            setError(error.message);
            return false;
          }
          load();
          return true;
        }}
        onUpdate={async (id, form) => {
          const { error } = await supabase
            .from("booking_payments")
            .update({
              amount: form.amount,
              paid_date: form.date,
              method: form.method || null,
              note: form.note || null,
            })
            .eq("id", id);
          if (error) {
            setError(error.message);
            return false;
          }
          load();
          return true;
        }}
      />

      <LedgerSection<SupplierPayment>
        icon={<BuildingIcon />}
        title={t("Airline payments")}
        rows={supplierPays}
        rowLabel={(p) => (
          <>
            <span className="font-medium">{fmtMoney(Number(p.amount))}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {fmtDate(p.paid_date)}
              {p.method ? ` · ${p.method}` : ""}
            </span>
          </>
        )}
        toForm={(p) => ({
          amount: Number(p.amount),
          date: p.paid_date,
          method: p.method ?? "",
          note: p.note ?? "",
        })}
        onDelete={async (id) => {
          await supabase.from("supplier_payments").delete().eq("id", id);
          load();
        }}
        onAdd={async (form) => {
          const { error } = await supabase.from("supplier_payments").insert({
            booking_id: booking.id,
            supplier_id: booking.supplier_id,
            amount: form.amount,
            paid_date: form.date,
            method: form.method || null,
            note: form.note || null,
          });
          if (error) {
            setError(error.message);
            return false;
          }
          load();
          return true;
        }}
        onUpdate={async (id, form) => {
          const { error } = await supabase
            .from("supplier_payments")
            .update({
              amount: form.amount,
              paid_date: form.date,
              method: form.method || null,
              note: form.note || null,
            })
            .eq("id", id);
          if (error) {
            setError(error.message);
            return false;
          }
          load();
          return true;
        }}
      />

      <RefundSection
        refunds={refunds}
        onDelete={async (id) => {
          await supabase.from("booking_refunds").delete().eq("id", id);
          await syncRefundStatus();
          load();
        }}
        onAdd={async (r) => {
          const { error } = await supabase.from("booking_refunds").insert({
            booking_id: booking.id,
            ...r,
          });
          if (error) {
            setError(error.message);
            return false;
          }
          await syncRefundStatus();
          load();
          return true;
        }}
        onUpdate={async (id, r) => {
          const { error } = await supabase
            .from("booking_refunds")
            .update(r)
            .eq("id", id);
          if (error) {
            setError(error.message);
            return false;
          }
          await syncRefundStatus();
          load();
          return true;
        }}
      />
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  bold,
}: {
  label: string;
  value: string;
  accent?: "amber" | "emerald" | "rose";
  bold?: boolean;
}) {
  const color =
    accent === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : accent === "emerald"
        ? "text-emerald-600 dark:text-emerald-400"
        : accent === "rose"
          ? "text-rose-600 dark:text-rose-400"
          : "text-slate-900 dark:text-slate-100";
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`${bold ? "font-bold" : "font-medium"} ${color}`}>{value}</dd>
    </div>
  );
}

type AddForm = { amount: number; date: string; method: string; note: string };

// A payment ledger block (customer receipts / supplier payments share this).
function LedgerSection<T extends { id: number }>({
  icon,
  title,
  rows,
  rowLabel,
  toForm,
  onAdd,
  onUpdate,
  onDelete,
}: {
  icon: ReactNode;
  title: string;
  rows: T[];
  rowLabel: (row: T) => React.ReactNode;
  toForm: (row: T) => AddForm;
  onAdd: (form: AddForm) => Promise<boolean>;
  onUpdate: (id: number, form: AddForm) => Promise<boolean>;
  onDelete: (id: number) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setEditingId(null);
    setAmount("");
    setMethod("");
    setNote("");
    setDate(today());
  }

  function startAdd() {
    if (open && editingId == null) {
      setOpen(false);
      return;
    }
    resetForm();
    setOpen(true);
  }

  function startEdit(row: T) {
    const f = toForm(row);
    setEditingId(row.id);
    setAmount(String(f.amount));
    setDate(f.date);
    setMethod(f.method);
    setNote(f.note);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setBusy(true);
    const form = { amount: parseFloat(amount), date, method, note };
    const ok =
      editingId != null ? await onUpdate(editingId, form) : await onAdd(form);
    setBusy(false);
    if (ok) {
      resetForm();
      setOpen(false);
    }
  }

  return (
    <Section
      icon={icon}
      title={title}
      action={
        <button
          type="button"
          onClick={startAdd}
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {open && editingId == null ? t("Close") : t("+ Add")}
        </button>
      }
    >
      {open && (
        <form onSubmit={submit} className="mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("Amount")}
              required
            />
            <DatePicker value={date} onChange={setDate} required />
          </div>
          <Input
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder={t("Method (cash, card, transfer…)")}
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("Note (optional)")}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? t("Saving…") : editingId != null ? t("Save changes") : t("Record")}
            </Button>
            {editingId != null && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
              >
                {t("Cancel")}
              </Button>
            )}
          </div>
        </form>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">{t("None yet.")}</p>
      ) : (
        <ul className="divide-y divide-slate-200/60 dark:divide-white/10">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 py-2">
              <div className="flex flex-col">{rowLabel(row)}</div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => startEdit(row)} className={rowActionClass}>
                  {t("Edit")}
                </button>
                <button onClick={() => onDelete(row.id)} className={rowDeleteClass}>
                  {t("Delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

type RefundInput = {
  refund_type: RefundType;
  refund_date: string;
  customer_refund: number;
  supplier_refund: number;
  penalty: number;
  adm_amount: number;
  note: string | null;
};

function RefundSection({
  refunds,
  onAdd,
  onUpdate,
  onDelete,
}: {
  refunds: BookingRefund[];
  onAdd: (r: RefundInput) => Promise<boolean>;
  onUpdate: (id: number, r: RefundInput) => Promise<boolean>;
  onDelete: (id: number) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [customerRefund, setCustomerRefund] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const n = (v: string) => (v === "" ? 0 : parseFloat(v) || 0);

  function resetForm() {
    setEditingId(null);
    setCustomerRefund("");
    setNote("");
    setDate(today());
  }

  function startAdd() {
    if (open && editingId == null) {
      setOpen(false);
      return;
    }
    resetForm();
    setOpen(true);
  }

  function startEdit(r: BookingRefund) {
    setEditingId(r.id);
    setDate(r.refund_date);
    setCustomerRefund(String(Number(r.customer_refund)));
    setNote(r.note ?? "");
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const input: RefundInput = {
      refund_type: "refund",
      refund_date: date,
      customer_refund: n(customerRefund),
      supplier_refund: 0,
      penalty: 0,
      adm_amount: 0,
      note: note.trim() || null,
    };
    const ok =
      editingId != null ? await onUpdate(editingId, input) : await onAdd(input);
    setBusy(false);
    if (ok) {
      resetForm();
      setOpen(false);
    }
  }

  return (
    <Section
      icon={<ReceiptIcon />}
      title={t("Refunds & voids")}
      action={
        <button
          type="button"
          onClick={startAdd}
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {open && editingId == null ? t("Close") : t("+ Add")}
        </button>
      }
    >
      {open && (
        <form onSubmit={submit} className="mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Select value="refund" disabled>
              <option value="refund">{t("Refund")}</option>
            </Select>
            <DatePicker value={date} onChange={setDate} required />
          </div>
          <Input type="number" step="0.01" min="0" value={customerRefund} onChange={(e) => setCustomerRefund(e.target.value)} placeholder={t("Refund to customer")} />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Note (optional)")} />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? t("Saving…") : editingId != null ? t("Save changes") : t("Record")}
            </Button>
            {editingId != null && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
              >
                {t("Cancel")}
              </Button>
            )}
          </div>
        </form>
      )}
      {refunds.length === 0 ? (
        <p className="text-sm text-slate-400">{t("None yet.")}</p>
      ) : (
        <ul className="divide-y divide-slate-200/60 dark:divide-white/10">
          {refunds.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2">
              <div className="flex flex-col">
                <span className="font-medium capitalize">
                  {t(r.refund_type)} · {fmtMoney(Number(r.customer_refund))}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {fmtDate(r.refund_date)}
                  {Number(r.penalty) > 0 ? ` · ${t("penalty {amount}", { amount: fmtMoney(Number(r.penalty)) })}` : ""}
                  {Number(r.adm_amount) > 0 ? ` · ${t("ADM {amount}", { amount: fmtMoney(Number(r.adm_amount)) })}` : ""}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => startEdit(r)} className={rowActionClass}>
                  {t("Edit")}
                </button>
                <button onClick={() => onDelete(r.id)} className={rowDeleteClass}>
                  {t("Delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
