"use client";

import Link from "next/link";
import { useOrg } from "@/components/org-context";
import { daysUntil, graceEndsAt, inGrace, isFrozen } from "@/lib/plans";
import { fmtDate } from "@/lib/format";

// The subscription lifecycle banner, pinned above every page:
//   - renewal reminder (amber) for admins in the last days of the billing month;
//   - grace-period countdown (rose) for admins once the due date has passed;
//   - frozen / read-only notice (rose, bold) for EVERY role — the whole app
//     stays browsable, but the database rejects writes until payment.
// Renders nothing when there is nothing to say (or pre-0044 databases).
export function BillingBanner() {
  const org = useOrg();
  const billing = org?.billing;
  if (!org || !billing || !billing.periodEnd) return null;

  const isAdmin = org.role === "owner" || org.role === "admin";

  if (isFrozen(billing.status)) {
    return (
      <Banner tone="frozen">
        <span>
          <strong>Account frozen — read-only.</strong> The subscription is
          unpaid, so changes are disabled. All data is safe and untouched.{" "}
          {isAdmin
            ? "Settle the invoice to restore full access instantly."
            : "Ask an organization admin to settle the invoice."}
        </span>
        {isAdmin && <PayNow label="Pay now" />}
      </Banner>
    );
  }

  // Reminder and grace speak to the people who can pay.
  if (!isAdmin) return null;

  if (inGrace(billing.status)) {
    const until = graceEndsAt(billing.periodEnd);
    return (
      <Banner tone="grace">
        <span>
          <strong>Payment overdue.</strong> Service continues during the grace
          period, until <strong>{fmtDate(until.toISOString())}</strong> — after
          that the account becomes read-only until payment.
        </span>
        {/* Price is intentionally omitted: each org can have its own monthly
            amount (migration 0045); Settings shows the exact figure. */}
        <PayNow label="Pay now" />
      </Banner>
    );
  }

  const days = daysUntil(billing.periodEnd);
  if (days <= billing.reminderDays) {
    return (
      <Banner tone="reminder">
        <span>
          Your billing month ends{" "}
          <strong>
            {days <= 0
              ? "today"
              : days === 1
                ? "tomorrow"
                : `in ${days} days (${fmtDate(billing.periodEnd)})`}
          </strong>
          . Renew to keep uninterrupted access.
        </span>
        <PayNow label="Renew now" />
      </Banner>
    );
  }

  return null;
}

const TONES = {
  reminder:
    "border-amber-300/70 bg-amber-50/90 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200",
  grace:
    "border-rose-300/70 bg-rose-50/90 text-rose-900 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200",
  frozen:
    "border-rose-400/80 bg-rose-100/90 text-rose-900 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-100",
} as const;

function Banner({
  tone,
  children,
}: {
  tone: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={`no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm backdrop-blur ${TONES[tone]}`}
    >
      {children}
    </div>
  );
}

function PayNow({ label }: { label: string }) {
  return (
    <Link
      href="/settings"
      className="shrink-0 rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700"
    >
      {label}
    </Link>
  );
}
