"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Destination } from "@/lib/types";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Input,
  PageHeader,
  rowActionClass,
  rowDeleteClass,
  Section,
} from "@/components/ui";
import { EditIcon, PinIcon, TrashIcon } from "@/components/icons";

// A tasteful, deterministic gradient per destination so the leading badges
// carry a bit of colour variety instead of a wall of identical blue.
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

// The leading badge: the city's initial set like a luggage tag, tinted with a
// per-destination gradient so the grid reads as a lively board rather than rows
// of identical pins.
function InitialBadge({ name }: { name: string }) {
  const gradient = gradientFor(name);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`flex h-10 w-10 shrink-0 transform-gpu items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md shadow-black/10 ring-1 ring-white/40 transition-transform duration-300 ease-out will-change-transform group-hover:scale-105 motion-reduce:transform-none dark:ring-white/10`}
      aria-hidden
    >
      <span className="text-base font-bold leading-none">{initial}</span>
    </span>
  );
}

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, setPending] = useState<Destination | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  const formRef = useRef<HTMLDivElement>(null);

  function resetForm() {
    setEditingId(null);
    setName("");
    setCountry("");
    setError(null);
  }

  function startEdit(d: Destination) {
    setEditingId(d.id);
    setName(d.name);
    setCountry(d.country ?? "");
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    let active = true;
    supabase
      .from("destinations")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (!active) return;
        setDestinations((data as Destination[]) ?? []);
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
      country: country.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("destinations").update(payload).eq("id", editingId)
      : await supabase.from("destinations").insert(payload);
    setBusy(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "That destination already exists."
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
      .from("destinations")
      .delete()
      .eq("id", pending.id);
    setDeleting(false);
    if (error) setError(error.message);
    else {
      if (editingId === pending.id) resetForm();
      reload();
    }
    setPending(null);
  }

  return (
    <div>
      <PageHeader title="Destinations" />
      <div className="space-y-6">
      <Section
        icon={<PinIcon />}
        title={editingId ? "Edit destination" : "Add a destination"}
        subtitle="Places you ship to"
      >
        <div ref={formRef} className="-mt-2 scroll-mt-6" />
        <form onSubmit={save} className="flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              City / place
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Istanbul"
              required
            />
          </div>
          <div className="min-w-32 flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Country (optional)
            </label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. Türkiye"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : editingId ? "Save changes" : "Add"}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
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
            All destinations
          </h2>
          {destinations.length > 0 && (
            <span className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
              {destinations.length}
            </span>
          )}
        </div>

        {/* Compact list on phones, a lively card board on tablets and up. */}
        <div className="space-y-2 p-3 sm:hidden">
          {destinations.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/40 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <InitialBadge name={d.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{d.name}</div>
                {d.country && (
                  <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {d.country}
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

        {destinations.length > 0 && (
          <div className="hidden gap-2.5 p-3 sm:grid sm:[grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
            {destinations.map((d) => (
              <div
                key={d.id}
                className="group flex transform-gpu items-center gap-3 rounded-2xl border border-white/60 bg-white/40 p-3 shadow-sm transition-[transform,box-shadow,background-color] duration-300 ease-out will-change-transform hover:-translate-y-0.5 hover:bg-white/70 hover:shadow-lg hover:shadow-black/5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
              >
                <InitialBadge name={d.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
                    {d.name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    <PinIcon className="h-3 w-3 shrink-0 opacity-70" />
                    <span className="truncate">{d.country || "No country"}</span>
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
          <EmptyState message="No destinations yet — add the places you ship to." />
        )}
      </Card>
      </div>

      <ConfirmDialog
        open={!!pending}
        title="Delete destination?"
        message={
          pending
            ? `Delete "${pending.name}"? Shipments using it will show no destination.`
            : undefined
        }
        busy={deleting}
        onConfirm={confirmRemove}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
