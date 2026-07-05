"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Destination, Shipment, ShipmentStatus } from "@/lib/types";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

export function ShipmentForm({ shipment }: { shipment?: Shipment }) {
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [description, setDescription] = useState(shipment?.description ?? "");
  const [destinationId, setDestinationId] = useState(
    shipment?.destination_id ? String(shipment.destination_id) : "",
  );
  const [weightKg, setWeightKg] = useState(
    shipment ? String(shipment.weight_kg) : "",
  );
  const [ratePerKg, setRatePerKg] = useState(
    shipment?.rate_per_kg != null ? String(shipment.rate_per_kg) : "",
  );
  const [total, setTotal] = useState(shipment ? String(shipment.total) : "");
  const [status, setStatus] = useState<ShipmentStatus>(
    shipment?.status ?? "pending",
  );
  const [shipDate, setShipDate] = useState(shipment?.ship_date ?? "");
  const [notes, setNotes] = useState(shipment?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("destinations")
      .select("*")
      .order("name")
      .then(({ data }) => setDestinations((data as Destination[]) ?? []));
  }, []);

  // When a rate is given, the total is computed from weight × rate.
  function recompute(nextWeight: string, nextRate: string) {
    const w = parseFloat(nextWeight);
    const r = parseFloat(nextRate);
    if (!isNaN(w) && !isNaN(r)) {
      setTotal((w * r).toFixed(2));
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const row = {
      description: description.trim(),
      destination_id: destinationId ? Number(destinationId) : null,
      weight_kg: parseFloat(weightKg),
      rate_per_kg: ratePerKg === "" ? null : parseFloat(ratePerKg),
      total: total === "" ? 0 : parseFloat(total),
      status,
      ship_date: shipDate || null,
      notes: notes.trim() || null,
    };
    const { error } = shipment
      ? await supabase.from("shipments").update(row).eq("id", shipment.id)
      : await supabase.from("shipments").insert(row);
    setBusy(false);
    if (error) {
      setError(error.message);
    } else {
      router.push("/shipments");
      router.refresh();
    }
  }

  return (
    <Card className="max-w-xl p-6">
      <form onSubmit={save} className="space-y-4">
        <Field label="Description">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 3 boxes of spare parts"
            required
            autoFocus
          />
        </Field>
        <Field
          label="Destination"
          hint={
            destinations.length === 0
              ? "No destinations yet — add them on the Destinations page."
              : undefined
          }
        >
          <div className="flex gap-2">
            <Select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
            >
              <option value="">— none —</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.country ? ` (${d.country})` : ""}
                </option>
              ))}
            </Select>
            <Link
              href="/destinations"
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Manage
            </Link>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Weight (kg)">
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={weightKg}
              onChange={(e) => {
                setWeightKg(e.target.value);
                recompute(e.target.value, ratePerKg);
              }}
              required
            />
          </Field>
          <Field label="Rate per kg (optional)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={ratePerKg}
              onChange={(e) => {
                setRatePerKg(e.target.value);
                recompute(weightKg, e.target.value);
              }}
              placeholder="leave empty to type total"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Total price"
            hint={ratePerKg !== "" ? "Computed from weight × rate." : undefined}
          >
            <Input
              type="number"
              step="0.01"
              min="0"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              readOnly={ratePerKg !== ""}
              required
            />
          </Field>
          <Field label="Ship date">
            <Input
              type="date"
              value={shipDate}
              onChange={(e) => setShipDate(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Status">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as ShipmentStatus)}
          >
            <option value="pending">Pending</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </Select>
        </Field>
        <Field
          label="Notes (optional)"
          hint="Shown on the printed shipment receipt."
        >
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. fragile — handle with care"
          />
        </Field>
        <ErrorNote message={error} />
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : shipment ? "Save changes" : "Add shipment"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/shipments")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
