"use client";

import { PageHeader } from "@/components/ui";
import { ShipmentForm } from "@/components/shipment-form";

export default function NewShipmentPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="New shipment" />
      <ShipmentForm />
    </div>
  );
}
