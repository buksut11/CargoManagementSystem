"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/org-context";
import type {
  FlightBooking,
  FlightSupplier,
  Organization,
  SupplierPayment,
} from "@/lib/types";
import { bookingRef, fmtDate, fmtMoney, REVERSED_IN_LIST } from "@/lib/format";
import { Card, Field, PageHeader, Section, Select } from "@/components/ui";
import { DatePicker } from "@/components/date-picker";
import { BuildingIcon, PhoneIcon, StatementIcon } from "@/components/icons";

// One movement on the airline's account, from the agency's payables viewpoint:
// a charge is a ticket cost we owe the airline; a credit is a payment we made
// against it. `sort` disambiguates entries sharing a date so the running
// balance is deterministic (charges before the credits that settle them).
type Line = {
  date: string;
  ref: string;
  description: string;
  sub?: string; // secondary detail (route · customer · travel date)
  debit: number; // increases what we owe the airline
  credit: number; // reduces what we owe the airline
  sort: number;
};

// The slice of a flight segment we need to draw a booking's route.
type SegmentRow = {
  booking_id: number;
  segment_no: number;
  origin: string | null;
  destination: string | null;
};

// A booking joined with its customer's name, so a cost line can name who the
// ticket was for without a second round-trip.
type BookingRow = FlightBooking & {
  flight_customers?: { name: string } | null;
};

// Whole days between two YYYY-MM-DD dates (UTC so no timezone drift). Used to
// age each unpaid charge for the payables summary.
function ageDays(date: string, asOf: string): number {
  const a = Date.parse(`${date}T00:00:00Z`);
  const b = Date.parse(`${asOf}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.floor((b - a) / 86_400_000);
}

// Local YYYY-MM-DD (never toISOString, which shifts by timezone and can land a
// date on the wrong day). Matches how booking/paid/refund dates are stored.
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const TODAY = isoDate(new Date());

// Quick date presets. Each returns [from, to]; "All time" leaves `from` empty so
// the statement opens with no carried-forward balance and lists everything.
function presetRange(key: string): [string, string] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "month":
      return [isoDate(new Date(y, m, 1)), TODAY];
    case "lastMonth":
      return [isoDate(new Date(y, m - 1, 1)), isoDate(new Date(y, m, 0))];
    case "quarter":
      return [isoDate(new Date(y, Math.floor(m / 3) * 3, 1)), TODAY];
    case "year":
      return [isoDate(new Date(y, 0, 1)), TODAY];
    default:
      return ["", TODAY];
  }
}

const PRESETS: { key: string; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "quarter", label: "This quarter" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
];

type OrgHeader = Pick<
  Organization,
  "name" | "logo_url" | "address" | "phone" | "email"
>;

export default function FlightSupplierStatementPage() {
  const router = useRouter();
  const org = useOrg();

  const [suppliers, setSuppliers] = useState<FlightSupplier[]>([]);
  const [supplierId, setSupplierId] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>(TODAY);

  const [orgHeader, setOrgHeader] = useState<OrgHeader | null>(null);
  const [allLines, setAllLines] = useState<Line[] | null>(null);
  const [loadingLines, setLoadingLines] = useState(false);

  const supplier = useMemo(
    () => suppliers.find((s) => String(s.id) === supplierId) ?? null,
    [suppliers, supplierId],
  );

  // Airlines (for the picker) and the org letterhead — loaded once. Also
  // preselects the airline when arriving from a deep link
  // (/flights/supplier-statement?supplier=123), e.g. the Airlines list.
  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        router.replace("/login");
        return;
      }
      const sid = new URLSearchParams(window.location.search).get("supplier");
      if (sid) setSupplierId(sid);

      const { data } = await supabase
        .from("flight_suppliers")
        .select("*")
        .order("name");
      setSuppliers((data as FlightSupplier[]) ?? []);

      if (org?.orgId) {
        const { data: o } = await supabase
          .from("organizations")
          .select("name, logo_url, address, phone, email")
          .eq("id", org.orgId)
          .single();
        setOrgHeader((o as OrgHeader) ?? null);
      }
    }
    load();
  }, [router, org?.orgId]);

  // Every movement on the selected airline's account — reloaded whenever the
  // airline changes. The date range is applied in memory (below) so switching
  // dates never re-hits the network.
  useEffect(() => {
    let active = true;
    async function load() {
      if (!supplierId) {
        setAllLines(null);
        return;
      }
      setLoadingLines(true);
      const sid = Number(supplierId);

      // Bookings sourced from this airline. net_cost is what we owe them.
      const { data: b } = await supabase
        .from("flight_bookings")
        .select("*, flight_customers(name)")
        .eq("supplier_id", sid)
        .not("status", "in", REVERSED_IN_LIST)
        .order("booking_date");
      const bookings = (b as BookingRow[]) ?? [];
      const ids = bookings.map((r) => r.id);

      // Payments we made to this airline are keyed by supplier_id directly, so a
      // bulk / BSP settlement with no single booking is still included.
      const { data: payData } = await supabase
        .from("supplier_payments")
        .select("*")
        .eq("supplier_id", sid);
      const payments = (payData as SupplierPayment[]) ?? [];

      // The itinerary segments for these bookings, used to draw each route.
      let segments: SegmentRow[] = [];
      if (ids.length) {
        const { data: seg } = await supabase
          .from("flight_segments")
          .select("booking_id, segment_no, origin, destination")
          .in("booking_id", ids)
          .order("segment_no");
        segments = (seg as SegmentRow[]) ?? [];
      }

      // The route flown, chained across the booking's segments (already sorted
      // by segment_no), e.g. "Baidoa → Mogadishu" or "Baidoa → Mogadishu →
      // Baidoa" for a return. Consecutive duplicate stops are collapsed.
      const segsByBooking = new Map<number, SegmentRow[]>();
      for (const s of segments) {
        const list = segsByBooking.get(s.booking_id) ?? [];
        list.push(s);
        segsByBooking.set(s.booking_id, list);
      }
      const routeLabel = (bookingId: number): string => {
        const stops: string[] = [];
        for (const s of segsByBooking.get(bookingId) ?? []) {
          for (const p of [s.origin, s.destination]) {
            const stop = p?.trim();
            if (stop && stops[stops.length - 1] !== stop) stops.push(stop);
          }
        }
        return stops.join(" → ");
      };

      const rows: Line[] = [];

      for (const bk of bookings) {
        const cost = Number(bk.net_cost);
        if (cost <= 0) continue; // nothing owed on this booking
        const route = routeLabel(bk.id);
        const description = ["Ticket cost", route, bk.pnr ? `PNR ${bk.pnr}` : ""]
          .filter(Boolean)
          .join(" · ");
        const detail = [
          bk.flight_customers?.name ? `For ${bk.flight_customers.name}` : "",
          bk.travel_date ? `Travel ${fmtDate(bk.travel_date)}` : "",
        ]
          .filter(Boolean)
          .join(" · ");
        rows.push({
          date: bk.booking_date,
          ref: bookingRef(bk.id),
          description,
          sub: detail || undefined,
          debit: cost,
          credit: 0,
          sort: 0,
        });
      }

      for (const p of payments) {
        rows.push({
          date: p.paid_date,
          ref: p.booking_id ? bookingRef(p.booking_id) : "—",
          description: `Payment to airline${p.method ? ` (${p.method})` : ""}`,
          debit: 0,
          credit: Number(p.amount),
          sort: 1,
        });
      }

      rows.sort((a, c) => a.date.localeCompare(c.date) || a.sort - c.sort);

      if (active) {
        setAllLines(rows);
        setLoadingLines(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [supplierId]);

  // Split the full history around the chosen window. Everything before `from`
  // collapses into a single opening balance so the running balance we owe is
  // correct — not a period total that ignores what we already owed the airline.
  const view = useMemo(() => {
    if (!allLines) return null;
    let opening = 0;
    const period: Line[] = [];
    for (const l of allLines) {
      if (to && l.date > to) continue; // ignore anything after the window
      if (from && l.date < from) {
        opening += l.debit - l.credit;
      } else {
        period.push(l);
      }
    }
    const charges = period.reduce((s, l) => s + l.debit, 0);
    const credits = period.reduce((s, l) => s + l.credit, 0);
    const closing = opening + charges - credits;
    // Running balance per period line, precomputed so render stays pure.
    let run = opening;
    const running = period.map((l) => (run += l.debit - l.credit));

    // Payables aging: what makes up the balance we owe, by how long each unpaid
    // charge has gone unsettled. Age the *whole* account as of the statement
    // date (the balance owed includes the opening balance), applying every
    // credit to the oldest charges first (FIFO). Buckets sum to the balance owed.
    const asOf = to || TODAY;
    const chargesUpTo = allLines
      .filter((l) => l.debit > 0 && l.date <= asOf)
      .map((l) => ({ date: l.date, amount: l.debit }))
      .sort((a, b) => a.date.localeCompare(b.date));
    let creditPool = allLines
      .filter((l) => l.credit > 0 && l.date <= asOf)
      .reduce((s, l) => s + l.credit, 0);
    const aging = { current: 0, d31: 0, d61: 0, d90: 0 };
    for (const c of chargesUpTo) {
      let owed = c.amount;
      if (creditPool > 0) {
        const applied = Math.min(creditPool, owed);
        owed -= applied;
        creditPool -= applied;
      }
      if (owed <= 0.005) continue;
      const age = ageDays(c.date, asOf);
      if (age <= 30) aging.current += owed;
      else if (age <= 60) aging.d31 += owed;
      else if (age <= 90) aging.d61 += owed;
      else aging.d90 += owed;
    }

    return { opening, period, charges, credits, closing, running, aging };
  }, [allLines, from, to]);

  function applyPreset(key: string) {
    const [f, t] = presetRange(key);
    setFrom(f);
    setTo(t);
  }

  const periodLabel = from
    ? `${fmtDate(from)} — ${fmtDate(to || TODAY)}`
    : `All activity through ${fmtDate(to || TODAY)}`;

  return (
    <div>
      {/* Controls — never printed; the sheet below is the document. */}
      <div className="no-print">
        <PageHeader title="Airline statement" />
        <Section
          icon={<StatementIcon className="h-5 w-5" />}
          title="Build a statement"
          subtitle="Pick an airline and a date range, then print or save as PDF."
          className="mb-6"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <Field label="Airline">
                <Select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">Select an airline…</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                      {s.contact ? ` · ${s.contact}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="From">
              <DatePicker
                value={from}
                onChange={setFrom}
                placeholder="Beginning"
              />
            </Field>
            <Field label="To">
              <DatePicker value={to} onChange={setTo} placeholder="Today" />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Quick range:
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur transition-colors hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.12]"
              >
                {p.label}
              </button>
            ))}
          </div>

          {supplierId && (
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => window.print()}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700"
              >
                🖨 Print / Save as PDF
              </button>
              <Link
                href="/flights/suppliers"
                className="rounded-full border border-white/60 bg-white/35 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur transition-colors hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.1]"
              >
                ← Back to airlines
              </Link>
            </div>
          )}
        </Section>
      </div>

      {/* Nothing selected yet — a friendly prompt (screen only). */}
      {!supplierId && (
        <Card className="no-print p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
            <BuildingIcon />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choose an airline above to build their statement of account.
          </p>
        </Card>
      )}

      {/* The printable document. */}
      {supplierId && supplier && (
        <div className="mx-auto max-w-3xl bg-white p-6 text-slate-900 shadow-sm print:max-w-none print:p-0 print:shadow-none sm:p-8">
          <div className="border border-slate-300 p-6 sm:p-10">
            {/* Letterhead */}
            <div className="flex flex-col items-center text-center">
              {orgHeader?.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={orgHeader.logo_url}
                  alt={`${orgHeader.name} logo`}
                  className="mb-1 h-24 w-auto max-w-[320px] shrink-0 object-contain"
                />
              )}
              <div className="mt-2 text-2xl font-bold leading-tight">
                {orgHeader?.name ?? org?.orgName ?? "✈️ CargoBook"}
              </div>
              {orgHeader?.address && (
                <div className="mt-2 whitespace-pre-line text-xs text-slate-600">
                  {orgHeader.address}
                </div>
              )}
              {(orgHeader?.phone || orgHeader?.email) && (
                <div className="mt-0.5 text-xs text-slate-600">
                  {[orgHeader.phone, orgHeader.email].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>

            <div className="mt-4 text-center text-lg font-bold uppercase tracking-wide text-slate-800">
              Airline statement of account
            </div>

            {/* Airline + meta */}
            <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm">
              <div className="text-slate-600">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Statement for
                </div>
                <div className="mt-1 text-base font-semibold text-slate-900">
                  {supplier.name}
                </div>
                {supplier.type && (
                  <div className="text-xs capitalize text-slate-500">
                    {supplier.type}
                  </div>
                )}
                {supplier.contact && (
                  <div className="flex items-center gap-1.5">
                    <PhoneIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {supplier.contact}
                  </div>
                )}
              </div>
              <div className="text-right text-slate-600">
                <div>
                  <span className="text-slate-400">Period: </span>
                  {periodLabel}
                </div>
                <div>
                  <span className="text-slate-400">Issued: </span>
                  {fmtDate(TODAY)}
                </div>
                {view && (
                  <div>
                    <span className="text-slate-400">Entries: </span>
                    {view.period.length}
                  </div>
                )}
              </div>
            </div>

            {/* Summary strip */}
            {view && (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryBox label="Opening balance" value={fmtMoney(view.opening)} />
                <SummaryBox label="Ticket costs" value={fmtMoney(view.charges)} />
                <SummaryBox
                  label="Payments & credits"
                  value={fmtMoney(view.credits)}
                />
                <SummaryBox
                  label="Balance payable"
                  value={fmtMoney(Math.max(view.closing, 0))}
                  strong
                  tone={view.closing > 0.005 ? "due" : "settled"}
                />
              </div>
            )}

            {/* Ledger */}
            <table className="mt-8 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Ref</th>
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2 pr-2 text-right">Charge</th>
                  <th className="py-2 pr-2 text-right">Payment</th>
                  <th className="py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening balance carried forward (only when a start date trims
                    off earlier history). */}
                {view && from && (
                  <tr className="border-b border-slate-200 text-slate-500">
                    <td className="py-2 pr-2 whitespace-nowrap">{fmtDate(from)}</td>
                    <td className="py-2 pr-2">—</td>
                    <td className="py-2 pr-2 italic">Balance brought forward</td>
                    <td className="py-2 pr-2 text-right">—</td>
                    <td className="py-2 pr-2 text-right">—</td>
                    <td className="py-2 text-right font-medium">
                      {fmtMoney(view.opening)}
                    </td>
                  </tr>
                )}
                {view?.period.map((l, i) => (
                  <tr key={i} className="border-b border-slate-200 align-top">
                    <td className="py-2 pr-2 whitespace-nowrap">
                      {fmtDate(l.date)}
                    </td>
                    <td className="py-2 pr-2 whitespace-nowrap text-slate-500">
                      {l.ref}
                    </td>
                    <td className="py-2 pr-2">
                      {l.description}
                      {l.sub && (
                        <div className="text-xs text-slate-500">{l.sub}</div>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {l.debit ? fmtMoney(l.debit) : "—"}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {l.credit ? fmtMoney(l.credit) : "—"}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {fmtMoney(view.running[i])}
                    </td>
                  </tr>
                ))}
                {view && view.period.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      {loadingLines
                        ? "Loading…"
                        : "No transactions in this date range."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            {view && (
              <div className="mt-6 space-y-1 text-right text-sm">
                {from && (
                  <div className="text-slate-600">
                    Opening balance: {fmtMoney(view.opening)}
                  </div>
                )}
                <div className="text-slate-600">
                  Total charged: {fmtMoney(view.charges)}
                </div>
                <div className="text-slate-600">
                  Total payments &amp; credits: {fmtMoney(view.credits)}
                </div>
                <div className="flex items-baseline justify-end gap-4 pt-1">
                  <span className="text-sm text-slate-500">Balance payable</span>
                  <span
                    className={`text-2xl font-bold ${
                      view.closing > 0 ? "text-orange-600" : "text-emerald-700"
                    }`}
                  >
                    {fmtMoney(Math.max(view.closing, 0))}
                  </span>
                </div>
                {view.closing <= 0 && (
                  <div className="text-xs text-emerald-700">
                    Account fully settled
                    {view.closing < 0
                      ? ` (airline owes ${fmtMoney(-view.closing)})`
                      : ""}
                    .
                  </div>
                )}
              </div>
            )}

            {/* Aging — how the balance payable breaks down by how long we have
                owed it. Only meaningful when we actually owe the airline money. */}
            {view && view.closing > 0.005 && (
              <div className="mt-8">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Payable by age
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <AgingBox label="Current" hint="0–30 days" value={view.aging.current} />
                  <AgingBox label="31–60 days" value={view.aging.d31} />
                  <AgingBox label="61–90 days" value={view.aging.d61} />
                  <AgingBox label="Over 90 days" value={view.aging.d90} overdue />
                </div>
              </div>
            )}

            <p className="mt-10 text-center text-xs text-slate-400">
              Generated by {orgHeader?.name ?? org?.orgName ?? "CargoBook"} ·{" "}
              {fmtDate(TODAY)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryBox({
  label,
  value,
  strong = false,
  tone = "default",
}: {
  label: string;
  value: string;
  strong?: boolean;
  // "due" tints the box orange (money owed); "settled" tints it green.
  tone?: "default" | "due" | "settled";
}) {
  const box =
    tone === "due"
      ? "border-orange-200 bg-orange-50"
      : tone === "settled"
        ? "border-emerald-200 bg-emerald-50"
        : strong
          ? "border-slate-300 bg-slate-50"
          : "border-slate-200 bg-white";
  const size = strong ? "text-lg font-bold" : "text-sm font-semibold";
  const color =
    tone === "due"
      ? "text-orange-600"
      : tone === "settled"
        ? "text-emerald-700"
        : strong
          ? "text-slate-900"
          : "text-slate-700";
  return (
    <div className={`rounded-lg border p-3 ${box}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`mt-1 ${size} ${color}`}>{value}</div>
    </div>
  );
}

// One aging bucket. An empty bucket stays muted; anything in the "Over 90 days"
// bucket is tinted red so a genuinely overdue chunk stands out at a glance.
function AgingBox({
  label,
  hint,
  value,
  overdue = false,
}: {
  label: string;
  hint?: string;
  value: number;
  overdue?: boolean;
}) {
  const has = value > 0.005;
  return (
    <div
      className={`rounded-lg border p-3 ${
        has && overdue
          ? "border-red-200 bg-red-50"
          : has
            ? "border-slate-200 bg-white"
            : "border-slate-100 bg-slate-50/50"
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
        {hint && <span className="ml-1 normal-case tracking-normal">· {hint}</span>}
      </div>
      <div
        className={`mt-1 text-sm font-semibold ${
          has ? (overdue ? "text-red-700" : "text-slate-800") : "text-slate-400"
        }`}
      >
        {fmtMoney(value)}
      </div>
    </div>
  );
}
