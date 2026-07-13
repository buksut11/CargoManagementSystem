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
  Section,
} from "@/components/ui";
import { EditIcon, PinIcon, TrashIcon } from "@/components/icons";

// A tasteful, deterministic gradient per destination so the code badges carry
// a bit of colour variety instead of a wall of identical blue.
const BADGE_GRADIENTS = [
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-sky-600",
  "from-indigo-500 to-blue-600",
];

function gradientFor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return BADGE_GRADIENTS[Math.abs(hash) % BADGE_GRADIENTS.length];
}

// The leading badge: the IATA/airport code set in mono like a boarding pass,
// or a location pin when a destination has no code yet.
function CodeBadge({ name, code }: { name: string; code: string | null }) {
  const gradient = gradientFor(code || name);
  return (
    <span
      className={`flex h-9 w-9 shrink-0 transform-gpu items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow-md shadow-black/10 ring-1 ring-white/40 transition-transform duration-300 ease-out will-change-transform group-hover:scale-105 motion-reduce:transform-none dark:ring-white/10`}
      aria-hidden
    >
      {code ? (
        <span className="font-mono text-[11px] font-bold tracking-tight">
          {code}
        </span>
      ) : (
        <PinIcon />
      )}
    </span>
  );
}

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
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200/50 px-4 py-3 dark:border-white/[0.08]">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              All destinations
            </h2>
            {destinations.length > 0 && (
              <span className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
                {destinations.length}
              </span>
            )}
          </div>

          {destinations.length > 0 && (
            <div className="grid grid-cols-1 gap-2 p-3 sm:[grid-template-columns:repeat(auto-fill,minmax(12rem,1fr))]">
              {destinations.map((d) => (
                <div
                  key={d.id}
                  className="group flex transform-gpu items-center gap-2.5 rounded-xl border border-white/60 bg-white/40 px-2.5 py-2 shadow-sm transition-[transform,box-shadow,background-color] duration-300 ease-out will-change-transform hover:-translate-y-0.5 hover:bg-white/70 hover:shadow-lg hover:shadow-black/5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
                >
                  <CodeBadge name={d.name} code={d.code ?? null} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
                      {d.name}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {d.code ? "Airport" : "No code"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 motion-reduce:transition-none">
                    <button
                      onClick={() => startEdit(d)}
                      title="Edit"
                      aria-label={`Edit ${d.name}`}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors duration-200 ease-out hover:bg-slate-500/10 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-100"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPending(d)}
                      title="Delete"
                      aria-label={`Delete ${d.name}`}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors duration-200 ease-out hover:bg-red-500/10 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
