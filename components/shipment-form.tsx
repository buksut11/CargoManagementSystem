"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSignedAttachment } from "@/lib/storage";
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
import { DatePicker } from "@/components/date-picker";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // attachmentUrl is the canonical value saved to the row; the preview is shown
  // through a signed URL so it still loads once the bucket is private.
  const attachmentPreview = useSignedAttachment(attachmentUrl);

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
              className="shrink-0 rounded-full border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/[0.05] px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/[0.08]"
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
            <DatePicker value={shipDate} onChange={setShipDate} />
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
            Attachment image{" "}
            <span className="font-normal text-slate-400 dark:text-slate-500">
              (optional)
            </span>
          </span>

          <AttachmentSlot
            inputId="attachment-file"
            url={attachmentUrl ? attachmentPreview ?? "" : ""}
            uploading={uploading}
            onUpload={(e) => uploadImage(e, setAttachmentUrl)}
            onRemove={() => setAttachmentUrl("")}
          />

          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Agents can view it but not change it.
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

// The attachment slot: either a preview of the uploaded image (with Replace /
// Remove controls) or a dashed drop-zone to upload one. min-w-0 lets it shrink
// inside its container.
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
        <figure className="group relative overflow-hidden rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-100 dark:bg-slate-900/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Shipment attachment"
            style={{ imageOrientation: "none" }}
            className="mx-auto block h-48 w-full object-contain"
          />
          <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-end gap-2 bg-gradient-to-t from-slate-900/70 via-slate-900/30 to-transparent px-2.5 py-2.5">
            <label
              htmlFor={inputId}
              className={`pointer-events-auto inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25 ${
                uploading ? "pointer-events-none opacity-60" : ""
              }`}
            >
              Replace
            </label>
            <button
              type="button"
              onClick={onRemove}
              disabled={uploading}
              className="pointer-events-auto inline-flex items-center justify-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-red-600 disabled:opacity-60"
            >
              <span aria-hidden>✕</span>
              Remove
            </button>
          </figcaption>
        </figure>
      ) : (
        <label
          htmlFor={inputId}
          className={`flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300/80 dark:border-white/15 bg-white/35 dark:bg-white/[0.04] px-6 py-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/50 dark:hover:border-blue-500 dark:hover:bg-blue-500/5 ${
            uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
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
