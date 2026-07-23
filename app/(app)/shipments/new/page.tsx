"use client";

import { PageHeader } from "@/components/ui";
import { ShipmentForm } from "@/components/shipment-form";
import { useT } from "@/lib/i18n";

export default function NewShipmentPage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("New shipment")} />
      <ShipmentForm />
    </div>
  );
}
