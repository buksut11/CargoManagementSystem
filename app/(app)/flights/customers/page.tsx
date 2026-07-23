"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchCustomerBalances } from "@/lib/balance";
import type { FlightCustomer } from "@/lib/types";
import { FlightBreakdownModal } from "@/components/flight-breakdown-modal";
import { CustomerCardBoard } from "@/components/customer-card-board";
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
import { SearchIcon, UsersIcon } from "@/components/icons";
import { useT } from "@/lib/i18n";

export default function FlightCustomersPage() {
  const t = useT();
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

  // "Where does the due come from" drill-down: the customer whose breakdown
  // modal is open. The shared modal fetches and totals the lines itself.
  const [breakdownFor, setBreakdownFor] = useState<FlightCustomer | null>(null);

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
      <PageHeader title={t("Customers")} />
      <div className="space-y-6">
        <Section
          icon={<UsersIcon />}
          title={editingId ? t("Edit customer") : t("New customer")}
          subtitle={t("People or agencies you sell tickets to")}
        >
          <div ref={formRef} className="-mt-2 scroll-mt-6" />
          <form onSubmit={save} className="flex flex-wrap items-end gap-3">
            <div className="min-w-40 flex-1">
              <Field label={t("Name")}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Travel"
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
            statementHref={(c) => `/flights/statement?customer=${c.id}`}
            onShowBreakdown={setBreakdownFor}
            onEdit={startEdit}
            onDelete={setPending}
          />
          {!loading && customers.length === 0 && (
            <EmptyState message={t("No customers yet — add the people or agencies you sell tickets to.")} />
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
            ? t('Delete "{name}"? Their bookings will keep working but show no customer.', {
                name: pending.name,
              })
            : undefined
        }
        busy={deleting}
        onConfirm={confirmRemove}
        onCancel={() => setPending(null)}
      />

      {breakdownFor && (
        <FlightBreakdownModal
          customerId={breakdownFor.id}
          customerName={breakdownFor.name}
          onClose={() => setBreakdownFor(null)}
        />
      )}
    </div>
  );
}
