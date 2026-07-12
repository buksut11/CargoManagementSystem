"use client";

import { useEffect, useState } from "react";
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
  Td,
  Th,
} from "@/components/ui";

export default function FlightDestinationsPage() {
  const [destinations, setDestinations] = useState<FlightDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<FlightDestination | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

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

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("flight_destinations").insert({
      name: name.trim(),
      code: code.trim().toUpperCase() || null,
    });
    setBusy(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "A destination with that name already exists."
          : error.message,
      );
      return;
    }
    setName("");
    setCode("");
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
        <Card className="p-4">
          <form onSubmit={add} className="space-y-3">
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
            <Button type="submit" disabled={busy}>
              {busy ? "Adding…" : "Add destination"}
            </Button>
            <ErrorNote message={error} />
          </form>
        </Card>
        <Card className="overflow-x-auto">
          <table className="w-full">
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
                    <button
                      onClick={() => setPending(d)}
                      className="text-sm text-red-600 hover:underline dark:text-red-400"
                    >
                      Delete
                    </button>
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
