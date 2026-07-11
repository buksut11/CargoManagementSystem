"use client";

import { useEffect, useState } from "react";
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
  Td,
  Th,
} from "@/components/ui";

export default function FlightCustomersPage() {
  const [customers, setCustomers] = useState<FlightCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<FlightCustomer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

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

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("flight_customers").insert({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
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
        <Card className="p-4">
          <form onSubmit={add} className="space-y-3">
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
            <Button type="submit" disabled={busy}>
              {busy ? "Adding…" : "Add customer"}
            </Button>
            <ErrorNote message={error} />
          </form>
        </Card>
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200/60 dark:border-white/10">
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                  <Td className="font-medium">{c.name}</Td>
                  <Td>{c.email ?? "—"}</Td>
                  <Td>{c.phone ?? "—"}</Td>
                  <Td className="text-right">
                    <button
                      onClick={() => setPending(c)}
                      className="text-sm text-red-600 hover:underline dark:text-red-400"
                    >
                      Delete
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && customers.length === 0 && (
            <EmptyState message="No customers yet — add the people or agencies you sell tickets to." />
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
