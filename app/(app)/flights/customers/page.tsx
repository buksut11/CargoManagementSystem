"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  fetchCustomerBalances,
  fetchCustomerBookingBreakdown,
  type CustomerBookingBreakdownLine,
} from "@/lib/balance";
import { fmtDate, fmtMoney } from "@/lib/format";
import type { FlightCustomer } from "@/lib/types";
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
  CloseIcon,
  EditIcon,
  MailIcon,
  PhoneIcon,
  PlaneIcon,
  SearchIcon,
  StatementIcon,
  TrashIcon,
  UsersIcon,
} from "@/components/icons";

// Deterministic gradient for a customer avatar so each person keeps a stable,
// tasteful colour instead of everything looking identical.
const AVATAR_GRADIENTS = [
  "from-blue-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-violet-500 to-purple-500",
  "from-cyan-500 to-sky-500",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase() || "?";
}

function Avatar({ name }: { name: string }) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const gradient = AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-sm font-bold tracking-wide text-white shadow-md shadow-black/10 ring-1 ring-white/40 transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transform-none dark:ring-white/10`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

// Filled-tint action pill used only on this page, so the redesign stays
// contained to the flight Customers list and no other table is affected.
const custActionClass =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 ease-out";

export default function FlightCustomersPage() {
  const [customers, setCustomers] = useState<FlightCustomer[]>([]);
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
  const [pending, setPending] = useState<FlightCustomer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  const formRef = useRef<HTMLDivElement>(null);

  // "Where does the due come from" drill-down: the customer whose breakdown is
  // open, and the per-booking lines once fetched (lazy, only when opened).
  const [breakdownFor, setBreakdownFor] = useState<FlightCustomer | null>(null);
  const [breakdown, setBreakdown] = useState<CustomerBookingBreakdownLine[] | null>(
    null,
  );

  async function openBreakdown(c: FlightCustomer) {
    setBreakdownFor(c);
    setBreakdown(null);
    const lines = await fetchCustomerBookingBreakdown(c.id);
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

  function startEdit(c: FlightCustomer) {
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
        supabase.from("flight_customers").select("*").order("name"),
        fetchCustomerBalances(),
      ]);
      if (!active) return;
      setCustomers((data as FlightCustomer[]) ?? []);
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
      ? await supabase.from("flight_customers").update(payload).eq("id", editingId)
      : await supabase.from("flight_customers").insert(payload);
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
      .from("flight_customers")
      .delete()
      .eq("id", pending.id);
    setDeleting(false);
    if (error) setError(error.message);
    else reload();
    setPending(null);
  }

  return (
    <div>
      <PageHeader title="Customers" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Section
          icon={<UsersIcon />}
          title={editingId ? "Edit customer" : "New customer"}
          subtitle="People or agencies you sell tickets to"
        >
          <div ref={formRef} className="-mt-2 scroll-mt-6" />
          <form onSubmit={save} className="space-y-3">
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Travel"
                required
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Address">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : editingId ? "Save changes" : "Add customer"}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
            <ErrorNote message={error} />
          </form>
        </Section>
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200/50 p-3 dark:border-white/[0.08]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone number…"
                aria-label="Search customers by name or phone number"
                className="w-full rounded-2xl border border-white/70 bg-white/50 py-3 pl-11 pr-4 text-sm text-slate-900 shadow-inner shadow-black/[0.02] outline-none backdrop-blur transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white/70 focus:ring-4 focus:ring-blue-200/50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400/60 dark:focus:bg-white/[0.08] dark:focus:ring-blue-500/20"
              />
            </div>
          </div>

          {filtered.length > 0 && (
            <div className="divide-y divide-slate-200/50 dark:divide-white/[0.06]">
              {filtered.map((c) => {
                const due = balances[c.id] ?? 0;
                return (
                  <div
                    key={c.id}
                    className="group relative flex flex-col gap-3 px-4 py-4 transition-colors duration-300 ease-out hover:bg-gradient-to-r hover:from-white/60 hover:to-transparent sm:flex-row sm:items-center sm:gap-4 dark:hover:from-white/[0.06]"
                  >
                    {/* Accent bar for customers who owe money — a quick visual cue. */}
                    <span
                      className={`absolute inset-y-2 left-0 w-1 rounded-full transition-opacity duration-300 ease-out ${
                        due > 0
                          ? "bg-gradient-to-b from-amber-400 to-orange-500 opacity-100"
                          : "opacity-0"
                      }`}
                      aria-hidden
                    />

                    {/* Identity */}
                    <div className="flex min-w-0 flex-1 items-center gap-3.5">
                      <Avatar name={c.name} />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                          {c.name}
                        </div>
                        {c.email && (
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <MailIcon className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                            <span className="truncate">{c.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Phone + status */}
                    <div className="flex items-center gap-2 pl-[3.875rem] sm:gap-3 sm:pl-0">
                      {c.phone && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/[0.06] px-3 py-1.5 text-xs font-medium tabular-nums text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                          <PhoneIcon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          {c.phone}
                        </span>
                      )}
                      {due > 0 ? (
                        <button
                          type="button"
                          onClick={() => openBreakdown(c)}
                          title={`See what makes up ${c.name}'s balance`}
                          aria-label={`See what makes up ${c.name}'s balance of ${fmtMoney(due)}`}
                          className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-600 transition-colors duration-200 ease-out hover:bg-amber-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 dark:bg-amber-400/15 dark:text-amber-400 dark:hover:bg-amber-400/25"
                        >
                          {fmtMoney(due)} due
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Settled
                        </span>
                      )}
                    </div>

                    {/* Actions — icon-only on desktop (labels appear on mobile,
                        where they sit on their own line with room to spare). */}
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 pl-[3.875rem] sm:pl-0">
                      <Link
                        href={`/flights/statement?customer=${c.id}`}
                        title="View statement"
                        aria-label={`View ${c.name}'s statement`}
                        className={`${custActionClass} bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400 dark:hover:bg-blue-400/20`}
                      >
                        <StatementIcon className="h-4 w-4" />
                        <span className="sm:hidden">Statement</span>
                      </Link>
                      <button
                        onClick={() => startEdit(c)}
                        title="Edit"
                        aria-label={`Edit ${c.name}`}
                        className={`${custActionClass} bg-slate-500/[0.07] text-slate-600 hover:bg-slate-500/15 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.12]`}
                      >
                        <EditIcon className="h-4 w-4" />
                        <span className="sm:hidden">Edit</span>
                      </button>
                      <button
                        onClick={() => setPending(c)}
                        title="Delete"
                        aria-label={`Delete ${c.name}`}
                        className={`${custActionClass} bg-red-500/[0.08] text-red-600 hover:bg-red-500/15 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20`}
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span className="sm:hidden">Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!loading && customers.length === 0 && (
            <EmptyState message="No customers yet — add the people or agencies you sell tickets to." />
          )}
          {!loading && customers.length > 0 && filtered.length === 0 && (
            <EmptyState message={`No customers match "${search.trim()}".`} />
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!pending}
        title="Delete customer?"
        message={
          pending
            ? `Delete "${pending.name}"? Their bookings will keep working but show no customer.`
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

// Drill-down that answers "where does the $X due come from?" for one customer:
// the tickets still carrying a balance, each showing charged / paid / remaining
// and summing to the amount owed, with a link out to the full statement.
function BreakdownModal({
  customer,
  due,
  lines,
  onClose,
}: {
  customer: FlightCustomer;
  due: number;
  lines: CustomerBookingBreakdownLine[] | null;
  onClose: () => void;
}) {
  // Only the tickets that still owe make up the balance due; fully-settled
  // bookings are noise here. A tiny epsilon avoids float dust ($0.00 rows).
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
        aria-label={`Balance breakdown for ${customer.name}`}
        className="glass-panel relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/60 p-5 dark:border-white/[0.08]">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Balance due
            </div>
            <div className="mt-0.5 truncate text-lg font-bold text-slate-900 dark:text-slate-100">
              {fmtMoney(due)}
            </div>
            <div className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
              {customer.name} · made up of {owing.length}{" "}
              {owing.length === 1 ? "ticket" : "tickets"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-500/10 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Lines */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {lines === null ? (
            <div className="py-10 text-center text-sm text-slate-400">Loading…</div>
          ) : owing.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No unpaid tickets — this balance may be from a rounding adjustment.
            </div>
          ) : (
            <ul className="space-y-2">
              {owing.map((l) => (
                <li key={l.bookingId}>
                  <Link
                    href={`/flights/bookings/${l.bookingId}`}
                    className="group flex items-center gap-3 rounded-2xl border border-white/60 bg-white/40 px-3.5 py-3 transition-colors hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.1]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400">
                      <PlaneIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <span className="tabular-nums">{l.ref}</span>
                        {l.route && (
                          <span className="truncate font-normal text-slate-500 dark:text-slate-400">
                            {l.route}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {fmtDate(l.date)}
                        {l.airline ? ` · ${l.airline}` : ""}
                        {l.paid > 0.005
                          ? ` · ${fmtMoney(l.charged)} charged, ${fmtMoney(l.paid)} paid`
                          : ` · ${fmtMoney(l.charged)} charged, unpaid`}
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
            Total due{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {fmtMoney(due)}
            </span>
          </span>
          <Link
            href={`/flights/statement?customer=${customer.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700"
          >
            <StatementIcon className="h-4 w-4" />
            Full statement
          </Link>
        </div>
      </div>
    </div>
  );
}
