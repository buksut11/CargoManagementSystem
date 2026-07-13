"use client";

import { useEffect, useState } from "react";
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
  rowDeleteClass,
  Section,
  Td,
  Th,
} from "@/components/ui";
import { PinIcon } from "@/components/icons";

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Destination | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

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

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("destinations").insert({
      name: name.trim(),
      country: country.trim() || null,
    });
    setBusy(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "That destination already exists."
          : error.message,
      );
      return;
    }
    setName("");
    setCountry("");
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
    else reload();
    setPending(null);
  }

  return (
    <div>
      <PageHeader title="Destinations" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <Section
        icon={<PinIcon />}
        title="Add a destination"
        subtitle="Places you ship to"
      >
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
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
          <Button type="submit" disabled={busy}>
            Add
          </Button>
        </form>
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      </Section>
      <Card className="table-scroll">
        <div className="space-y-3 p-3 lg:hidden">
          {destinations.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/60 bg-white/40 p-4 shadow-sm dark:bg-white/[0.04] dark:border-white/10"
            >
              <div className="min-w-0">
                <div className="font-medium">{d.name}</div>
                {d.country && (
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {d.country}
                  </div>
                )}
              </div>
              <button
                onClick={() => setPending(d)}
                className={`${rowDeleteClass} shrink-0`}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <table className="hidden w-full lg:table">
          <thead className="border-b border-slate-200/60 dark:border-white/10">
            <tr>
              <Th>Name</Th>
              <Th>Country</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
            {destinations.map((d) => (
              <tr key={d.id} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                <Td className="font-medium">{d.name}</Td>
                <Td>{d.country ?? "—"}</Td>
                <Td className="text-right">
                  <button onClick={() => setPending(d)} className={rowDeleteClass}>
                    Delete
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
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
