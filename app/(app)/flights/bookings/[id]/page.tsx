"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type {
  FlightBooking,
  FlightPassenger,
  FlightSegment,
} from "@/lib/types";
import {
  bookingRef,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  FLIGHT_STATUS_CLASS,
  FLIGHT_STATUS_LABEL,
  TRIP_TYPE_LABEL,
} from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  PageHeader,
} from "@/components/ui";
import { BookingForm } from "@/components/booking-form";
import { BookingLedger } from "@/components/booking-ledger";
import { useRole } from "@/components/role-context";

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const role = useRole();
  const [booking, setBooking] = useState<FlightBooking | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase
      .from("flight_bookings")
      .select("*, flight_customers(id, name, phone, email), flight_suppliers(id, name, type)")
      .eq("id", Number(id))
      .single()
      .then(({ data }) => {
        if (data) setBooking(data as FlightBooking);
        else setNotFound(true);
      });
  }, [id]);

  async function confirmRemove() {
    if (!booking) return;
    setDeleting(true);
    await supabase.from("flight_bookings").delete().eq("id", booking.id);
    router.push("/flights/bookings");
  }

  if (notFound) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Booking not found.
      </p>
    );
  }
  if (!booking) {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  if (role === "agent") {
    return <AgentBookingView booking={booking} />;
  }

  return (
    <div>
      <PageHeader
        title={`Edit ${bookingRef(booking.id)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Badge className={FLIGHT_STATUS_CLASS[booking.status]}>
              {FLIGHT_STATUS_LABEL[booking.status]}
            </Badge>
            <Link
              href={`/flights/bookings/${booking.id}/print`}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
            >
              🖨 Invoice
            </Link>
            {booking.customer_id && (
              <Link
                href={`/flights/customers/${booking.customer_id}/statement`}
                className="rounded-full border border-white/60 bg-white/35 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.1]"
              >
                📄 Statement
              </Link>
            )}
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Delete
            </Button>
          </div>
        }
      />
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${bookingRef(booking.id)}?`}
        message="This permanently removes the booking and its passengers, itinerary, receipts, payments and refunds. This cannot be undone."
        busy={deleting}
        onConfirm={confirmRemove}
        onCancel={() => setConfirmOpen(false)}
      />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <BookingForm booking={booking} />
        <BookingLedger booking={booking} />
      </div>
    </div>
  );
}

// Agents see the booking read-only, without the cost/profit or the money ledger
// (the ledger tables are editor-only at the database level anyway).
function AgentBookingView({ booking }: { booking: FlightBooking }) {
  const [passengers, setPassengers] = useState<FlightPassenger[]>([]);
  const [segments, setSegments] = useState<FlightSegment[]>([]);

  useEffect(() => {
    Promise.all([
      supabase
        .from("flight_passengers")
        .select("*")
        .eq("booking_id", booking.id)
        .order("id"),
      supabase
        .from("flight_segments")
        .select("*")
        .eq("booking_id", booking.id)
        .order("segment_no"),
    ]).then(([p, s]) => {
      setPassengers((p.data as FlightPassenger[]) ?? []);
      setSegments((s.data as FlightSegment[]) ?? []);
    });
  }, [booking.id]);

  const rows: [string, React.ReactNode][] = [
    ["PNR", booking.pnr || "—"],
    ["Booking ref", booking.booking_ref || "—"],
    ["Airline", booking.airline || booking.flight_suppliers?.name || "—"],
    ["Customer", booking.flight_customers?.name ?? "—"],
    ["Trip type", TRIP_TYPE_LABEL[booking.trip_type]],
    ["Booking date", fmtDate(booking.booking_date)],
    ["Travel date", fmtDate(booking.travel_date)],
    ["Price", fmtMoney(Number(booking.sale_total))],
  ];

  return (
    <div>
      <PageHeader
        title={bookingRef(booking.id)}
        action={
          <Badge className={FLIGHT_STATUS_CLASS[booking.status]}>
            {FLIGHT_STATUS_LABEL[booking.status]}
          </Badge>
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
        </Card>
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Flights
            </h2>
            {segments.length === 0 ? (
              <p className="text-sm text-slate-400">No segments.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {segments.map((s) => (
                  <li key={s.id} className="rounded-lg border border-slate-200/60 p-2 dark:border-white/10">
                    <div className="font-medium">
                      {s.origin ?? "?"} → {s.destination ?? "?"}
                      {s.flight_number ? ` · ${s.airline ?? ""} ${s.flight_number}` : ""}
                    </div>
                    {s.departure_at && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {fmtDateTime(s.departure_at)}
                        {s.cabin_class ? ` · ${s.cabin_class}` : ""}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Passengers
            </h2>
            {passengers.length === 0 ? (
              <p className="text-sm text-slate-400">No passengers.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {passengers.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>
                      {p.full_name}{" "}
                      <span className="text-xs text-slate-400 capitalize">({p.type})</span>
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {fmtMoney(Number(p.sale_amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
