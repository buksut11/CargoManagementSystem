"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FlightSupplier, SupplierType } from "@/lib/types";
import { SUPPLIER_TYPE_LABEL } from "@/lib/format";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  Select,
  Td,
  Th,
} from "@/components/ui";

export default function FlightSuppliersPage() {
  const [suppliers, setSuppliers] = useState<FlightSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState<SupplierType>("airline");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<FlightSupplier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    supabase
      .from("flight_suppliers")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (!active) return;
        setSuppliers((data as FlightSupplier[]) ?? []);
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
    const { error } = await supabase.from("flight_suppliers").insert({
      name: name.trim(),
      type,
      contact: contact.trim() || null,
    });
    setBusy(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "An airline with that name already exists."
          : error.message,
      );
      return;
    }
    setName("");
    setContact("");
    setType("airline");
    reload();
  }

  async function confirmRemove() {
    if (!pending) return;
    setDeleting(true);
    const { error } = await supabase
      .from("flight_suppliers")
      .delete()
      .eq("id", pending.id);
    setDeleting(false);
    if (error) setError(error.message);
    else reload();
    setPending(null);
  }

  return (
    <div>
      <PageHeader title="Airlines" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card className="p-4">
          <form onSubmit={add} className="space-y-3">
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Turkish Airlines"
                required
              />
            </Field>
            <Field label="Type">
              <Select
                value={type}
                onChange={(e) => setType(e.target.value as SupplierType)}
              >
                {Object.entries(SUPPLIER_TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Contact">
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Phone / email / account no."
              />
            </Field>
            <Button type="submit" disabled={busy}>
              {busy ? "Adding…" : "Add airline"}
            </Button>
            <ErrorNote message={error} />
          </form>
        </Card>
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200/60 dark:border-white/10">
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Contact</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                  <Td className="font-medium">{s.name}</Td>
                  <Td>{SUPPLIER_TYPE_LABEL[s.type] ?? s.type}</Td>
                  <Td>{s.contact ?? "—"}</Td>
                  <Td className="text-right">
                    <button
                      onClick={() => setPending(s)}
                      className="text-sm text-red-600 hover:underline dark:text-red-400"
                    >
                      Delete
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && suppliers.length === 0 && (
            <EmptyState message="No airlines yet — add the airlines you buy through." />
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!pending}
        title="Delete airline?"
        message={
          pending
            ? `Delete "${pending.name}"? Their bookings keep working but show no airline.`
            : undefined
        }
        busy={deleting}
        onConfirm={confirmRemove}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
