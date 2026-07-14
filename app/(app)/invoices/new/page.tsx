"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { CargoCustomer, Shipment } from "@/lib/types";
import { fmtKg, fmtMoney, shipmentRef } from "@/lib/format";
import {
  Button,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  Section,
  Textarea,
} from "@/components/ui";
import { DatePicker } from "@/components/date-picker";
import { BoxIcon, InvoiceIcon } from "@/components/icons";

export default function NewInvoicePage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [customers, setCustomers] = useState<CargoCustomer[]>([]);
  const [billTo, setBillTo] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
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
    supabase
      .from("cargo_customers")
      .select("*")
      .order("name")
      .then(({ data }) => setCustomers((data as CargoCustomer[]) ?? []));
  }, []);

  // Whether the typed name already exists — drives the contact prefill and the
  // "existing vs new" hint. Matched case-insensitively on the trimmed name.
  const matchedCustomer =
    customers.find(
      (c) => c.name.toLowerCase() === billTo.trim().toLowerCase(),
    ) ?? null;

  // Picking (or typing) an existing customer's exact name fills in their saved
  // contact details, so an invoice for a repeat customer needs no re-typing.
  function onBillToChange(value: string) {
    setBillTo(value);
    const match = customers.find(
      (c) => c.name.toLowerCase() === value.trim().toLowerCase(),
    );
    if (match) {
      setPhone(match.phone ?? "");
      setAddress(match.address ?? "");
    }
  }

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

    // Resolve the free-text bill-to into a durable customer record so the
    // statement of account can group every invoice for the same customer.
    // Find-or-create by (org, name): upsert returns the existing row on a name
    // clash. bill_to stays on the invoice as a point-in-time snapshot.
    let customerId: number | null = null;
    const customerName = billTo.trim();
    if (customerName) {
      const { data: cust, error: custError } = await supabase
        .from("cargo_customers")
        .upsert(
          {
            name: customerName,
            phone: phone.trim() || null,
            address: address.trim() || null,
          },
          { onConflict: "organization_id,name" },
        )
        .select("id")
        .single();
      if (custError) {
        setBusy(false);
        setError(custError.message);
        return;
      }
      customerId = cust?.id ?? null;
    }

    const { data: inv, error: invError } = await supabase
      .from("invoices")
      .insert({
        customer_id: customerId,
        bill_to: customerName,
        phone: phone.trim() || null,
        address: address.trim() || null,
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
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New invoice" />
      <form onSubmit={create} className="space-y-4">
        <Section
          icon={<InvoiceIcon />}
          title="Bill to"
          subtitle="Who this invoice is for"
        >
          <div className="space-y-4">
            <Field
              label="Bill to"
              hint="Pick a saved customer or type a new name."
            >
              <Input
                value={billTo}
                onChange={(e) => onBillToChange(e.target.value)}
                placeholder="e.g. Ali Trading Co."
                list="cargo-customers"
                autoComplete="off"
                required
                autoFocus
              />
              <datalist id="cargo-customers">
                {customers.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
              {billTo.trim() && (
                <p
                  className={`mt-1.5 text-xs ${
                    matchedCustomer
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {matchedCustomer
                    ? "✓ Existing customer — details filled in."
                    : "New customer — will be added to your customer list."}
                </p>
              )}
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Phone (optional)">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +90 555 123 4567"
                />
              </Field>
              <Field label="Issue date">
                <DatePicker value={issuedDate} onChange={setIssuedDate} required />
              </Field>
            </div>
            <Field label="Address (optional)">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Kadıköy, İstanbul"
              />
            </Field>
            <Field label="Notes (optional)">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Shown at the bottom of the printed invoice."
              />
            </Field>
          </div>
        </Section>

        <Section
          icon={<BoxIcon />}
          title="Shipments to include"
          subtitle="Uninvoiced shipments only"
        >
          {shipments.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              All shipments are already invoiced — add a new shipment first.
            </p>
          ) : (
            <div className="space-y-2">
              {shipments.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200/60 dark:border-white/10 px-3 py-2 hover:bg-white/60 dark:hover:bg-white/[0.08]"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="h-4 w-4 accent-blue-600"
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
          <div className="mt-4 flex justify-end border-t border-slate-200/60 dark:border-white/10 pt-3 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Invoice total:&nbsp;</span>
            <span className="font-bold">{fmtMoney(total)}</span>
          </div>
        </Section>

        <ErrorNote message={error} />
        <div className="glass-panel sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {selected.size} selected · Total{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {fmtMoney(total)}
            </span>
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/invoices")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create invoice"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
