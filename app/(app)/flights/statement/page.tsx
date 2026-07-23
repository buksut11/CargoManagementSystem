"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/org-context";
import type {
  BookingPayment,
  BookingRefund,
  FlightBooking,
  FlightCustomer,
  FlightPassenger,
  Organization,
} from "@/lib/types";
import {
  bookingRef,
  fmtDate,
  fmtMoney,
  passengerTypeLabel,
  REVERSED_IN_LIST,
} from "@/lib/format";
import {
  Card,
  Field,
  PageHeader,
  Section,
  Select,
} from "@/components/ui";
import { DatePicker } from "@/components/date-picker";
import {
  MailIcon,
  PhoneIcon,
  PinIcon,
  StatementIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";
import { useT } from "@/lib/i18n";

// One movement on the account: a charge (booking) or a credit (payment/refund).
// `sort` disambiguates several entries that share a date so the running balance
// is deterministic (charges before the credits that settle them).
type Line = {
  date: string;
  ref: string;
  description: string;
  sub?: string; // secondary detail (travel date · passenger · airline)
  debit: number;
  credit: number;
  sort: number;
};

// The slice of a flight segment we need to draw a booking's route.
type SegmentRow = {
  booking_id: number;
  segment_no: number;
  origin: string | null;
  destination: string | null;
};

// Whole days between two YYYY-MM-DD dates (UTC so no timezone drift). Used to
// age each unpaid charge for the receivables summary.
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

export default function FlightStatementPage() {
  const t = useT();
  const router = useRouter();
  const org = useOrg();

  const [customers, setCustomers] = useState<FlightCustomer[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>(TODAY);

  const [orgHeader, setOrgHeader] = useState<OrgHeader | null>(null);
  const [allLines, setAllLines] = useState<Line[] | null>(null);
  const [loadingLines, setLoadingLines] = useState(false);

  const customer = useMemo(
    () => customers.find((c) => String(c.id) === customerId) ?? null,
    [customers, customerId],
  );

  // Customers (for the picker) and the org letterhead — loaded once. Also
  // preselects the customer when arriving from a deep link
  // (/flights/statement?customer=123), e.g. the Customers list.
  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        router.replace("/login");
        return;
      }
      const cid = new URLSearchParams(window.location.search).get("customer");
      if (cid) setCustomerId(cid);

      const { data } = await supabase
        .from("flight_customers")
        .select("*")
        .order("name");
      setCustomers((data as FlightCustomer[]) ?? []);

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

  // Every recognised movement on the selected customer's account — reloaded
  // whenever the customer changes. The date range is applied in memory (below)
  // so switching dates never re-hits the network.
  useEffect(() => {
    let active = true;
    async function load() {
      if (!customerId) {
        setAllLines(null);
        return;
      }
      setLoadingLines(true);
      const { data: b } = await supabase
        .from("flight_bookings")
        .select("*")
        .eq("customer_id", Number(customerId))
        .not("status", "in", REVERSED_IN_LIST)
        .order("booking_date");
      const bookings = (b as FlightBooking[]) ?? [];
      const ids = bookings.map((r) => r.id);

      let payments: BookingPayment[] = [];
      let refunds: BookingRefund[] = [];
      let passengers: FlightPassenger[] = [];
      let segments: SegmentRow[] = [];
      if (ids.length) {
        const [p, r, pax, seg] = await Promise.all([
          supabase.from("booking_payments").select("*").in("booking_id", ids),
          supabase.from("booking_refunds").select("*").in("booking_id", ids),
          supabase
            .from("flight_passengers")
            .select("booking_id, full_name, type")
            .in("booking_id", ids),
          supabase
            .from("flight_segments")
            .select("booking_id, segment_no, origin, destination")
            .in("booking_id", ids)
            .order("segment_no"),
        ]);
        payments = (p.data as BookingPayment[]) ?? [];
        refunds = (r.data as BookingRefund[]) ?? [];
        passengers = (pax.data as FlightPassenger[]) ?? [];
        segments = (seg.data as SegmentRow[]) ?? [];
      }

      // Every passenger on a booking, each tagged with their type, e.g.
      // "Amina Yusuf (Adult), Omar Ali (Child)" — the full manifest, not a count.
      const paxByBooking = new Map<number, string[]>();
      for (const px of passengers) {
        const list = paxByBooking.get(px.booking_id) ?? [];
        list.push(`${px.full_name} (${t(passengerTypeLabel(px.type))})`);
        paxByBooking.set(px.booking_id, list);
      }
      const paxLabel = (bookingId: number): string =>
        (paxByBooking.get(bookingId) ?? []).join(", ");

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

      const rows: Line[] = [
        ...bookings.map((bk) => {
          const route = routeLabel(bk.id);
          const pax = paxLabel(bk.id);
          // Main label carries the route so the journey reads at a glance;
          // the secondary line holds passengers, travel date and airline.
          const description = [t("Air ticket"), route, bk.pnr ? t("PNR {pnr}", { pnr: bk.pnr }) : ""]
            .filter(Boolean)
            .join(" · ");
          const detail = [
            pax,
            bk.travel_date ? t("Travel {date}", { date: fmtDate(bk.travel_date) }) : "",
            bk.airline || "",
          ]
            .filter(Boolean)
            .join(" · ");
          return {
            date: bk.booking_date,
            ref: bookingRef(bk.id),
            description,
            sub: detail || undefined,
            debit: Number(bk.sale_total),
            credit: 0,
            sort: 0,
          };
        }),
        ...payments.map((p) => ({
          date: p.paid_date,
          ref: bookingRef(p.booking_id),
          description: `${t("Payment received")}${p.method ? ` (${p.method})` : ""}`,
          debit: 0,
          credit: Number(p.amount),
          sort: 1,
        })),
        ...refunds.map((r) => ({
          date: r.refund_date,
          ref: bookingRef(r.booking_id),
          description:
            r.refund_type === "void"
              ? t("Void credit")
              : r.refund_type === "reissue"
                ? t("Reissue credit")
                : t("Refund credit"),
          debit: 0,
          credit: Number(r.customer_refund),
          sort: 1,
        })),
      ].sort((a, c) => a.date.localeCompare(c.date) || a.sort - c.sort);

      if (active) {
        setAllLines(rows);
        setLoadingLines(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [customerId, t]);

  // Split the full history around the chosen window. Everything before `from`
  // collapses into a single opening balance so the running balance a customer
  // sees is correct — not a period total that ignores what they already owed.
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

    // Receivables aging: what makes up the balance due, by how long each unpaid
    // charge has gone unsettled. Age the *whole* account as of the statement
    // date (the balance due includes the opening balance), applying every
    // credit to the oldest charges first (FIFO). Buckets sum to the balance due.
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
    : t("All activity through {date}", { date: fmtDate(to || TODAY) });

  return (
    <div>
      {/* Controls — never printed; the sheet below is the document. */}
      <div className="no-print">
        <PageHeader title={t("Customer statement")} />
        <Section
          icon={<StatementIcon className="h-5 w-5" />}
          title={t("Build a statement")}
          subtitle={t("Pick a customer and a date range, then print or save as PDF.")}
          className="mb-6"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <Field label={t("Customer")}>
                <Select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">{t("Select a customer…")}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={t("From")}>
              <DatePicker
                value={from}
                onChange={setFrom}
                placeholder={t("Beginning")}
              />
            </Field>
            <Field label={t("To")}>
              <DatePicker value={to} onChange={setTo} placeholder={t("Today")} />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("Quick range:")}
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur transition-colors hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.12]"
              >
                {t(p.label)}
              </button>
            ))}
          </div>

          {customerId && (
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => window.print()}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700"
              >
                {t("🖨 Print / Save as PDF")}
              </button>
              <Link
                href="/flights/customers"
                className="rounded-full border border-white/60 bg-white/35 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur transition-colors hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.1]"
              >
                {t("← Back to customers")}
              </Link>
            </div>
          )}
        </Section>
      </div>

      {/* Nothing selected yet — a friendly prompt (screen only). */}
      {!customerId && (
        <Card className="no-print p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
            <UsersIcon />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("Choose a customer above to build their statement of account.")}
          </p>
        </Card>
      )}

      {/* The printable document. */}
      {customerId && customer && (
        <div className="mx-auto max-w-3xl bg-white p-6 text-slate-900 shadow-sm print:max-w-none print:p-0 print:shadow-none sm:p-8">
          <div className="border border-slate-300 p-6 sm:p-10">
            {/* Letterhead */}
            <div className="flex flex-col items-center gap-1 text-center">
              {orgHeader?.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={orgHeader.logo_url}
                  alt={`${orgHeader.name} logo`}
                  className="h-24 w-auto max-w-[320px] shrink-0 object-contain"
                />
              )}
              {/* The name is only shown as text when there's no logo — a logo
                  typically already includes the organization's name. */}
              {!orgHeader?.logo_url && (
                <div className="text-2xl font-bold leading-tight">
                  {orgHeader?.name ?? org?.orgName ?? "✈️ CargoBook"}
                </div>
              )}
              {orgHeader?.address && (
                <div className="whitespace-pre-line text-xs text-slate-600">
                  {orgHeader.address}
                </div>
              )}
              {(orgHeader?.phone || orgHeader?.email) && (
                <div className="text-xs text-slate-600">
                  {[orgHeader.phone, orgHeader.email].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>

            <div className="mt-4 text-center text-lg font-bold uppercase tracking-wide text-slate-800">
              {t("Statement of account")}
            </div>

            {/* Bill-to + meta */}
            <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm">
              <div className="text-slate-600">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t("Statement for")}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-base font-semibold text-slate-900">
                  <UserIcon className="h-4 w-4 shrink-0 text-slate-400" />
                  {customer.name}
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-1.5">
                    <PhoneIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {customer.phone}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-1.5">
                    <MailIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {customer.email}
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-1.5">
                    <PinIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {customer.address}
                  </div>
                )}
              </div>
              <div className="text-right text-slate-600">
                <div>
                  <span className="text-slate-400">{t("Period:")} </span>
                  {periodLabel}
                </div>
                <div>
                  <span className="text-slate-400">{t("Issued:")} </span>
                  {fmtDate(TODAY)}
                </div>
                {view && (
                  <div>
                    <span className="text-slate-400">{t("Entries:")} </span>
                    {view.period.length}
                  </div>
                )}
              </div>
            </div>

            {/* Summary strip */}
            {view && (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryBox label={t("Opening balance")} value={fmtMoney(view.opening)} />
                <SummaryBox label={t("Charges")} value={fmtMoney(view.charges)} />
                <SummaryBox
                  label={t("Payments & credits")}
                  value={fmtMoney(view.credits)}
                />
                <SummaryBox
                  label={t("Balance due")}
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
                  <th className="py-2 pr-2">{t("Date")}</th>
                  <th className="py-2 pr-2">{t("Ref")}</th>
                  <th className="py-2 pr-2">{t("Description")}</th>
                  <th className="py-2 pr-2 text-right">{t("Charge")}</th>
                  <th className="py-2 pr-2 text-right">{t("Payment")}</th>
                  <th className="py-2 text-right">{t("Balance")}</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening balance carried forward (only when a start date trims
                    off earlier history). */}
                {view && from && (
                  <tr className="border-b border-slate-200 text-slate-500">
                    <td className="py-2 pr-2 whitespace-nowrap">{fmtDate(from)}</td>
                    <td className="py-2 pr-2">—</td>
                    <td className="py-2 pr-2 italic">{t("Balance brought forward")}</td>
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
                        ? t("Loading…")
                        : t("No transactions in this date range.")}
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
                    {t("Opening balance")}: {fmtMoney(view.opening)}
                  </div>
                )}
                <div className="text-slate-600">
                  {t("Total charged")}: {fmtMoney(view.charges)}
                </div>
                <div className="text-slate-600">
                  {t("Total payments & credits")}: {fmtMoney(view.credits)}
                </div>
                <div className="flex items-baseline justify-end gap-4 pt-1">
                  <span className="text-sm text-slate-500">{t("Balance due")}</span>
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
                    {t("Account fully settled")}
                    {view.closing < 0
                      ? ` ${t("(credit {amount})", { amount: fmtMoney(-view.closing) })}`
                      : ""}
                    .
                  </div>
                )}
              </div>
            )}

            {/* Aging — how the balance due breaks down by how overdue it is.
                Only meaningful when the customer actually owes money. */}
            {view && view.closing > 0.005 && (
              <div className="mt-8">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t("Balance due by age")}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <AgingBox label={t("Current")} hint={t("0–30 days")} value={view.aging.current} />
                  <AgingBox label={t("31–60 days")} value={view.aging.d31} />
                  <AgingBox label={t("61–90 days")} value={view.aging.d61} />
                  <AgingBox label={t("Over 90 days")} value={view.aging.d90} overdue />
                </div>
              </div>
            )}

            <p className="mt-10 text-center text-xs text-slate-400">
              {t("Generated by")} {orgHeader?.name ?? org?.orgName ?? "CargoBook"} ·{" "}
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
