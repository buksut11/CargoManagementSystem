"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
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
  rowActionClass,
  rowDeleteClass,
  Section,
  Td,
  Th,
} from "@/components/ui";
import { UsersIcon } from "@/components/icons";

export default function FlightCustomersPage() {
  const [customers, setCustomers] = useState<FlightCustomer[]>([]);
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
    supabase
      .from("flight_customers")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (!active) return;
        setCustomers((data as FlightCustomer[]) ?? []);
        setLoading(false);
      });
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
        <Card className="table-scroll">
          <div className="border-b border-slate-200/60 p-3 dark:border-white/10">
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone number…"
              aria-label="Search customers by name or phone number"
            />
          </div>
          <div className="space-y-3 p-3 lg:hidden">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-slate-200/60 p-3 dark:border-white/10"
              >
                <div className="font-medium">{c.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {c.email && <span>✉️ {c.email}</span>}
                  {c.phone && <span>📞 {c.phone}</span>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/flights/customers/${c.id}/statement`}
                    className={rowActionClass}
                  >
                    Statement
                  </Link>
                  <button onClick={() => startEdit(c)} className={rowActionClass}>
                    Edit
                  </button>
                  <button onClick={() => setPending(c)} className={rowDeleteClass}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          <table className="hidden w-full lg:table">
            <thead className="border-b border-slate-200/60 dark:border-white/10">
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                  <Td className="font-medium">{c.name}</Td>
                  <Td>{c.email ?? "—"}</Td>
                  <Td>{c.phone ?? "—"}</Td>
                  <Td className="text-right">
                    <span className="inline-flex items-center gap-2">
                      <Link
                        href={`/flights/customers/${c.id}/statement`}
                        className={rowActionClass}
                      >
                        Statement
                      </Link>
                      <button onClick={() => startEdit(c)} className={rowActionClass}>
                        Edit
                      </button>
                      <button onClick={() => setPending(c)} className={rowDeleteClass}>
                        Delete
                      </button>
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
}
