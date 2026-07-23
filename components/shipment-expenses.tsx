"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Expense, Shipment } from "@/lib/types";
import { fmtDate, fmtMoney, modeLabel } from "@/lib/format";
import {
  Button,
  ConfirmDialog,
  ErrorNote,
  Field,
  Input,
  rowDeleteClass,
  Section,
} from "@/components/ui";
import { CoinsIcon } from "@/components/icons";
import { TransportSelect } from "@/components/transport-select";
import { DatePicker } from "@/components/date-picker";
import { useT } from "@/lib/i18n";

// Delivery costs for one shipment, plus the resulting net profit
// (income from the customer − delivery expenses).
export function ShipmentExpenses({ shipment }: { shipment: Shipment }) {
  const t = useT();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [mode, setMode] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    supabase
      .from("expenses")
      .select("*")
      .eq("shipment_id", shipment.id)
      .order("expense_date", { ascending: false })
      .then(({ data }) => {
        if (active) setExpenses((data as Expense[]) ?? []);
      });
    return () => {
      active = false;
    };
  }, [shipment.id, version]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("expenses").insert({
      shipment_id: shipment.id,
      transport_mode: mode,
      amount: parseFloat(amount),
      expense_date: date || undefined,
      description: description.trim() || null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setAmount("");
    setDescription("");
    setDate("");
    reload();
  }

  async function confirmRemove() {
    if (!pending) return;
    setDeleting(true);
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", pending.id);
    setDeleting(false);
    if (error) setError(error.message);
    else reload();
    setPending(null);
  }

  const income = Number(shipment.total);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const profit = income - totalExpenses;

  return (
    <Section
      className="max-w-xl"
      icon={<CoinsIcon />}
      title={t("Delivery expenses & profit")}
      subtitle={t("Costs to deliver this shipment and the resulting net profit")}
    >
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-white/30 p-3 dark:bg-white/[0.05]">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t("Income")}</div>
          <div className="mt-0.5 text-sm font-bold">{fmtMoney(income)}</div>
        </div>
        <div className="rounded-xl bg-white/30 p-3 dark:bg-white/[0.05]">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t("Expenses")}</div>
          <div className="mt-0.5 text-sm font-bold text-red-600 dark:text-red-400">
            −{fmtMoney(totalExpenses)}
          </div>
        </div>
        <div className="rounded-xl bg-white/30 p-3 dark:bg-white/[0.05]">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t("Net profit")}</div>
          <div
            className={`mt-0.5 text-sm font-bold ${
              profit < 0
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {fmtMoney(profit)}
          </div>
        </div>
      </div>

      {expenses.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-200/60 dark:divide-white/10">
          {expenses.map((exp) => (
            <li key={exp.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="shrink-0">{t(modeLabel(exp.transport_mode))}</span>
              <span className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400">
                {exp.description || fmtDate(exp.expense_date)}
              </span>
              <span className="font-medium">{fmtMoney(Number(exp.amount))}</span>
              <button
                type="button"
                onClick={() => setPending(exp)}
                className={rowDeleteClass}
              >
                {t("Delete")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Transport")}>
            <TransportSelect value={mode} onChange={setMode} />
          </Field>
          <Field label={t("Cost")}>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Date (optional)")}>
            <DatePicker value={date} onChange={setDate} />
          </Field>
          <Field label={t("Note (optional)")}>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("e.g. fuel to airport")}
            />
          </Field>
        </div>
        <ErrorNote message={error} />
        <Button type="submit" disabled={busy}>
          {busy ? t("Adding…") : t("+ Add expense")}
        </Button>
      </form>

      <ConfirmDialog
        open={!!pending}
        title={t("Delete expense?")}
        message={
          pending
            ? t("This removes the {amount} expense. This cannot be undone.", {
                amount: fmtMoney(Number(pending.amount)),
              })
            : undefined
        }
        busy={deleting}
        onConfirm={confirmRemove}
        onCancel={() => setPending(null)}
      />
    </Section>
  );
}
