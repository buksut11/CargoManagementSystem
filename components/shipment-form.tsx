"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/org-context";
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
  const org = useOrg();
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
  const [attachmentUrl, setAttachmentUrl] = useState(
    shipment?.attachment_url ?? "",
  );
  const [attachmentUrl2, setAttachmentUrl2] = useState(
    shipment?.attachment_url_2 ?? "",
  );
  const [uploading, setUploading] = useState(false);
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

  async function uploadImage(
    e: React.ChangeEvent<HTMLInputElement>,
    setUrl: (url: string) => void,
  ) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setUploading(true);
    setError(null);
    // Upload the original image untouched — no re-encoding or rotation.
    // Path is prefixed with the organization id so storage RLS can scope
    // writes per-tenant: {org_id}/{shipment}/{timestamp}.{ext}
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${org?.orgId ?? "unknown"}/${shipment?.id ?? "new"}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("shipment-attachments")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }
    const { data } = supabase.storage
      .from("shipment-attachments")
      .getPublicUrl(path);
    setUrl(data.publicUrl);
    setUploading(false);
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
      attachment_url: attachmentUrl || null,
      attachment_url_2: attachmentUrl2 || null,
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
    <Card className="max-w-xl p-5 sm:p-6">
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
              className="shrink-0 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40"
            >
              Manage
            </Link>
          </div>
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        {/*
          This section is deliberately NOT wrapped in the <label>-based Field
          component. A <label> forwards clicks on any of its non-interactive
          children (like the image preview) to its first labelable control,
          which would activate the Remove button and clear the image. Here the
          only element tied to the file input is the explicit upload trigger,
          so clicking the preview does nothing unexpected.
        */}
        <div className="min-w-0">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Attachment images{" "}
            <span className="font-normal text-slate-400 dark:text-slate-500">
              (optional)
            </span>
          </span>

          {/* Two independent image slots. They stack on mobile and sit side by
              side from the sm breakpoint up, so the layout stays responsive. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AttachmentSlot
              inputId="attachment-file-1"
              url={attachmentUrl}
              uploading={uploading}
              onUpload={(e) => uploadImage(e, setAttachmentUrl)}
              onRemove={() => setAttachmentUrl("")}
            />
            <AttachmentSlot
              inputId="attachment-file-2"
              url={attachmentUrl2}
              uploading={uploading}
              onUpload={(e) => uploadImage(e, setAttachmentUrl2)}
              onRemove={() => setAttachmentUrl2("")}
            />
          </div>

          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Agents can view them but not change them.
          </p>
        </div>
        <ErrorNote message={error} />
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button
            type="submit"
            disabled={busy || uploading}
            className="w-full sm:w-auto"
          >
            {busy ? "Saving…" : shipment ? "Save changes" : "Add shipment"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/shipments")}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

// A single attachment slot: either a preview of the uploaded image (with
// Replace / Remove controls) or a dashed drop-zone to upload one. Kept as a
// standalone component so the form can render two identical slots without
// duplicating markup. min-w-0 lets it shrink inside the responsive grid.
function AttachmentSlot({
  inputId,
  url,
  uploading,
  onUpload,
  onRemove,
}: {
  inputId: string;
  url: string;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="min-w-0">
      {/* Hidden native input, driven by the styled triggers below. */}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        onChange={onUpload}
        disabled={uploading}
        className="sr-only"
      />

      {url ? (
        <figure className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Shipment attachment"
            style={{ imageOrientation: "none" }}
            className="mx-auto block h-48 w-full object-contain"
          />
          <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-slate-900/70 via-slate-900/30 to-transparent px-3 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/90">
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 text-emerald-400"
              >
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.29 6.8-6.8a1 1 0 0 1 1.4 0Z"
                  clipRule="evenodd"
                />
              </svg>
              Attached
            </span>
            <div className="pointer-events-auto flex items-center gap-2">
              <label
                htmlFor={inputId}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25 ${
                  uploading ? "pointer-events-none opacity-60" : ""
                }`}
              >
                Replace
              </label>
              <button
                type="button"
                onClick={onRemove}
                disabled={uploading}
                className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-red-600 disabled:opacity-60"
              >
                <span aria-hidden>✕</span>
                Remove
              </button>
            </div>
          </figcaption>
        </figure>
      ) : (
        <label
          htmlFor={inputId}
          className={`flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-900/30 px-6 py-8 text-center transition-colors hover:border-orange-400 hover:bg-orange-50/50 dark:hover:border-orange-500 dark:hover:bg-orange-500/5 ${
            uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M12 16V4m0 0L8 8m4-4 4 4" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
          </span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {uploading ? "Uploading…" : "Click to upload an image"}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            PNG or JPG · parcel or receipt
          </span>
        </label>
      )}
    </div>
  );
}
