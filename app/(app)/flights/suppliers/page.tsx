"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  rowActionClass,
  rowDeleteClass,
  Section,
  Td,
  Th,
} from "@/components/ui";
import { BuildingIcon, StatementIcon } from "@/components/icons";

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
        <Section
          icon={<BuildingIcon />}
          title={editingId ? "Edit airline" : "New airline"}
          subtitle="Airlines you buy tickets through"
        >
          <div ref={formRef} className="-mt-2 scroll-mt-6" />
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
        </Section>
        <Card className="table-scroll">
          <div className="space-y-3 p-3 lg:hidden">
            {suppliers.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-slate-200/60 bg-white/40 p-4 shadow-sm dark:bg-white/[0.04] dark:border-white/10"
              >
                <div className="font-medium">{s.name}</div>
                {s.contact && (
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {s.contact}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <Link
                    href={`/flights/supplier-statement?supplier=${s.id}`}
                    className={rowActionClass}
                  >
                    Statement
                  </Link>
                  <button onClick={() => startEdit(s)} className={rowActionClass}>
                    Edit
                  </button>
                  <button onClick={() => setPending(s)} className={rowDeleteClass}>
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
                    <span className="inline-flex items-center gap-2">
                      <Link
                        href={`/flights/supplier-statement?supplier=${s.id}`}
                        title="View statement"
                        aria-label={`View ${s.name} statement`}
                        className={`${rowActionClass} inline-flex items-center gap-1.5`}
                      >
                        <StatementIcon className="h-4 w-4" />
                        Statement
                      </Link>
                      <button onClick={() => startEdit(s)} className={rowActionClass}>
                        Edit
                      </button>
                      <button onClick={() => setPending(s)} className={rowDeleteClass}>
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
