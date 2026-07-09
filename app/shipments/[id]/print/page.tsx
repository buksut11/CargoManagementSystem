"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Shipment } from "@/lib/types";
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
      setShipment((data as Shipment) ?? null);
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
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold">📦 CargoBook</div>
            <div className="mt-1 text-sm text-slate-500">Shipment receipt</div>
          </div>
          <div className="text-right">
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
                <td className="w-40 py-3 pr-4 font-semibold text-slate-500">
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

        {(shipment.attachment_url || shipment.attachment_url_2) && (
          <div className="mt-8 border-t border-slate-200 pt-4">
            <div className="mb-2 text-sm font-semibold text-slate-500">
              Attachments
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[shipment.attachment_url, shipment.attachment_url_2]
                .filter((url): url is string => !!url)
                .map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt="Shipment attachment"
                    style={{ imageOrientation: "none" }}
                    className="max-h-64 w-full rounded border border-slate-200 object-contain"
                  />
                ))}
            </div>
          </div>
        )}

        <div className="mt-14 grid grid-cols-2 gap-10 text-sm text-slate-500">
          <div className="border-t border-slate-400 pt-2">Sender signature</div>
          <div className="border-t border-slate-400 pt-2">
            Receiver signature
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          Generated by CargoBook · {fmtDate(new Date().toISOString())}
        </p>
      </div>
    </div>
  );
}
