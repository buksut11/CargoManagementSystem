"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type {
  FlightBooking,
  FlightCustomer,
  FlightDestination,
  FlightPassenger,
  FlightSegment,
  FlightSupplier,
  PassengerType,
  TripType,
} from "@/lib/types";
import { fmtMoney, TRIP_TYPE_LABEL } from "@/lib/format";
import {
  Button,
  ErrorNote,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { DatePicker, TimePicker } from "@/components/date-picker";
import {
  BookIcon,
  CoinsIcon,
  PlaneIcon,
  TicketIcon,
  UsersIcon,
} from "@/components/icons";
import type { ReactNode } from "react";

type PaxRow = { full_name: string; type: PassengerType; sale: string };
type SegRow = {
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  cabin_class: string;
};

const emptyPax: PaxRow = { full_name: "", type: "adult", sale: "" };
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
  const [destinations, setDestinations] = useState<FlightDestination[]>([]);

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
      supabase.from("flight_destinations").select("*").order("name"),
    ]).then(([c, s, d]) => {
      if (!active) return;
      setCustomers((c.data as FlightCustomer[]) ?? []);
      setSuppliers((s.data as FlightSupplier[]) ?? []);
      setDestinations((d.data as FlightDestination[]) ?? []);
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
            sale: r.sale_amount ? String(r.sale_amount) : "",
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
  const saleTotal = useMemo(
    () => passengers.reduce((sum, p) => sum + num(p.sale), 0),
    [passengers],
  );
  const profit = saleTotal - num(netCost);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    // Passengers carry the sale price now; keep the booking's base_fare in sync
    // with their total so the generated sale_total / profit columns stay correct.
    const savedPax = passengers.filter((p) => p.full_name.trim());
    const paxSaleTotal = savedPax.reduce((sum, p) => sum + num(p.sale), 0);

    // The "Airline" dropdown is backed by suppliers; mirror the chosen supplier's
    // name into the booking's airline column so the list/detail views can show it.
    const airlineName =
      suppliers.find((s) => String(s.id) === supplierId)?.name ?? null;

    // Derive the travel date from the earliest segment departure so the list can
    // show when the trip actually flies.
    const travelDate =
      segments
        .map((s) => s.departure_at.slice(0, 10))
        .filter(Boolean)
        .sort()[0] ?? null;

    const row = {
      pnr: pnr.trim() || null,
      customer_id: customerId ? Number(customerId) : null,
      supplier_id: supplierId ? Number(supplierId) : null,
      airline: airlineName,
      trip_type: tripType,
      status,
      booking_date: bookingDate,
      travel_date: travelDate,
      base_fare: paxSaleTotal,
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

    const paxRows = savedPax.map((p) => ({
      booking_id: bookingId,
      full_name: p.full_name.trim(),
      type: p.type,
      sale_amount: num(p.sale),
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
        origin: s.origin.trim() || null,
        destination: s.destination.trim() || null,
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

  const paxCount = passengers.filter((p) => p.full_name.trim()).length;

  return (
    <form onSubmit={save} className="space-y-4">
      {/* Trip details */}
      <Section
        icon={<TicketIcon />}
        title="Trip details"
        subtitle="Who is flying and with which airline"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Airline">
            <Select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">— Select airline —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
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
          <Field label="PNR" hint="Airline booking reference / locator">
            <Input
              value={pnr}
              onChange={(e) => setPnr(e.target.value)}
              placeholder="e.g. ABC123"
            />
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
          <Field label="Booking date">
            <DatePicker value={bookingDate} onChange={setBookingDate} required />
          </Field>
          <Field label="Status">
            <Select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as FlightBooking["status"])
              }
            >
              <option value="booked">Booked</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
        </div>
      </Section>

      {/* Passengers */}
      <RepeatSection
        icon={<UsersIcon />}
        title="Passengers"
        subtitle="Add every traveller and their ticket price"
        singular="Passenger"
        rows={passengers}
        onAdd={() => setPassengers((r) => [...r, { ...emptyPax }])}
        onRemove={(i) => setPassengers((r) => r.filter((_, j) => j !== i))}
        render={(p, i) => (
          <div className="grid gap-2 sm:grid-cols-[1fr_8rem_10rem]">
            <Input
              value={p.full_name}
              onChange={(e) =>
                setPassengers((r) =>
                  r.map((x, j) =>
                    j === i ? { ...x, full_name: e.target.value } : x,
                  ),
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
              type="number"
              step="0.01"
              min="0"
              value={p.sale}
              onChange={(e) =>
                setPassengers((r) =>
                  r.map((x, j) => (j === i ? { ...x, sale: e.target.value } : x)),
                )
              }
              placeholder="Sale price"
            />
          </div>
        )}
      />

      {/* Itinerary */}
      <RepeatSection
        icon={<PlaneIcon />}
        title="Flights"
        subtitle="Flights, dates and classes — the first departure sets the travel date"
        singular="Flight"
        rows={segments}
        onAdd={() => setSegments((r) => [...r, { ...emptySeg }])}
        onRemove={(i) => setSegments((r) => r.filter((_, j) => j !== i))}
        render={(s, i) => (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <DestinationSelect
                value={s.origin}
                destinations={destinations}
                onChange={(v) =>
                  setSegments((r) =>
                    r.map((x, j) => (j === i ? { ...x, origin: v } : x)),
                  )
                }
                placeholder="From"
              />
              <DestinationSelect
                value={s.destination}
                destinations={destinations}
                onChange={(v) =>
                  setSegments((r) =>
                    r.map((x, j) => (j === i ? { ...x, destination: v } : x)),
                  )
                }
                placeholder="To"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <DateTimeInput
                value={s.departure_at}
                onChange={(v) =>
                  setSegments((r) =>
                    r.map((x, j) => (j === i ? { ...x, departure_at: v } : x)),
                  )
                }
                placeholder="Departure"
              />
              <DateTimeInput
                value={s.arrival_at}
                onChange={(v) =>
                  setSegments((r) =>
                    r.map((x, j) => (j === i ? { ...x, arrival_at: v } : x)),
                  )
                }
                placeholder="Arrival"
              />
              <Select
                value={s.cabin_class}
                onChange={(e) =>
                  setSegments((r) =>
                    r.map((x, j) =>
                      j === i ? { ...x, cabin_class: e.target.value } : x,
                    ),
                  )
                }
              >
                <option value="">— Classes —</option>
                <option value="Economy">Economy</option>
                <option value="Business">Business</option>
                {s.cabin_class &&
                  s.cabin_class !== "Economy" &&
                  s.cabin_class !== "Business" && (
                    <option value={s.cabin_class}>{s.cabin_class}</option>
                  )}
              </Select>
            </div>
          </div>
        )}
      />

      {/* Pricing */}
      <Section
        icon={<CoinsIcon />}
        title="Pricing"
        subtitle="What you pay the airline versus what the customer pays you"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Net cost (to airline)"
            hint="The fare and fees you owe the airline"
          >
            <Input
              type="number"
              step="0.01"
              min="0"
              value={netCost}
              onChange={(e) => setNetCost(e.target.value)}
              placeholder="0.00"
            />
          </Field>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Stat label="Sale total" value={fmtMoney(saleTotal)} />
          <Stat label="Net cost" value={fmtMoney(num(netCost))} />
          <Stat
            label="Profit"
            value={fmtMoney(profit)}
            tone={profit < 0 ? "negative" : "positive"}
          />
        </div>
      </Section>

      {/* Notes */}
      <Section icon={<BookIcon />} title="Notes" subtitle="Internal only">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes about this booking…"
        />
      </Section>

      <ErrorNote message={error} />

      {/* Sticky action bar — the running profit and the primary CTA stay in view
          while the agent scrolls through a long booking. */}
      <div className="glass-panel sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            {paxCount} {paxCount === 1 ? "passenger" : "passengers"}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            Profit{" "}
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
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/flights/bookings")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Create booking"}
          </Button>
        </div>
      </div>
    </form>
  );
}

// A titled panel with an icon chip — the building block for every form section.
function Section({
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// A read-only figure tile used in the pricing summary.
function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const valueTone =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-xl border border-white/50 bg-white/40 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`mt-0.5 text-lg font-semibold ${valueTone}`}>{value}</div>
    </div>
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
      <TimePicker
        value={time}
        onChange={(t) => onChange(`${date}T${t || "00:00"}`)}
        disabled={!date}
        placeholder="Time"
        ariaLabel={`${placeholder} time`}
      />
    </div>
  );
}

// A From / To picker backed by the org's saved destinations. If the stored
// value isn't in the list (e.g. an older booking that used a raw code), it is
// still shown as a selectable option so editing never loses it.
function DestinationSelect({
  value,
  destinations,
  onChange,
  placeholder,
}: {
  value: string;
  destinations: FlightDestination[];
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const missing = value && !destinations.some((d) => d.name === value);
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{`— ${placeholder} —`}</option>
      {destinations.map((d) => (
        <option key={d.id} value={d.name}>
          {d.code ? `${d.name} (${d.code})` : d.name}
        </option>
      ))}
      {missing && <option value={value}>{value}</option>}
    </Select>
  );
}

// A "list of rows with add/remove" section used for passengers + itinerary.
// Each row gets a numbered header so a long booking stays easy to scan.
function RepeatSection<T>({
  icon,
  title,
  subtitle,
  singular,
  rows,
  onAdd,
  onRemove,
  render,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  singular: string;
  rows: T[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  render: (row: T, i: number) => ReactNode;
}) {
  return (
    <Section
      icon={icon}
      title={title}
      subtitle={subtitle}
      action={
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-300"
        >
          + Add {singular.toLowerCase()}
        </button>
      }
    >
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/50 bg-white/35 p-3 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/15 text-[11px] font-semibold text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
                  {i + 1}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {singular} {i + 1}
                </span>
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  aria-label={`Remove ${singular.toLowerCase()} ${i + 1}`}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  Remove
                </button>
              )}
            </div>
            {render(row, i)}
          </div>
        ))}
      </div>
    </Section>
  );
}
