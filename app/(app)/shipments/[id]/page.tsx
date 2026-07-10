"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Shipment, ShipmentStatus } from "@/lib/types";
import {
  fmtDate,
  fmtKg,
  fmtMoney,
  invoiceRef,
  shipmentRef,
  STATUS_CLASS,
  STATUS_LABEL,
} from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorNote,
  Field,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { ShipmentForm } from "@/components/shipment-form";
import { ShipmentExpenses } from "@/components/shipment-expenses";
import { useRole } from "@/components/role-context";
import Link from "next/link";

// Agents see the shipment read-only and may only change its status and notes.
function AgentShipmentView({ shipment }: { shipment: Shipment }) {
  const router = useRouter();
  const [status, setStatus] = useState<ShipmentStatus>(shipment.status);
  const [notes, setNotes] = useState(shipment.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [payment, setPayment] = useState<{
    total: number;
    paid: number;
  } | null>(null);

  // Sum the invoice's total, amount paid and outstanding balance so agents can
  // see the full payment picture. An invoice can carry several shipments, so
  // sum every shipment on it against the payments recorded for it (agents may
  // read payments — migration 0020).
  useEffect(() => {
    const invoiceId = shipment.invoice_id;
    let cancelled = false;
    async function load() {
      if (invoiceId == null) {
        if (!cancelled) setPayment(null);
        return;
      }
      const [s, p] = await Promise.all([
        supabase.from("shipments").select("total").eq("invoice_id", invoiceId),
        supabase.from("payments").select("amount").eq("invoice_id", invoiceId),
      ]);
      if (cancelled) return;
      const total = ((s.data as { total: number }[]) ?? []).reduce(
        (sum, r) => sum + Number(r.total),
        0,
      );
      const paid = ((p.data as { amount: number }[]) ?? []).reduce(
        (sum, r) => sum + Number(r.amount),
        0,
      );
      setPayment({ total, paid });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [shipment.invoice_id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const { error } = await supabase
      .from("shipments")
      .update({ status, notes: notes.trim() || null })
      .eq("id", shipment.id);
    setBusy(false);
    if (error) setError(error.message);
    else setSaved(true);
  }

  const rows: [string, React.ReactNode][] = [
    ["Description", shipment.description],
    ["Bill to", shipment.invoices?.bill_to || "—"],
    ["Phone", shipment.invoices?.phone || "—"],
    ["Address", shipment.invoices?.address || "—"],
    ["Destination", shipment.destinations?.name ?? "—"],
    ["Weight", fmtKg(Number(shipment.weight_kg))],
    ["Total price", fmtMoney(Number(shipment.total))],
  ];

  if (shipment.invoice_id == null) {
    rows.push([
      "Payment",
      <span key="not-invoiced" className="text-slate-400">
        Not invoiced
      </span>,
    ]);
  }

  // Invoice totals shown to the agent when the shipment is invoiced: the full
  // invoice total, how much has been paid and the outstanding balance.
  if (shipment.invoice_id != null && payment) {
    rows.push(
      ["Invoice total", fmtMoney(payment.total)],
      ["Paid", fmtMoney(payment.paid)],
      [
        "Balance",
        <span
          key="balance"
          className={
            payment.total - payment.paid > 0
              ? "font-medium text-amber-600 dark:text-amber-400"
              : "font-medium text-emerald-600 dark:text-emerald-400"
          }
        >
          {fmtMoney(Math.max(payment.total - payment.paid, 0))}
        </span>,
      ],
    );
  }

  rows.push(["Ship date", fmtDate(shipment.ship_date)]);

  return (
    <div>
      <PageHeader
        title={shipmentRef(shipment.id)}
        action={
          <Badge className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</Badge>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <dl className="space-y-3">
            {rows.map(([label, value]) => (
              <div key={label} className="flex gap-3 text-sm">
                <dt className="w-28 shrink-0 font-medium text-slate-500 dark:text-slate-400">
                  {label}
                </dt>
                <dd className="min-w-0">{value}</dd>
              </div>
            ))}
          </dl>
          {(shipment.attachment_url || shipment.attachment_url_2) && (
            <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
              <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                Attachments
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[shipment.attachment_url, shipment.attachment_url_2]
                  .filter((url): url is string => !!url)
                  .map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Shipment attachment"
                        style={{ imageOrientation: "none" }}
                        className="max-h-64 w-full rounded-lg border border-slate-200 dark:border-slate-700 object-contain"
                      />
                    </a>
                  ))}
              </div>
            </div>
          )}
        </Card>
        <Card className="p-6">
          <form onSubmit={save} className="space-y-3">
            <Field label="Update status">
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as ShipmentStatus);
                  setSaved(false);
                }}
              >
                <option value="pending">Pending</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </Select>
            </Field>
            <Field label="Notes">
              <Textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setSaved(false);
                }}
                placeholder="Add a note about this shipment…"
              />
            </Field>
            <ErrorNote message={error} />
            {saved && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                Saved.
              </p>
            )}
            <div className="flex gap-3">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/shipments")}
              >
                Back
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function EditShipmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const role = useRole();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Both admins and agents read the shipment (with destination + invoice
    // info). Agents can view the details but the database still lets them
    // change only the status and notes.
    async function load() {
      const { data } = await supabase
        .from("shipments")
        .select(
          "*, destinations(id, name, country), invoices(id, bill_to, phone, address)",
        )
        .eq("id", Number(id))
        .single();
      if (data) setShipment(data as Shipment);
      else setNotFound(true);
    }
    load();
  }, [id, role]);

  async function confirmRemove() {
    if (!shipment) return;
    setDeleting(true);
    await supabase.from("shipments").delete().eq("id", shipment.id);
    router.push("/shipments");
  }

  if (notFound) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Shipment not found.</p>;
  }
  if (!shipment) {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  if (role === "agent") {
    return <AgentShipmentView shipment={shipment} />;
  }

  return (
    <div>
      <PageHeader
        title={`Edit ${shipmentRef(shipment.id)}`}
        action={
          <div className="flex gap-2">
            <Link
              href={`/shipments/${shipment.id}/print`}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
            >
              🖨 Print receipt
            </Link>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Delete
            </Button>
          </div>
        }
      />
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${shipmentRef(shipment.id)}?`}
        message="This permanently removes the shipment. This cannot be undone."
        busy={deleting}
        onConfirm={confirmRemove}
        onCancel={() => setConfirmOpen(false)}
      />
      {shipment.invoice_id && (
        <p className="mb-4 max-w-xl rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-3 py-2 text-sm text-blue-800 dark:text-blue-300">
          This shipment is on{" "}
          <Link
            href={`/invoices/${shipment.invoice_id}`}
            className="font-medium underline"
          >
            {invoiceRef(shipment.invoice_id)}
          </Link>
          . Changing its total will change that invoice&apos;s balance.
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <ShipmentForm shipment={shipment} />
        <ShipmentExpenses shipment={shipment} />
      </div>
    </div>
  );
}
