"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  BookingPayment,
  BookingRefund,
  FlightBooking,
  RefundType,
  SupplierPayment,
} from "@/lib/types";
import { fmtDate, fmtMoney } from "@/lib/format";
import { Button, Card, ErrorNote, Input, Select } from "@/components/ui";
import { DatePicker } from "@/components/date-picker";

const today = () => new Date().toISOString().slice(0, 10);

export function BookingLedger({ booking }: { booking: FlightBooking }) {
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [supplierPays, setSupplierPays] = useState<SupplierPayment[]>([]);
  const [refunds, setRefunds] = useState<BookingRefund[]>([]);
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

  const received = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const paidSupplier = supplierPays.reduce((sum, p) => sum + Number(p.amount), 0);
  const refunded = refunds.reduce((sum, r) => sum + Number(r.customer_refund), 0);
  const saleTotal = Number(booking.sale_total);
  const netCost = Number(booking.net_cost);
  const receivable = Math.max(0, saleTotal - received);
  const payable = Math.max(0, netCost - paidSupplier);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
          Financial summary
        </h2>
        <dl className="space-y-2 text-sm">
          <Row label="Sale total" value={fmtMoney(saleTotal)} />
          <Row label="Received" value={fmtMoney(received)} />
          <Row
            label="Receivable"
            value={fmtMoney(receivable)}
            accent={receivable > 0 ? "amber" : "emerald"}
          />
          <div className="my-2 border-t border-slate-200/60 dark:border-white/10" />
          <Row label="Net cost" value={fmtMoney(netCost)} />
          <Row label="Paid to supplier" value={fmtMoney(paidSupplier)} />
          <Row
            label="Payable"
            value={fmtMoney(payable)}
            accent={payable > 0 ? "amber" : "emerald"}
          />
          <div className="my-2 border-t border-slate-200/60 dark:border-white/10" />
          <Row
            label="Profit"
            value={fmtMoney(Number(booking.profit))}
            accent={Number(booking.profit) < 0 ? "rose" : "emerald"}
            bold
          />
          {refunded > 0 && (
            <Row label="Refunded to customer" value={fmtMoney(refunded)} />
          )}
        </dl>
      </Card>

      <ErrorNote message={error} />

      <LedgerSection<BookingPayment>
        title="Customer receipts"
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
      />

      <LedgerSection<SupplierPayment>
        title="Supplier payments"
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
      />

      <RefundSection
        refunds={refunds}
        onDelete={async (id) => {
          await supabase.from("booking_refunds").delete().eq("id", id);
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
  title,
  rows,
  rowLabel,
  onAdd,
  onDelete,
}: {
  title: string;
  rows: T[];
  rowLabel: (row: T) => React.ReactNode;
  onAdd: (form: AddForm) => Promise<boolean>;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setBusy(true);
    const ok = await onAdd({
      amount: parseFloat(amount),
      date,
      method,
      note,
    });
    setBusy(false);
    if (ok) {
      setAmount("");
      setMethod("");
      setNote("");
      setDate(today());
      setOpen(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {open ? "Close" : "+ Add"}
        </button>
      </div>
      {open && (
        <form onSubmit={submit} className="mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              required
            />
            <DatePicker value={date} onChange={setDate} required />
          </div>
          <Input
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Method (cash, card, transfer…)"
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Record"}
          </Button>
        </form>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">None yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200/60 dark:divide-white/10">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 py-2">
              <div className="flex flex-col">{rowLabel(row)}</div>
              <button
                onClick={() => onDelete(row.id)}
                className="text-xs text-rose-600 hover:underline dark:text-rose-400"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
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
  onDelete,
}: {
  refunds: BookingRefund[];
  onAdd: (r: RefundInput) => Promise<boolean>;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<RefundType>("refund");
  const [date, setDate] = useState(today());
  const [customerRefund, setCustomerRefund] = useState("");
  const [supplierRefund, setSupplierRefund] = useState("");
  const [penalty, setPenalty] = useState("");
  const [adm, setAdm] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const n = (v: string) => (v === "" ? 0 : parseFloat(v) || 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await onAdd({
      refund_type: type,
      refund_date: date,
      customer_refund: n(customerRefund),
      supplier_refund: n(supplierRefund),
      penalty: n(penalty),
      adm_amount: n(adm),
      note: note.trim() || null,
    });
    setBusy(false);
    if (ok) {
      setCustomerRefund("");
      setSupplierRefund("");
      setPenalty("");
      setAdm("");
      setNote("");
      setDate(today());
      setType("refund");
      setOpen(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Refunds &amp; voids
        </h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {open ? "Close" : "+ Add"}
        </button>
      </div>
      {open && (
        <form onSubmit={submit} className="mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Select value={type} onChange={(e) => setType(e.target.value as RefundType)}>
              <option value="refund">Refund</option>
              <option value="void">Void</option>
              <option value="reissue">Reissue</option>
            </Select>
            <DatePicker value={date} onChange={setDate} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" step="0.01" min="0" value={customerRefund} onChange={(e) => setCustomerRefund(e.target.value)} placeholder="Refund to customer" />
            <Input type="number" step="0.01" min="0" value={supplierRefund} onChange={(e) => setSupplierRefund(e.target.value)} placeholder="Recovered from supplier" />
            <Input type="number" step="0.01" min="0" value={penalty} onChange={(e) => setPenalty(e.target.value)} placeholder="Penalty" />
            <Input type="number" step="0.01" min="0" value={adm} onChange={(e) => setAdm(e.target.value)} placeholder="ADM amount" />
          </div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Record"}
          </Button>
        </form>
      )}
      {refunds.length === 0 ? (
        <p className="text-sm text-slate-400">None yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200/60 dark:divide-white/10">
          {refunds.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2">
              <div className="flex flex-col">
                <span className="font-medium capitalize">
                  {r.refund_type} · {fmtMoney(Number(r.customer_refund))}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {fmtDate(r.refund_date)}
                  {Number(r.penalty) > 0 ? ` · penalty ${fmtMoney(Number(r.penalty))}` : ""}
                  {Number(r.adm_amount) > 0 ? ` · ADM ${fmtMoney(Number(r.adm_amount))}` : ""}
                </span>
              </div>
              <button
                onClick={() => onDelete(r.id)}
                className="text-xs text-rose-600 hover:underline dark:text-rose-400"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
