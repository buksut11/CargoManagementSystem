"use client";

import { PageHeader } from "@/components/ui";
import { BookingForm } from "@/components/booking-form";
import { useT } from "@/lib/i18n";

export default function NewBookingPage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("New booking")} />
      <BookingForm />
    </div>
  );
}
