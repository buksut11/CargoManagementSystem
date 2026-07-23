"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  fetchCargoCustomerBalances,
  fetchCargoCustomerBreakdown,
  type CargoCustomerBreakdownLine,
} from "@/lib/balance";
import { fmtDate, fmtMoney } from "@/lib/format";
import type { CargoCustomer } from "@/lib/types";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  Section,
} from "@/components/ui";
import {
  BoxIcon,
  CloseIcon,
  SearchIcon,
  StatementIcon,
  UsersIcon,
} from "@/components/icons";
import { CustomerCardBoard } from "@/components/customer-card-board";
import { useT } from "@/lib/i18n";

export default function CargoCustomersPage() {
  const t = useT();
  const [customers, setCustomers] = useState<CargoCustomer[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, setPending] = useState<CargoCustomer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  const formRef = useRef<HTMLDivElement>(null);

  // "Where does the due come from" drill-down: the customer whose breakdown is
  // open, and the per-invoice lines once fetched (lazy, only when opened).
  const [breakdownFor, setBreakdownFor] = useState<CargoCustomer | null>(null);
  const [breakdown, setBreakdown] = useState<CargoCustomerBreakdownLine[] | null>(
    null,
  );

  async function openBreakdown(c: CargoCustomer) {
    setBreakdownFor(c);
    setBreakdown(null);
    const lines = await fetchCargoCustomerBreakdown(c.id);
    // Guard against a fast close/switch: only apply if still the open customer.
    setBreakdownFor((cur) => {
      if (cur?.id === c.id) setBreakdown(lines);
      return cur;
    });
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setError(null);
  }

  function startEdit(c: CargoCustomer) {
    setEditingId(c.id);
    setName(c.name);
    setEmail(c.email ?? "");
    setPhone(c.phone ?? "");
    setAddress(c.address ?? "");
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    let active = true;
    async function load() {
      const [{ data }, bal] = await Promise.all([
        supabase.from("cargo_customers").select("*").order("name"),
        fetchCargoCustomerBalances(),
      ]);
      if (!active) return;
      setCustomers((data as CargoCustomer[]) ?? []);
      setBalances(bal);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [version]);

  // Search by customer name or phone ("customer number"). Case-insensitive;
  // digits-only matching for phones so "0712 345" matches "0712345".
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    const digits = q.replace(/\D/g, "");
    return customers.filter((c) => {
      const nameHit = c.name.toLowerCase().includes(q);
      const phone = c.phone ?? "";
      const phoneHit =
        phone.toLowerCase().includes(q) ||
        (digits.length > 0 && phone.replace(/\D/g, "").includes(digits));
      return nameHit || phoneHit;
    });
  }, [customers, search]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("cargo_customers").update(payload).eq("id", editingId)
      : await supabase.from("cargo_customers").insert(payload);
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
      .from("cargo_customers")
      .delete()
      .eq("id", pending.id);
    setDeleting(false);
    if (error) setError(error.message);
    else reload();
    setPending(null);
  }

  return (
    <div>
      <PageHeader title={t("Customers")} />
      <div className="space-y-6">
        <Section
          icon={<UsersIcon />}
          title={editingId ? t("Edit customer") : t("New customer")}
          subtitle={t("People or companies you ship for")}
        >
          <div ref={formRef} className="-mt-2 scroll-mt-6" />
          <form onSubmit={save} className="flex flex-wrap items-end gap-3">
            <div className="min-w-40 flex-1">
              <Field label={t("Name")}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("e.g. Ali Trading Co.")}
                  required
                />
              </Field>
            </div>
            <div className="min-w-40 flex-1">
              <Field label={t("Email")}>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            </div>
            <div className="min-w-40 flex-1">
              <Field label={t("Phone")}>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
            </div>
            <div className="min-w-40 flex-1">
              <Field label={t("Address")}>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? t("Saving…") : editingId ? t("Save changes") : t("Add customer")}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  {t("Cancel")}
                </Button>
              )}
            </div>
          </form>
          <div className="mt-3">
            <ErrorNote message={error} />
          </div>
        </Section>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200/50 px-4 py-3 dark:border-white/[0.08]">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("All customers")}
            </h2>
            {customers.length > 0 && (
              <span className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
                {customers.length}
              </span>
            )}
          </div>
          <div className="border-b border-slate-200/50 p-3 dark:border-white/[0.08]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search by name or phone number…")}
                aria-label={t("Search customers by name or phone number")}
                className="w-full rounded-2xl border border-white/70 bg-white/50 py-3 pl-11 pr-4 text-sm text-slate-900 shadow-inner shadow-black/[0.02] outline-none backdrop-blur transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white/70 focus:ring-4 focus:ring-blue-200/50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400/60 dark:focus:bg-white/[0.08] dark:focus:ring-blue-500/20"
              />
            </div>
          </div>

          <CustomerCardBoard
            customers={filtered}
            balances={balances}
            statementHref={(c) => `/statement?customer=${c.id}`}
            onShowBreakdown={openBreakdown}
            onEdit={startEdit}
            onDelete={setPending}
          />
          {!loading && customers.length === 0 && (
            <EmptyState message={t("No customers yet — they appear here as you invoice, or add them manually.")} />
          )}
          {!loading && customers.length > 0 && filtered.length === 0 && (
            <EmptyState message={t('No customers match "{search}".', { search: search.trim() })} />
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!pending}
        title={t("Delete customer?")}
        message={
          pending
            ? t('Delete "{name}"? Their invoices will keep working but show no customer.', {
                name: pending.name,
              })
            : undefined
        }
        busy={deleting}
        onConfirm={confirmRemove}
        onCancel={() => setPending(null)}
      />

      {breakdownFor && (
        <BreakdownModal
          customer={breakdownFor}
          due={balances[breakdownFor.id] ?? 0}
          lines={breakdown}
          onClose={() => {
            setBreakdownFor(null);
            setBreakdown(null);
          }}
        />
      )}
    </div>
  );
}

// Drill-down that answers "where does the $X due come from?" for one cargo
// customer: the invoices still carrying a balance, each showing charged / paid /
// remaining and summing to the amount owed, with a link out to the statement.
function BreakdownModal({
  customer,
  due,
  lines,
  onClose,
}: {
  customer: CargoCustomer;
  due: number;
  lines: CargoCustomerBreakdownLine[] | null;
  onClose: () => void;
}) {
  const t = useT();
  // Only invoices that still owe make up the balance due; fully-settled ones are
  // noise here. A tiny epsilon avoids float dust ($0.00 rows).
  const owing = (lines ?? []).filter((l) => l.remaining > 0.005);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Balance breakdown for {name}", { name: customer.name })}
        className="glass-panel relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/60 p-5 dark:border-white/[0.08]">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              {t("Balance due")}
            </div>
            <div className="mt-0.5 truncate text-lg font-bold text-slate-900 dark:text-slate-100">
              {fmtMoney(due)}
            </div>
            <div className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
              {customer.name} ·{" "}
              {owing.length === 1
                ? t("made up of {count} invoice", { count: owing.length })
                : t("made up of {count} invoices", { count: owing.length })}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close")}
            className="shrink-0 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-500/10 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Lines */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {lines === null ? (
            <div className="py-10 text-center text-sm text-slate-400">{t("Loading…")}</div>
          ) : owing.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              {t("No unpaid invoices — this balance may be from a rounding adjustment.")}
            </div>
          ) : (
            <ul className="space-y-2">
              {owing.map((l) => (
                <li key={l.invoiceId}>
                  <Link
                    href={`/invoices/${l.invoiceId}`}
                    className="group flex items-center gap-3 rounded-2xl border border-white/60 bg-white/40 px-3.5 py-3 transition-colors hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.1]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400">
                      <BoxIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <span className="tabular-nums">{l.ref}</span>
                        {l.label && (
                          <span className="truncate font-normal text-slate-500 dark:text-slate-400">
                            {l.label}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {fmtDate(l.date)}
                        {" · "}
                        {l.paid > 0.005
                          ? t("{charged} charged, {paid} paid", {
                              charged: fmtMoney(l.charged),
                              paid: fmtMoney(l.paid),
                            })
                          : t("{charged} charged, unpaid", {
                              charged: fmtMoney(l.charged),
                            })}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-600 dark:bg-amber-400/15 dark:text-amber-400">
                      {fmtMoney(l.remaining)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200/60 p-4 dark:border-white/[0.08]">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t("Total due")}{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {fmtMoney(due)}
            </span>
          </span>
          <Link
            href={`/statement?customer=${customer.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700"
          >
            <StatementIcon className="h-4 w-4" />
            {t("Full statement")}
          </Link>
        </div>
      </div>
    </div>
  );
}
