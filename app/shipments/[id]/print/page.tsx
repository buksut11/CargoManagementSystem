"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Organization, Shipment } from "@/lib/types";
import {
  fmtDate,
  fmtKg,
  fmtMoney,
  shipmentRef,
  STATUS_LABEL,
} from "@/lib/format";

export default function PrintShipmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const shipmentId = Number(id);

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [org, setOrg] = useState<Pick<
    Organization,
    "name" | "logo_url" | "address" | "phone" | "email"
  > | null>(null);

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase
        .from("shipments")
        .select("*, destinations(id, name, country)")
        .eq("id", shipmentId)
        .single();
      const ship = (data as Shipment) ?? null;
      setShipment(ship);
      // The owning organization's details brand the receipt header/footer.
      if (ship?.organization_id) {
        const { data: o } = await supabase
          .from("organizations")
          .select("name, logo_url, address, phone, email")
          .eq("id", ship.organization_id)
          .single();
        setOrg(o ?? null);
      }
    }
    load();
  }, [shipmentId, router]);

  if (!shipment) {
    return <p className="p-8 text-sm text-slate-400">Loading receipt…</p>;
  }

  const destination = shipment.destinations
    ? `${shipment.destinations.name}${
        shipment.destinations.country
          ? `, ${shipment.destinations.country}`
          : ""
      }`
    : "—";

  const rows: [string, string][] = [
    ["Description", shipment.description],
    ["Destination", destination],
    ["Weight", fmtKg(Number(shipment.weight_kg))],
    [
      "Rate per kg",
      shipment.rate_per_kg != null
        ? fmtMoney(Number(shipment.rate_per_kg))
        : "—",
    ],
    ["Status", STATUS_LABEL[shipment.status]],
    ["Ship date", fmtDate(shipment.ship_date)],
  ];

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-slate-900 print:p-0">
      <div className="no-print mb-6 flex gap-3">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          🖨 Print / Save as PDF
        </button>
        <Link
          href={`/shipments/${shipment.id}`}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          ← Back to shipment
        </Link>
      </div>

      <div className="border border-slate-300 p-10">
        {/* Organization branding — centered */}
        <div className="flex flex-col items-center text-center">
          {org?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logo_url}
              alt={`${org.name} logo`}
              className="h-16 w-16 shrink-0 object-contain"
            />
          )}
          <div className="mt-2 text-2xl font-bold leading-tight">
            {org?.name ?? "📦 CargoBook"}
          </div>
          {org?.address && (
            <div className="mt-2 whitespace-pre-line text-xs text-slate-600">
              {org.address}
            </div>
          )}
          {(org?.phone || org?.email) && (
            <div className="mt-0.5 text-xs text-slate-600">
              {[org.phone, org.email].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-lg font-bold uppercase tracking-wide text-slate-800">
          Shipment receipt
        </div>

        <div className="mt-6 flex justify-end text-right">
          <div>
            <div className="text-xl font-bold">{shipmentRef(shipment.id)}</div>
            <div className="mt-1 text-sm text-slate-500">
              Created {fmtDate(shipment.created_at)}
            </div>
          </div>
        </div>

        <table className="mt-8 w-full border-collapse text-sm">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-slate-200">
                <td className="w-40 py-3 pr-4 font-bold text-slate-600">
                  {label}
                </td>
                <td className="py-3">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex items-baseline justify-end gap-4">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-2xl font-bold">
            {fmtMoney(Number(shipment.total))}
          </span>
        </div>

        {shipment.notes && (
          <p className="mt-8 border-t border-slate-200 pt-4 text-sm text-slate-600">
            {shipment.notes}
          </p>
        )}

        {shipment.attachment_url && (
          <div className="mt-8 border-t border-slate-200 pt-4">
            <div className="mb-2 text-sm font-semibold text-slate-500">
              Attachment
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shipment.attachment_url}
              alt="Shipment attachment"
              style={{ imageOrientation: "none" }}
              className="max-h-64 w-full rounded border border-slate-200 object-contain"
            />
          </div>
        )}

        <div className="mt-14 grid grid-cols-2 gap-10 text-sm text-slate-500">
          <div className="border-t border-slate-400 pt-2">Sender signature</div>
          <div className="border-t border-slate-400 pt-2">
            Receiver signature
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          Generated by {org?.name ?? "CargoBook"} ·{" "}
          {fmtDate(new Date().toISOString())}
        </p>
      </div>
    </div>
  );
}
