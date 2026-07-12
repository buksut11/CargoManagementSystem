"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FlightSupplier } from "@/lib/types";
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

export default function FlightSuppliersPage() {
  const [suppliers, setSuppliers] = useState<FlightSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, setPending] = useState<FlightSupplier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  const formRef = useRef<HTMLDivElement>(null);

  function resetForm() {
    setEditingId(null);
    setName("");
    setContact("");
    setError(null);
  }

  function startEdit(s: FlightSupplier) {
    setEditingId(s.id);
    setName(s.name);
    setContact(s.contact ?? "");
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      name: name.trim(),
      type: "airline",
      contact: contact.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("flight_suppliers").update(payload).eq("id", editingId)
      : await supabase.from("flight_suppliers").insert(payload);
    setBusy(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "An airline with that name already exists."
          : error.message,
      );
      return;
    }
    resetForm();
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
          <div ref={formRef} className="scroll-mt-6" />
          <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {editingId ? "Edit airline" : "New airline"}
          </div>
          <form onSubmit={save} className="space-y-3">
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Turkish Airlines"
                required
              />
            </Field>
            <Field label="Contact">
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Phone / email / account no."
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : editingId ? "Save changes" : "Add airline"}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
            <ErrorNote message={error} />
          </form>
        </Card>
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200/60 dark:border-white/10">
              <tr>
                <Th>Name</Th>
                <Th>Contact</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                  <Td className="font-medium">{s.name}</Td>
                  <Td>{s.contact ?? "—"}</Td>
                  <Td className="text-right">
                    <span className="inline-flex items-center gap-3">
                      <button
                        onClick={() => startEdit(s)}
                        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setPending(s)}
                        className="text-sm text-red-600 hover:underline dark:text-red-400"
                      >
                        Delete
                      </button>
                    </span>
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
