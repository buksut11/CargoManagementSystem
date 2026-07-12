"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type {
  FlightBooking,
  FlightPassenger,
  FlightSegment,
  Organization,
} from "@/lib/types";
import {
  bookingRef,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  FLIGHT_STATUS_LABEL,
  TRIP_TYPE_LABEL,
} from "@/lib/format";

export default function PrintBookingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bookingId = Number(id);

  const [booking, setBooking] = useState<FlightBooking | null>(null);
  const [passengers, setPassengers] = useState<FlightPassenger[]>([]);
  const [segments, setSegments] = useState<FlightSegment[]>([]);
  const [received, setReceived] = useState(0);
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
        .from("flight_bookings")
        .select("*, flight_customers(id, name, phone, email)")
        .eq("id", bookingId)
        .single();
      const bk = (data as FlightBooking) ?? null;
      setBooking(bk);
      if (!bk) return;

      const [p, s, pay, o] = await Promise.all([
        supabase.from("flight_passengers").select("*").eq("booking_id", bookingId).order("id"),
        supabase.from("flight_segments").select("*").eq("booking_id", bookingId).order("segment_no"),
        supabase.from("booking_payments").select("amount").eq("booking_id", bookingId),
        bk.organization_id
          ? supabase
              .from("organizations")
              .select("name, logo_url, address, phone, email")
              .eq("id", bk.organization_id)
              .single()
          : Promise.resolve({ data: null }),
      ]);
      setPassengers((p.data as FlightPassenger[]) ?? []);
      setSegments((s.data as FlightSegment[]) ?? []);
      setReceived(
        ((pay.data as { amount: number }[]) ?? []).reduce(
          (sum, r) => sum + Number(r.amount),
          0,
        ),
      );
      setOrg((o.data as typeof org) ?? null);
    }
    load();
  }, [bookingId, router]);

  if (!booking) {
    return <p className="p-8 text-sm text-slate-400">Loading…</p>;
  }

  const saleTotal = Number(booking.sale_total);
  const balance = Math.max(0, saleTotal - received);

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-slate-900 print:p-0">
      <div className="no-print mb-6 flex gap-3">
        <button
          onClick={() => window.print()}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
        >
          🖨 Print / Save as PDF
        </button>
        <Link
          href={`/flights/bookings/${booking.id}`}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          ← Back to booking
        </Link>
      </div>

      <div className="border border-slate-300 p-10">
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
            {org?.name ?? "✈️ CargoBook"}
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
          Ticket invoice
        </div>

        <div className="mt-6 flex justify-between">
          <div className="text-sm text-slate-600">
            {booking.flight_customers?.name && (
              <>
                <div className="font-semibold text-slate-800">Bill to</div>
                <div>{booking.flight_customers.name}</div>
                {booking.flight_customers.phone && (
                  <div>{booking.flight_customers.phone}</div>
                )}
                {booking.flight_customers.email && (
                  <div>{booking.flight_customers.email}</div>
                )}
              </>
            )}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">{bookingRef(booking.id)}</div>
            {booking.pnr && (
              <div className="mt-1 text-sm text-slate-500">PNR {booking.pnr}</div>
            )}
            <div className="mt-1 text-sm text-slate-500">
              {fmtDate(booking.booking_date)}
            </div>
          </div>
        </div>

        {/* Itinerary */}
        {segments.length > 0 && (
          <table className="mt-8 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
                <th className="py-2 pr-2">Flight</th>
                <th className="py-2 pr-2">Route</th>
                <th className="py-2 pr-2">Departs</th>
                <th className="py-2">Classes</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s) => (
                <tr key={s.id} className="border-b border-slate-200">
                  <td className="py-2 pr-2">
                    {[s.airline, s.flight_number].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="py-2 pr-2">
                    {(s.origin ?? "?") + " → " + (s.destination ?? "?")}
                  </td>
                  <td className="py-2 pr-2">
                    {s.departure_at ? fmtDateTime(s.departure_at) : "—"}
                  </td>
                  <td className="py-2">{s.cabin_class ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Passengers */}
        {passengers.length > 0 && (
          <div className="mt-6 text-sm">
            <div className="mb-1 font-semibold text-slate-800">Passengers</div>
            <ul className="text-slate-700">
              {passengers.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>
                    {p.full_name}
                    <span className="text-slate-400 capitalize"> ({p.type})</span>
                  </span>
                  <span>{fmtMoney(Number(p.sale_amount))}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Fare summary */}
        <table className="mt-8 w-full border-collapse text-sm">
          <tbody>
            <FareRow label="Trip type" value={TRIP_TYPE_LABEL[booking.trip_type]} />
            <FareRow label="Status" value={FLIGHT_STATUS_LABEL[booking.status]} />
          </tbody>
        </table>

        <div className="mt-6 space-y-1 text-right">
          <div className="flex items-baseline justify-end gap-4">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-2xl font-bold">{fmtMoney(saleTotal)}</span>
          </div>
          {received > 0 && (
            <>
              <div className="text-sm text-slate-600">
                Paid: {fmtMoney(received)}
              </div>
              <div className="text-sm font-semibold text-slate-800">
                Balance due: {fmtMoney(balance)}
              </div>
            </>
          )}
        </div>

        {booking.notes && (
          <p className="mt-8 border-t border-slate-200 pt-4 text-sm text-slate-600">
            {booking.notes}
          </p>
        )}

        <p className="mt-10 text-center text-xs text-slate-400">
          Generated by {org?.name ?? "CargoBook"} · {fmtDate(new Date().toISOString())}
        </p>
      </div>
    </div>
  );
}

function FareRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-slate-200">
      <td className="w-40 py-2 pr-4 font-bold text-slate-900">{label}</td>
      <td className="py-2">{value}</td>
    </tr>
  );
}
