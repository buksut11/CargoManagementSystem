"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Shipment } from "@/lib/types";
import { invoiceRef, shipmentRef } from "@/lib/format";
import { Button, PageHeader } from "@/components/ui";
import { ShipmentForm } from "@/components/shipment-form";
import Link from "next/link";

export default function EditShipmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("shipments")
      .select("*")
      .eq("id", Number(id))
      .single()
      .then(({ data }) => {
        if (data) setShipment(data as Shipment);
        else setNotFound(true);
      });
  }, [id]);

  async function remove() {
    if (!shipment) return;
    if (!confirm(`Delete ${shipmentRef(shipment.id)}? This cannot be undone.`))
      return;
    await supabase.from("shipments").delete().eq("id", shipment.id);
    router.push("/shipments");
  }

  if (notFound) {
    return <p className="text-sm text-slate-500">Shipment not found.</p>;
  }
  if (!shipment) {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  return (
    <div>
      <PageHeader
        title={`Edit ${shipmentRef(shipment.id)}`}
        action={
          <Button variant="danger" onClick={remove}>
            Delete
          </Button>
        }
      />
      {shipment.invoice_id && (
        <p className="mb-4 max-w-xl rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
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
      <ShipmentForm shipment={shipment} />
    </div>
  );
}
