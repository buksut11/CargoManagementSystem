"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { downloadCsv } from "@/lib/csv";
import type { FlightBooking, FlightBookingStatus } from "@/lib/types";
import {
  bookingRef,
  fmtDate,
  fmtMoney,
  FLIGHT_STATUS_CLASS,
  FLIGHT_STATUS_LABEL,
} from "@/lib/format";
import { useRole } from "@/components/role-context";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Select,
  Td,
  Th,
} from "@/components/ui";

export default function BookingsPage() {
  const role = useRole();
  const isAgent = role === "agent";
  const [bookings, setBookings] = useState<FlightBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    supabase
      .from("flight_bookings")
      .select("*, flight_customers(id, name), flight_suppliers(id, name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setBookings((data as FlightBooking[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? bookings
        : bookings.filter((b) => b.status === statusFilter),
    [bookings, statusFilter],
  );

  function exportCsv() {
    downloadCsv("flight-bookings.csv", [
      ["Ref", "PNR", "Airline", "Customer", "Booking date", "Travel date", "Status", "Sale total", "Net cost", "Profit"],
      ...filtered.map((b) => [
        bookingRef(b.id),
        b.booking_ref ?? "",
        b.airline ?? "",
        b.flight_customers?.name ?? "",
        b.booking_date,
        b.travel_date ?? "",
        FLIGHT_STATUS_LABEL[b.status],
        Number(b.sale_total),
        Number(b.net_cost),
        Number(b.profit),
      ]),
    ]);
  }

  return (
    <div>
      <PageHeader
        title="Bookings"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="rounded-full border border-white/60 bg-white/35 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur hover:bg-white/60 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.08]"
            >
              ⬇ Export CSV
            </button>
            {!isAgent && (
              <Link
                href="/flights/bookings/new"
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
              >
                + New booking
              </Link>
            )}
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
        <div className="w-44">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            {(Object.keys(FLIGHT_STATUS_LABEL) as FlightBookingStatus[]).map(
              (s) => (
                <option key={s} value={s}>
                  {FLIGHT_STATUS_LABEL[s]}
                </option>
              ),
            )}
          </Select>
        </div>
      </div>

      <Card className="overflow-x-auto">
        {/* Mobile cards */}
        <div className="space-y-3 p-3 md:hidden">
          {filtered.map((b) => (
            <Link
              key={b.id}
              href={`/flights/bookings/${b.id}`}
              className="block rounded-xl border border-slate-200/60 p-3 hover:bg-white/60 dark:border-white/10 dark:hover:bg-white/[0.08]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {bookingRef(b.id)}
                </span>
                <Badge className={FLIGHT_STATUS_CLASS[b.status]}>
                  {FLIGHT_STATUS_LABEL[b.status]}
                </Badge>
              </div>
              <div className="mt-1 text-sm">
                {b.airline ?? "—"}
                {b.flight_customers?.name ? ` · ${b.flight_customers.name}` : ""}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                <span>{fmtDate(b.travel_date)}</span>
                {!isAgent && <span>{fmtMoney(Number(b.sale_total))}</span>}
              </div>
            </Link>
          ))}
        </div>

        {/* Desktop table */}
        <table className="hidden w-full md:table">
          <thead className="border-b border-slate-200/60 dark:border-white/10">
            <tr>
              <Th>Ref</Th>
              <Th>PNR</Th>
              <Th>Airline</Th>
              <Th>Customer</Th>
              <Th>Travel</Th>
              <Th>Status</Th>
              {!isAgent && <Th>Sale total</Th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                <Td className="whitespace-nowrap">
                  <Link
                    href={`/flights/bookings/${b.id}`}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {bookingRef(b.id)}
                  </Link>
                </Td>
                <Td>{b.pnr ?? "—"}</Td>
                <Td>{b.airline ?? "—"}</Td>
                <Td>{b.flight_customers?.name ?? "—"}</Td>
                <Td className="whitespace-nowrap">{fmtDate(b.travel_date)}</Td>
                <Td>
                  <Badge className={FLIGHT_STATUS_CLASS[b.status]}>
                    {FLIGHT_STATUS_LABEL[b.status]}
                  </Badge>
                </Td>
                {!isAgent && (
                  <Td className="whitespace-nowrap font-medium">
                    {fmtMoney(Number(b.sale_total))}
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <EmptyState
            message={
              bookings.length === 0
                ? "No bookings yet."
                : "No bookings match this filter."
            }
          />
        )}
      </Card>
    </div>
  );
}
