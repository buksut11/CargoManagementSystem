"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Shipment } from "@/lib/types";
import { fmtKg, fmtMoney, shipmentRef } from "@/lib/format";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui";

export default function NewInvoicePage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [billTo, setBillTo] = useState("");
  const [issuedDate, setIssuedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("shipments")
      .select("*, destinations(id, name, country)")
      .is("invoice_id", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => setShipments((data as Shipment[]) ?? []));
  }, []);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const total = shipments
    .filter((s) => selected.has(s.id))
    .reduce((sum, s) => sum + Number(s.total), 0);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) {
      setError("Select at least one shipment to invoice.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data: inv, error: invError } = await supabase
      .from("invoices")
      .insert({
        bill_to: billTo.trim(),
        issued_date: issuedDate,
        notes: notes.trim() || null,
      })
      .select()
      .single();
    if (invError || !inv) {
      setBusy(false);
      setError(invError?.message ?? "Could not create invoice.");
      return;
    }
    const { error: linkError } = await supabase
      .from("shipments")
      .update({ invoice_id: inv.id })
      .in("id", Array.from(selected));
    setBusy(false);
    if (linkError) {
      setError(linkError.message);
      return;
    }
    router.push(`/invoices/${inv.id}`);
  }

  return (
    <div>
      <PageHeader title="New invoice" />
      <form onSubmit={create} className="max-w-2xl space-y-6">
        <Card className="p-6">
          <div className="space-y-4">
            <Field label="Bill to" hint="Name of the person or company paying.">
              <Input
                value={billTo}
                onChange={(e) => setBillTo(e.target.value)}
                placeholder="e.g. Ali Trading Co."
                required
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Issue date">
                <Input
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  required
                />
              </Field>
            </div>
            <Field label="Notes (optional)">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Shown at the bottom of the printed invoice."
              />
            </Field>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-3 font-semibold">
            Shipments to include{" "}
            <span className="font-normal text-slate-500 dark:text-slate-400">
              (uninvoiced only)
            </span>
          </h2>
          {shipments.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              All shipments are already invoiced — add a new shipment first.
            </p>
          ) : (
            <div className="space-y-2">
              {shipments.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="h-4 w-4 accent-orange-600"
                  />
                  <span className="flex-1 text-sm">
                    <span className="font-medium">{shipmentRef(s.id)}</span> —{" "}
                    {s.description}
                    {s.destinations?.name ? ` → ${s.destinations.name}` : ""}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {fmtKg(Number(s.weight_kg))}
                  </span>
                  <span className="w-24 text-right text-sm font-medium">
                    {fmtMoney(Number(s.total))}
                  </span>
                </label>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end border-t border-slate-200 dark:border-slate-700 pt-3 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Invoice total:&nbsp;</span>
            <span className="font-bold">{fmtMoney(total)}</span>
          </div>
        </Card>

        <ErrorNote message={error} />
        <div className="flex gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create invoice"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/invoices")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
