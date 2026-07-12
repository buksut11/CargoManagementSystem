"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FlightDestination } from "@/lib/types";
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
import { PinIcon } from "@/components/icons";

export default function FlightDestinationsPage() {
  const [destinations, setDestinations] = useState<FlightDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, setPending] = useState<FlightDestination | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  const formRef = useRef<HTMLDivElement>(null);

  function resetForm() {
    setEditingId(null);
    setName("");
    setCode("");
    setError(null);
  }

  function startEdit(d: FlightDestination) {
    setEditingId(d.id);
    setName(d.name);
    setCode(d.code ?? "");
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    let active = true;
    supabase
      .from("flight_destinations")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (!active) return;
        setDestinations((data as FlightDestination[]) ?? []);
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
      code: code.trim().toUpperCase() || null,
    };
    const { error } = editingId
      ? await supabase
          .from("flight_destinations")
          .update(payload)
          .eq("id", editingId)
      : await supabase.from("flight_destinations").insert(payload);
    setBusy(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "A destination with that name already exists."
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
      .from("flight_destinations")
      .delete()
      .eq("id", pending.id);
    setDeleting(false);
    if (error) setError(error.message);
    else reload();
    setPending(null);
  }

  return (
    <div>
      <PageHeader title="Destinations" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Section
          icon={<PinIcon />}
          title={editingId ? "Edit destination" : "New destination"}
          subtitle="Airports or cities you fly to"
        >
          <div ref={formRef} className="-mt-2 scroll-mt-6" />
          <form onSubmit={save} className="space-y-3">
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Istanbul"
                required
              />
            </Field>
            <Field label="Code" hint="Optional IATA / airport code.">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. IST"
                maxLength={4}
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : editingId ? "Save changes" : "Add destination"}
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
            {destinations.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 p-3 dark:border-white/10"
              >
                <div className="min-w-0">
                  <div className="font-medium">{d.name}</div>
                  {d.code && (
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {d.code}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => startEdit(d)} className={rowActionClass}>
                    Edit
                  </button>
                  <button onClick={() => setPending(d)} className={rowDeleteClass}>
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
                <Th>Code</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {destinations.map((d) => (
                <tr key={d.id} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                  <Td className="font-medium">{d.name}</Td>
                  <Td>{d.code ?? "—"}</Td>
                  <Td className="text-right">
                    <span className="inline-flex items-center gap-2">
                      <button onClick={() => startEdit(d)} className={rowActionClass}>
                        Edit
                      </button>
                      <button onClick={() => setPending(d)} className={rowDeleteClass}>
                        Delete
                      </button>
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && destinations.length === 0 && (
            <EmptyState message="No destinations yet — add the airports or cities you fly to." />
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!pending}
        title="Delete destination?"
        message={
          pending
            ? `Delete "${pending.name}"? Existing bookings keep their saved itinerary.`
            : undefined
        }
        busy={deleting}
        onConfirm={confirmRemove}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
