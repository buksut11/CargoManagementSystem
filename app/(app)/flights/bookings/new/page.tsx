"use client";

import { PageHeader } from "@/components/ui";
import { BookingForm } from "@/components/booking-form";

export default function NewBookingPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New booking" />
      <BookingForm />
    </div>
  );
}
