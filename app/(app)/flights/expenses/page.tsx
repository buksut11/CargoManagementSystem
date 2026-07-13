"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { downloadCsv } from "@/lib/csv";
import type { FlightBooking, FlightExpense } from "@/lib/types";
import {
  fmtDate,
  fmtMoney,
  flightExpenseCategoryLabel,
  REVERSED_IN_LIST,
} from "@/lib/format";
import { DatePicker } from "@/components/date-picker";
import { FlightExpenseSelect } from "@/components/flight-expense-select";
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
  rowActionClass,
  rowDeleteClass,
  Section,
  Select,
  Td,
  Th,
} from "@/components/ui";
import { ChartIcon, WalletIcon } from "@/components/icons";

type BookingProfit = Pick<FlightBooking, "profit" | "booking_date">;

// "2026-06" → "Jun 2026" for the period dropdown.
function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function FlightExpensesPage() {
  const [expenses, setExpenses] = useState<FlightExpense[]>([]);
  const [bookings, setBookings] = useState<BookingProfit[]>([]);
  const [loading, setLoading] = useState(true);

  // "" = all time; otherwise a "YYYY-MM" period.
  const [month, setMonth] = useState("");

  const [category, setCategory] = useState<string>("staff_salary");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<FlightExpense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const [e, b] = await Promise.all([
        supabase
          .from("flight_expenses")
          .select("*")
          .order("expense_date", { ascending: false }),
        // Recognised bookings only, so gross profit matches the dashboard.
        supabase
          .from("flight_bookings")
          .select("profit, booking_date")
          .not("status", "in", REVERSED_IN_LIST),
      ]);
      if (!active) return;
      setExpenses((e.data as FlightExpense[]) ?? []);
      setBookings((b.data as BookingProfit[]) ?? []);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [version]);

  // Every month that has either an expense or a booking, newest first.
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const e of expenses) set.add(e.expense_date.slice(0, 7));
    for (const b of bookings) set.add(b.booking_date.slice(0, 7));
    return [...set].sort().reverse();
  }, [expenses, bookings]);

  const inMonth = (d: string) => !month || d.slice(0, 7) === month;
  const filteredExpenses = expenses.filter((e) => inMonth(e.expense_date));

  const grossProfit = bookings
    .filter((b) => inMonth(b.booking_date))
    .reduce((sum, b) => sum + Number(b.profit), 0);
  const totalExpenses = filteredExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0,
  );
  const netProfit = grossProfit - totalExpenses;

  function resetForm() {
    setEditingId(null);
    setCategory("staff_salary");
    setAmount("");
    setDate("");
    setNote("");
    setError(null);
  }

  function startEdit(exp: FlightExpense) {
    setEditingId(exp.id);
    setCategory(exp.category);
    setAmount(String(exp.amount));
    setDate(exp.expense_date);
    setNote(exp.note ?? "");
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      category,
      amount: parseFloat(amount),
      expense_date: date || undefined,
      note: note.trim() || null,
    };
    const { error } = editingId
      ? await supabase
          .from("flight_expenses")
          .update(payload)
          .eq("id", editingId)
      : await supabase.from("flight_expenses").insert(payload);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    resetForm();
    reload();
  }

  async function confirmRemove() {
    if (!pending) return;
    setDeleting(true);
    const { error } = await supabase
      .from("flight_expenses")
      .delete()
      .eq("id", pending.id);
    setDeleting(false);
    if (error) setError(error.message);
    else reload();
    setPending(null);
  }

  // Per-category totals for the selected period, largest first.
  const byCategory = (() => {
    const map = new Map<string, number>();
    for (const e of filteredExpenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    }
    return [...map.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  })();

  const periodNote = month ? ` · ${monthLabel(month)}` : " · all time";
  const stats = [
    { label: `Gross profit (bookings)${periodNote}`, value: fmtMoney(grossProfit) },
    { label: "Operating expenses", value: `−${fmtMoney(totalExpenses)}`, red: true },
    { label: "Net profit", value: fmtMoney(netProfit), red: netProfit < 0 },
  ];

  return (
    <div>
      <PageHeader
        title="Operating Expenses"
        action={
          <div className="flex items-center gap-2">
            <div className="w-40">
              <Select value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">All time</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </Select>
            </div>
            <button
              onClick={() =>
                downloadCsv(
                  `flight-operating-expenses${month ? `-${month}` : ""}.csv`,
                  [
                    ["Date", "Category", "Note", "Amount"],
                    ...filteredExpenses.map((e) => [
                      e.expense_date,
                      flightExpenseCategoryLabel(e.category),
                      e.note ?? "",
                      Number(e.amount),
                    ]),
                  ],
                )
              }
              disabled={filteredExpenses.length === 0}
              className="rounded-full border border-white/60 bg-white/35 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur hover:bg-white/60 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.08]"
            >
              ⬇ Export CSV
            </button>
          </div>
        }
      />

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
        title={editingId ? "Edit operating expense" : "Add an operating expense"}
        subtitle="Overhead that keeps the office running (staff salary, rent, electricity…)"
      >
        <div ref={formRef} className="-mt-2 scroll-mt-6" />
        <form
          onSubmit={save}
          className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <Field label="Category">
            <FlightExpenseSelect value={category} onChange={setCategory} />
          </Field>
          <Field label="Amount">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>
          <Field label="Date (optional)">
            <DatePicker value={date} onChange={setDate} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-1">
            <Field label="Note (optional)">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. June payroll"
              />
            </Field>
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
            <Button type="submit" disabled={busy}>
              {busy
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Add expense"}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      </Section>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-3">
        <Card className="table-scroll lg:col-span-2">
          <div className="flex items-center gap-2.5 px-5 pt-4">
            <IconChip>
              <WalletIcon />
            </IconChip>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {month ? `Expenses · ${monthLabel(month)}` : "All expenses"}
            </h2>
          </div>
          <div className="mt-2 space-y-3 p-3 lg:hidden">
            {filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                className="rounded-2xl border border-slate-200/60 bg-white/40 p-4 shadow-sm dark:bg-white/[0.04] dark:border-white/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{flightExpenseCategoryLabel(exp.category)}</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    −{fmtMoney(Number(exp.amount))}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>{fmtDate(exp.expense_date)}</span>
                  {exp.note && <span>{exp.note}</span>}
                  <span className="ml-auto flex items-center gap-2">
                    <button onClick={() => startEdit(exp)} className={rowActionClass}>
                      Edit
                    </button>
                    <button onClick={() => setPending(exp)} className={rowDeleteClass}>
                      Delete
                    </button>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <table className="mt-1 hidden w-full lg:table">
            <thead className="border-b border-slate-200/60 dark:border-white/10">
              <tr>
                <Th>Date</Th>
                <Th>Category</Th>
                <Th>Note</Th>
                <Th>Amount</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {filteredExpenses.map((exp) => (
                <tr
                  key={exp.id}
                  className="hover:bg-white/60 dark:hover:bg-white/[0.08]"
                >
                  <Td className="whitespace-nowrap">{fmtDate(exp.expense_date)}</Td>
                  <Td className="whitespace-nowrap">
                    {flightExpenseCategoryLabel(exp.category)}
                  </Td>
                  <Td>{exp.note ?? "—"}</Td>
                  <Td className="whitespace-nowrap font-medium text-red-600 dark:text-red-400">
                    −{fmtMoney(Number(exp.amount))}
                  </Td>
                  <Td className="text-right">
                    <span className="inline-flex items-center gap-2">
                      <button onClick={() => startEdit(exp)} className={rowActionClass}>
                        Edit
                      </button>
                      <button
                        onClick={() => setPending(exp)}
                        className={rowDeleteClass}
                      >
                        Delete
                      </button>
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredExpenses.length === 0 && (
            <EmptyState
              message={
                month
                  ? "No operating expenses recorded for this month."
                  : "No operating expenses yet — record staff salary, rent, electricity and other overhead to see your true net profit."
              }
            />
          )}
        </Card>

        <Card className="table-scroll">
          <div className="flex items-center gap-2.5 px-5 pt-4">
            <IconChip>
              <ChartIcon />
            </IconChip>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              By category
            </h2>
          </div>
          <table className="mt-2 w-full">
            <thead className="border-b border-slate-200/60 dark:border-white/10">
              <tr>
                <Th>Category</Th>
                <Th>Total</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {byCategory.map((r) => (
                <tr
                  key={r.category}
                  className="hover:bg-white/60 dark:hover:bg-white/[0.08]"
                >
                  <Td className="font-medium">
                    {flightExpenseCategoryLabel(r.category)}
                  </Td>
                  <Td className="whitespace-nowrap text-red-600 dark:text-red-400">
                    −{fmtMoney(r.total)}
                  </Td>
                </tr>
              ))}
              {byCategory.length > 0 && (
                <tr className="border-t-2 border-slate-300/60 dark:border-white/20">
                  <Td className="font-semibold">Total</Td>
                  <Td className="whitespace-nowrap font-semibold text-red-600 dark:text-red-400">
                    −{fmtMoney(totalExpenses)}
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
          {!loading && byCategory.length === 0 && (
            <EmptyState message="Category totals appear here once you add expenses." />
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!pending}
        title="Delete expense?"
        message={
          pending
            ? `This removes the ${fmtMoney(
                Number(pending.amount),
              )} ${flightExpenseCategoryLabel(
                pending.category,
              ).toLowerCase()} expense. This cannot be undone.`
            : undefined
        }
        busy={deleting}
        onConfirm={confirmRemove}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
