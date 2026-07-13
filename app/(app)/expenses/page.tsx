"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Expense, Shipment } from "@/lib/types";
import { fmtDate, fmtMoney, modeLabel, shipmentRef } from "@/lib/format";
import { TransportSelect } from "@/components/transport-select";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Field,
  IconChip,
  Input,
  PageHeader,
  rowDeleteClass,
  Section,
  Select,
  Td,
  Th,
} from "@/components/ui";
import { DatePicker } from "@/components/date-picker";
import { ChartIcon, WalletIcon } from "@/components/icons";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  const [shipmentId, setShipmentId] = useState("");
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
    async function load() {
      const [e, s] = await Promise.all([
        supabase
          .from("expenses")
          .select("*, shipments(id, description, total)")
          .order("expense_date", { ascending: false }),
        supabase
          .from("shipments")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      setExpenses((e.data as Expense[]) ?? []);
      setShipments((s.data as Shipment[]) ?? []);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [version]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("expenses").insert({
      shipment_id: Number(shipmentId),
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

  const expensesByShipment = new Map<number, number>();
  for (const exp of expenses) {
    expensesByShipment.set(
      exp.shipment_id,
      (expensesByShipment.get(exp.shipment_id) ?? 0) + Number(exp.amount),
    );
  }

  const totalIncome = shipments.reduce((sum, s) => sum + Number(s.total), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalIncome - totalExpenses;

  const stats = [
    { label: "Income (all shipments)", value: fmtMoney(totalIncome) },
    { label: "Delivery expenses", value: `−${fmtMoney(totalExpenses)}`, red: true },
    { label: "Net profit", value: fmtMoney(netProfit), red: netProfit < 0 },
  ];

  return (
    <div>
      <PageHeader title="Expenses" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {s.label}
            </div>
            <div
              className={`mt-1.5 text-2xl font-bold tracking-tight ${
                s.red
                  ? "text-red-600 dark:text-red-400"
                  : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {loading ? "…" : s.value}
            </div>
          </Card>
        ))}
      </div>

      <Section
        className="mt-5"
        icon={<WalletIcon />}
        title="Add a delivery expense"
        subtitle="Record what a delivery cost you (airplane, car, motorcycle…)"
      >
        <form
          onSubmit={add}
          className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-6"
        >
          <div className="lg:col-span-2">
            <Field label="Shipment">
              <Select
                value={shipmentId}
                onChange={(e) => setShipmentId(e.target.value)}
                required
              >
                <option value="">— choose shipment —</option>
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {shipmentRef(s.id)} — {s.description}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Transport">
            <TransportSelect value={mode} onChange={setMode} />
          </Field>
          <Field label="Cost">
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>
          <Field label="Date (optional)">
            <DatePicker value={date} onChange={setDate} />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add"}
          </Button>
        </form>
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      </Section>

      <Card className="mt-5 table-scroll">
        <div className="flex items-center gap-2.5 px-5 pt-4">
          <IconChip>
            <WalletIcon />
          </IconChip>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            All expenses
          </h2>
        </div>
        <div className="mt-2 space-y-3 p-3 lg:hidden">
          {expenses.map((exp) => (
            <div
              key={exp.id}
              className="rounded-2xl border border-slate-200/60 bg-white/40 p-4 shadow-sm dark:bg-white/[0.04] dark:border-white/10"
            >
              <div className="flex items-center justify-between gap-2">
                <span>{modeLabel(exp.transport_mode)}</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  −{fmtMoney(Number(exp.amount))}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <Link
                  href={`/shipments/${exp.shipment_id}`}
                  className="font-medium text-blue-600 dark:text-blue-400"
                >
                  {shipmentRef(exp.shipment_id)}
                </Link>
                {exp.description && <span>{exp.description}</span>}
                <span>{fmtDate(exp.expense_date)}</span>
                <button
                  onClick={() => setPending(exp)}
                  className={`ml-auto ${rowDeleteClass}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        <table className="mt-1 hidden w-full lg:table">
          <thead className="border-b border-slate-200/60 dark:border-white/10">
            <tr>
              <Th>Date</Th>
              <Th>Shipment</Th>
              <Th>Transport</Th>
              <Th>Note</Th>
              <Th>Cost</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
            {expenses.map((exp) => (
              <tr
                key={exp.id}
                className="hover:bg-white/60 dark:hover:bg-white/[0.08]"
              >
                <Td className="whitespace-nowrap">{fmtDate(exp.expense_date)}</Td>
                <Td className="whitespace-nowrap">
                  <Link
                    href={`/shipments/${exp.shipment_id}`}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {shipmentRef(exp.shipment_id)}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap">
                  {modeLabel(exp.transport_mode)}
                </Td>
                <Td>{exp.description ?? "—"}</Td>
                <Td className="whitespace-nowrap font-medium text-red-600 dark:text-red-400">
                  −{fmtMoney(Number(exp.amount))}
                </Td>
                <Td className="text-right">
                  <button onClick={() => setPending(exp)} className={rowDeleteClass}>
                    Delete
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && expenses.length === 0 && (
          <EmptyState message="No expenses yet — record what a delivery cost you (airplane, car, motorcycle…) to see your real profit." />
        )}
      </Card>

      <Card className="mt-5 table-scroll">
        <div className="flex items-center gap-2.5 px-5 pt-4">
          <IconChip>
            <ChartIcon />
          </IconChip>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Profit per shipment
          </h2>
        </div>
        <div className="mt-2 space-y-3 p-3 lg:hidden">
          {shipments.map((s) => {
            const cost = expensesByShipment.get(s.id) ?? 0;
            const profit = Number(s.total) - cost;
            return (
              <Link
                key={s.id}
                href={`/shipments/${s.id}`}
                className="block rounded-2xl border border-slate-200/60 bg-white/40 p-4 shadow-sm dark:bg-white/[0.04] hover:bg-white/60 dark:border-white/10 dark:hover:bg-white/[0.08]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {shipmentRef(s.id)}
                  </span>
                  <span
                    className={`font-semibold ${
                      profit < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {fmtMoney(profit)}
                  </span>
                </div>
                <div className="mt-1 text-sm">{s.description}</div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>Income {fmtMoney(Number(s.total))}</span>
                  <span>Expenses −{fmtMoney(cost)}</span>
                </div>
              </Link>
            );
          })}
        </div>
        <table className="mt-1 hidden w-full lg:table">
          <thead className="border-b border-slate-200/60 dark:border-white/10">
            <tr>
              <Th>Ref</Th>
              <Th>Description</Th>
              <Th>Income</Th>
              <Th>Expenses</Th>
              <Th>Net profit</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
            {shipments.map((s) => {
              const cost = expensesByShipment.get(s.id) ?? 0;
              const profit = Number(s.total) - cost;
              return (
                <tr
                  key={s.id}
                  className="hover:bg-white/60 dark:hover:bg-white/[0.08]"
                >
                  <Td className="whitespace-nowrap">
                    <Link
                      href={`/shipments/${s.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {shipmentRef(s.id)}
                    </Link>
                  </Td>
                  <Td>{s.description}</Td>
                  <Td className="whitespace-nowrap">
                    {fmtMoney(Number(s.total))}
                  </Td>
                  <Td className="whitespace-nowrap text-red-600 dark:text-red-400">
                    −{fmtMoney(cost)}
                  </Td>
                  <Td
                    className={`whitespace-nowrap font-semibold ${
                      profit < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {fmtMoney(profit)}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && shipments.length === 0 && (
          <EmptyState message="No shipments yet — profit per shipment will appear here." />
        )}
      </Card>

      <ConfirmDialog
        open={!!pending}
        title="Delete expense?"
        message={
          pending
            ? `This removes the ${fmtMoney(
                Number(pending.amount),
              )} expense. This cannot be undone.`
            : undefined
        }
        busy={deleting}
        onConfirm={confirmRemove}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
