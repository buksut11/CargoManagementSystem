"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type {
  FlightBooking,
  FlightCustomer,
  FlightPassenger,
  FlightSegment,
  FlightSupplier,
  PassengerType,
  TripType,
} from "@/lib/types";
import { fmtMoney, TRIP_TYPE_LABEL } from "@/lib/format";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { DatePicker } from "@/components/date-picker";

type PaxRow = { full_name: string; type: PassengerType; ticket_number: string };
type SegRow = {
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  cabin_class: string;
};

const emptyPax: PaxRow = { full_name: "", type: "adult", ticket_number: "" };
const emptySeg: SegRow = {
  origin: "",
  destination: "",
  departure_at: "",
  arrival_at: "",
  cabin_class: "",
};

// Local <input type="datetime-local"> value ⇄ ISO string in the DB.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

export function BookingForm({ booking }: { booking?: FlightBooking }) {
  const router = useRouter();
  const editing = !!booking;

  const [customers, setCustomers] = useState<FlightCustomer[]>([]);
  const [suppliers, setSuppliers] = useState<FlightSupplier[]>([]);

  const [pnr, setPnr] = useState(booking?.pnr ?? "");
  const [customerId, setCustomerId] = useState<string>(
    booking?.customer_id ? String(booking.customer_id) : "",
  );
  const [supplierId, setSupplierId] = useState<string>(
    booking?.supplier_id ? String(booking.supplier_id) : "",
  );
  const [tripType, setTripType] = useState<TripType>(
    booking?.trip_type ?? "oneway",
  );
  const [status, setStatus] = useState(booking?.status ?? "booked");
  const [bookingDate, setBookingDate] = useState(
    booking?.booking_date ?? new Date().toISOString().slice(0, 10),
  );

  const [baseFare, setBaseFare] = useState(String(booking?.base_fare ?? ""));
  const [netCost, setNetCost] = useState(String(booking?.net_cost ?? ""));
  const [notes, setNotes] = useState(booking?.notes ?? "");

  const [passengers, setPassengers] = useState<PaxRow[]>([{ ...emptyPax }]);
  const [segments, setSegments] = useState<SegRow[]>([{ ...emptySeg }]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown data.
  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("flight_customers").select("*").order("name"),
      supabase.from("flight_suppliers").select("*").order("name"),
    ]).then(([c, s]) => {
      if (!active) return;
      setCustomers((c.data as FlightCustomer[]) ?? []);
      setSuppliers((s.data as FlightSupplier[]) ?? []);
    });
    return () => {
      active = false;
    };
  }, []);

  // When editing, load the existing passengers + segments.
  useEffect(() => {
    if (!booking) return;
    let active = true;
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
      if (!active) return;
      const pax = (p.data as FlightPassenger[]) ?? [];
      const seg = (s.data as FlightSegment[]) ?? [];
      if (pax.length)
        setPassengers(
          pax.map((r) => ({
            full_name: r.full_name,
            type: r.type,
            ticket_number: r.ticket_number ?? "",
          })),
        );
      if (seg.length)
        setSegments(
          seg.map((r) => ({
            origin: r.origin ?? "",
            destination: r.destination ?? "",
            departure_at: toLocalInput(r.departure_at),
            arrival_at: toLocalInput(r.arrival_at),
            cabin_class: r.cabin_class ?? "",
          })),
        );
    });
    return () => {
      active = false;
    };
  }, [booking]);

  const num = (v: string) => (v === "" ? 0 : parseFloat(v) || 0);
  const saleTotal = useMemo(() => num(baseFare), [baseFare]);
  const profit = saleTotal - num(netCost);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const row = {
      pnr: pnr.trim() || null,
      customer_id: customerId ? Number(customerId) : null,
      supplier_id: supplierId ? Number(supplierId) : null,
      airline: null,
      trip_type: tripType,
      status,
      booking_date: bookingDate,
      travel_date: null,
      base_fare: num(baseFare),
      taxes: 0,
      service_fee: 0,
      markup: 0,
      commission_amount: 0,
      net_cost: num(netCost),
      notes: notes.trim() || null,
    };

    // Insert or update the booking, keeping its id to attach children.
    let bookingId = booking?.id;
    if (editing) {
      const { error: upErr } = await supabase
        .from("flight_bookings")
        .update(row)
        .eq("id", booking!.id);
      if (upErr) {
        setBusy(false);
        setError(upErr.message);
        return;
      }
    } else {
      const { data, error: insErr } = await supabase
        .from("flight_bookings")
        .insert(row)
        .select("id")
        .single();
      if (insErr || !data) {
        setBusy(false);
        setError(insErr?.message ?? "Could not create the booking.");
        return;
      }
      bookingId = (data as { id: number }).id;
    }

    // Reconcile passengers + segments by replacing them wholesale (there are
    // only ever a handful per booking, so this is simple and reliable).
    if (editing && bookingId != null) {
      await supabase.from("flight_passengers").delete().eq("booking_id", bookingId);
      await supabase.from("flight_segments").delete().eq("booking_id", bookingId);
    }

    const paxRows = passengers
      .filter((p) => p.full_name.trim())
      .map((p) => ({
        booking_id: bookingId,
        full_name: p.full_name.trim(),
        type: p.type,
        ticket_number: p.ticket_number.trim() || null,
      }));
    if (paxRows.length) {
      const { error: pErr } = await supabase
        .from("flight_passengers")
        .insert(paxRows);
      if (pErr) {
        setBusy(false);
        setError(pErr.message);
        return;
      }
    }

    const segRows = segments
      .filter((s) => s.origin.trim() || s.destination.trim())
      .map((s, i) => ({
        booking_id: bookingId,
        segment_no: i + 1,
        origin: s.origin.trim().toUpperCase() || null,
        destination: s.destination.trim().toUpperCase() || null,
        departure_at: fromLocalInput(s.departure_at),
        arrival_at: fromLocalInput(s.arrival_at),
        cabin_class: s.cabin_class.trim() || null,
      }));
    if (segRows.length) {
      const { error: sErr } = await supabase
        .from("flight_segments")
        .insert(segRows);
      if (sErr) {
        setBusy(false);
        setError(sErr.message);
        return;
      }
    }

    setBusy(false);
    router.push(bookingId ? `/flights/bookings/${bookingId}` : "/flights/bookings");
    router.refresh();
  }

  return (
    <Card className="p-5">
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="PNR">
            <Input
              value={pnr}
              onChange={(e) => setPnr(e.target.value)}
              placeholder="e.g. ABC123"
            />
          </Field>
          <Field label="Customer">
            <Select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">— None —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Supplier">
            <Select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">— None —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Trip type">
            <Select
              value={tripType}
              onChange={(e) => setTripType(e.target.value as TripType)}
            >
              {(Object.keys(TRIP_TYPE_LABEL) as TripType[]).map((t) => (
                <option key={t} value={t}>
                  {TRIP_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as FlightBooking["status"])}>
              <option value="quote">Quote</option>
              <option value="booked">Booked</option>
              <option value="ticketed">Ticketed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
              <option value="void">Void</option>
            </Select>
          </Field>
          <Field label="Booking date">
            <DatePicker value={bookingDate} onChange={setBookingDate} required />
          </Field>
        </div>

        {/* Financials */}
        <div className="rounded-xl border border-slate-200/60 p-3 dark:border-white/10">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Financials
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Base fare">
              <Input type="number" step="0.01" min="0" value={baseFare} onChange={(e) => setBaseFare(e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Net cost (to supplier)">
              <Input type="number" step="0.01" min="0" value={netCost} onChange={(e) => setNetCost(e.target.value)} placeholder="0.00" />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-200/60 pt-3 text-sm dark:border-white/10">
            <span className="text-slate-500 dark:text-slate-400">
              Sale total:{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {fmtMoney(saleTotal)}
              </span>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Profit:{" "}
              <span
                className={`font-semibold ${
                  profit < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {fmtMoney(profit)}
              </span>
            </span>
          </div>
        </div>

        {/* Passengers */}
        <RepeatSection
          title="Passengers"
          rows={passengers}
          onAdd={() => setPassengers((r) => [...r, { ...emptyPax }])}
          onRemove={(i) => setPassengers((r) => r.filter((_, j) => j !== i))}
          render={(p, i) => (
            <div className="grid gap-2 sm:grid-cols-[1fr_7rem_1fr]">
              <Input
                value={p.full_name}
                onChange={(e) =>
                  setPassengers((r) =>
                    r.map((x, j) => (j === i ? { ...x, full_name: e.target.value } : x)),
                  )
                }
                placeholder="Full name"
              />
              <Select
                value={p.type}
                onChange={(e) =>
                  setPassengers((r) =>
                    r.map((x, j) =>
                      j === i ? { ...x, type: e.target.value as PassengerType } : x,
                    ),
                  )
                }
              >
                <option value="adult">Adult</option>
                <option value="child">Child</option>
                <option value="infant">Infant</option>
              </Select>
              <Input
                value={p.ticket_number}
                onChange={(e) =>
                  setPassengers((r) =>
                    r.map((x, j) => (j === i ? { ...x, ticket_number: e.target.value } : x)),
                  )
                }
                placeholder="Ticket number"
              />
            </div>
          )}
        />

        {/* Segments */}
        <RepeatSection
          title="Itinerary"
          rows={segments}
          onAdd={() => setSegments((r) => [...r, { ...emptySeg }])}
          onRemove={(i) => setSegments((r) => r.filter((_, j) => j !== i))}
          render={(s, i) => (
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={s.origin}
                  onChange={(e) =>
                    setSegments((r) => r.map((x, j) => (j === i ? { ...x, origin: e.target.value } : x)))
                  }
                  placeholder="From (IATA)"
                  maxLength={4}
                />
                <Input
                  value={s.destination}
                  onChange={(e) =>
                    setSegments((r) => r.map((x, j) => (j === i ? { ...x, destination: e.target.value } : x)))
                  }
                  placeholder="To (IATA)"
                  maxLength={4}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <DateTimeInput
                  value={s.departure_at}
                  onChange={(v) =>
                    setSegments((r) => r.map((x, j) => (j === i ? { ...x, departure_at: v } : x)))
                  }
                  placeholder="Departure"
                />
                <DateTimeInput
                  value={s.arrival_at}
                  onChange={(v) =>
                    setSegments((r) => r.map((x, j) => (j === i ? { ...x, arrival_at: v } : x)))
                  }
                  placeholder="Arrival"
                />
                <Input
                  value={s.cabin_class}
                  onChange={(e) =>
                    setSegments((r) => r.map((x, j) => (j === i ? { ...x, cabin_class: e.target.value } : x)))
                  }
                  placeholder="Cabin (e.g. Economy)"
                />
              </div>
            </div>
          )}
        />

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes about this booking…"
          />
        </Field>

        <ErrorNote message={error} />
        <div className="flex gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Create booking"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/flights/bookings")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

// The app's glass DatePicker plus a time field, replacing the OS-native
// datetime-local control. Value shape stays "YYYY-MM-DDTHH:mm" (or "").
function DateTimeInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const date = value.slice(0, 10);
  const time = value.slice(11, 16);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
      <DatePicker
        value={date}
        onChange={(d) => onChange(d ? `${d}T${time || "00:00"}` : "")}
        placeholder={placeholder}
      />
      <Input
        type="time"
        value={time}
        onChange={(e) => onChange(`${date}T${e.target.value || "00:00"}`)}
        disabled={!date}
        aria-label={`${placeholder} time`}
      />
    </div>
  );
}

// A small "list of rows with add/remove" helper used for passengers + segments.
function RepeatSection<T>({
  title,
  rows,
  onAdd,
  onRemove,
  render,
}: {
  title: string;
  rows: T[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  render: (row: T, i: number) => React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/60 p-3 dark:border-white/10">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {title}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          + Add
        </button>
      </div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">{render(row, i)}</div>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label="Remove"
                className="mt-1 shrink-0 rounded-lg px-2 py-1 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
