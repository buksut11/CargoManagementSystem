"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchCustomerBookingBreakdown,
  type CustomerBookingBreakdownLine,
} from "@/lib/balance";
import { fmtDate, fmtMoney } from "@/lib/format";
import { PlaneIcon, StatementIcon } from "@/components/icons";
import { CloseButton } from "@/components/ui";
import { useT } from "@/lib/i18n";

// Drill-down that answers "where does the $X due come from?" for one flight
// customer: the tickets still carrying a balance, each showing charged / paid /
// remaining and summing to the amount owed, with a link out to the statement.
//
// Self-fetching: given just a customer id + name it loads the per-booking
// breakdown itself and derives the total due from it, so every caller (the
// Customers list, the Bookings table, the Reports outstanding table) opens an
// identical, always-consistent panel with no balance figure to pass in.
export function FlightBreakdownModal({
  customerId,
  customerName,
  onClose,
}: {
  customerId: number;
  customerName: string;
  onClose: () => void;
}) {
  const t = useT();
  // Keep the fetched lines tagged with the customer they belong to. `lines` is
  // then derived: it reads as null (loading) until the result for the *current*
  // customer arrives, which also covers switching customers without resetting
  // state inside the effect (an anti-pattern the linter flags).
  const [fetched, setFetched] = useState<{
    forId: number;
    lines: CustomerBookingBreakdownLine[];
  } | null>(null);

  useEffect(() => {
    let active = true;
    fetchCustomerBookingBreakdown(customerId).then((l) => {
      if (active) setFetched({ forId: customerId, lines: l });
    });
    return () => {
      active = false;
    };
  }, [customerId]);

  const lines =
    fetched && fetched.forId === customerId ? fetched.lines : null;

  // Only the tickets that still owe make up the balance due; fully-settled
  // bookings are noise here. A tiny epsilon avoids float dust ($0.00 rows). The
  // total due is the sum of every line's remaining — the same figure the
  // customer balance and statement show.
  const owing = (lines ?? []).filter((l) => l.remaining > 0.005);
  const due = (lines ?? []).reduce((sum, l) => sum + l.remaining, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Balance breakdown for {name}", { name: customerName })}
        className="glass-panel relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/60 p-5 dark:border-white/[0.08]">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              {t("Balance due")}
            </div>
            <div className="mt-0.5 truncate text-lg font-bold text-slate-900 dark:text-slate-100">
              {lines === null ? "…" : fmtMoney(Math.max(due, 0))}
            </div>
            <div className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
              {customerName}
              {lines !== null && (
                <>
                  {" "}
                  ·{" "}
                  {owing.length === 1
                    ? t("made up of {count} ticket", { count: owing.length })
                    : t("made up of {count} tickets", { count: owing.length })}
                </>
              )}
            </div>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {/* Lines */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {lines === null ? (
            <div className="py-10 text-center text-sm text-slate-400">{t("Loading…")}</div>
          ) : owing.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              {t("No unpaid tickets — this balance may be from a rounding adjustment.")}
            </div>
          ) : (
            <ul className="space-y-2">
              {owing.map((l) => (
                <li key={l.bookingId}>
                  <Link
                    href={`/flights/bookings/${l.bookingId}`}
                    className="group flex items-center gap-3 rounded-2xl border border-white/60 bg-white/40 px-3.5 py-3 transition-colors hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.1]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400">
                      <PlaneIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <span className="tabular-nums">{l.ref}</span>
                        {l.route && (
                          <span className="truncate font-normal text-slate-500 dark:text-slate-400">
                            {l.route}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {fmtDate(l.date)}
                        {l.airline ? ` · ${l.airline}` : ""}
                        {" · "}
                        {l.paid > 0.005
                          ? t("{charged} charged, {paid} paid", {
                              charged: fmtMoney(l.charged),
                              paid: fmtMoney(l.paid),
                            })
                          : t("{charged} charged, unpaid", {
                              charged: fmtMoney(l.charged),
                            })}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-600 dark:bg-amber-400/15 dark:text-amber-400">
                      {fmtMoney(l.remaining)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200/60 p-4 dark:border-white/[0.08]">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t("Total due")}{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {lines === null ? "…" : fmtMoney(Math.max(due, 0))}
            </span>
          </span>
          <Link
            href={`/flights/statement?customer=${customerId}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700"
          >
            <StatementIcon className="h-4 w-4" />
            {t("Full statement")}
          </Link>
        </div>
      </div>
    </div>
  );
}
