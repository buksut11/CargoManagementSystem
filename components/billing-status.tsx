"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Section } from "@/components/ui";
import { ClockIcon } from "@/components/icons";
import { fmtDate, fmtDateTime } from "@/lib/format";
import {
  daysUntil,
  graceEndsAt,
  inGrace,
  isFrozen,
  type BillingState,
} from "@/lib/plans";

// The subscription card on Settings: where the billing month stands (renewal
// date, days left, grace deadline, frozen notice), the open invoice if there
// is one, and the in-app billing notifications with mark-as-read. Renders
// nothing on databases that predate migration 0044.

type OpenInvoice = {
  id: number;
  amount: number;
  currency: string;
  due_at: string;
  grace_until: string;
};

type Notification = {
  id: number;
  kind: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

const KIND_DOT: Record<string, string> = {
  reminder: "bg-amber-500",
  due: "bg-amber-500",
  grace: "bg-rose-500",
  frozen: "bg-rose-600",
  paid: "bg-emerald-500",
};

export function BillingStatus({
  orgId,
  refreshKey = 0,
}: {
  orgId: string;
  // Bump to refetch (e.g. right after a successful payment).
  refreshKey?: number;
}) {
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [invoice, setInvoice] = useState<OpenInvoice | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!orgId) return;
    let active = true;

    // On a pre-0044 database each of these errors and returns null data, so
    // the card simply renders nothing.
    supabase
      .from("organizations")
      .select("subscription_status, current_period_end, billing_reminder_days")
      .eq("id", orgId)
      .single()
      .then(({ data: org, error }) => {
        if (!active || error || !org) return;
        setBilling({
          status: org.subscription_status ?? null,
          periodEnd: org.current_period_end ?? null,
          reminderDays: org.billing_reminder_days ?? 5,
        });
      });

    supabase
      .from("subscription_invoices")
      .select("id, amount, currency, due_at, grace_until")
      .eq("organization_id", orgId)
      .eq("status", "open")
      .order("due_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data: inv }) => {
        if (active) setInvoice((inv as OpenInvoice) ?? null);
      });

    supabase
      .from("billing_notifications")
      .select("id, kind, title, body, read_at, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data: notes }) => {
        if (active) setNotifications((notes as Notification[]) ?? []);
      });

    return () => {
      active = false;
    };
  }, [orgId, refreshKey]);

  async function markRead(id: number) {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    );
    await supabase
      .from("billing_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
  }

  if (!billing || !billing.periodEnd) return null;

  const frozen = isFrozen(billing.status);
  const grace = inGrace(billing.status);
  const days = daysUntil(billing.periodEnd);
  const unread = notifications.filter((n) => !n.read_at).length;

  const chip = frozen
    ? { label: "Frozen — read-only", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" }
    : grace
      ? { label: "Grace period", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" }
      : days <= billing.reminderDays
        ? { label: "Renewal due soon", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" }
        : { label: "Active", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" };

  return (
    <Section
      icon={<ClockIcon />}
      title="Subscription"
      subtitle="Your monthly billing cycle. Payment methods are below; your data is never deleted, whatever the status."
      className="mb-4"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${chip.cls}`}>
          {chip.label}
        </span>
        <span className="text-slate-600 dark:text-slate-300">
          {frozen || grace ? (
            <>
              Payment was due <strong>{fmtDate(billing.periodEnd)}</strong>
              {grace && (
                <>
                  {" "}
                  — grace ends{" "}
                  <strong>
                    {fmtDate(
                      (invoice?.grace_until ??
                        graceEndsAt(billing.periodEnd).toISOString()),
                    )}
                  </strong>
                </>
              )}
            </>
          ) : (
            <>
              Current month ends <strong>{fmtDate(billing.periodEnd)}</strong>
              {days >= 0 && (
                <span className="text-slate-400">
                  {" "}
                  ({days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} left`})
                </span>
              )}
            </>
          )}
        </span>
      </div>

      {invoice && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Open invoice:{" "}
          <strong>
            {invoice.currency} {Number(invoice.amount).toFixed(2)}
          </strong>{" "}
          · due {fmtDate(invoice.due_at)} — pay with any method below.
        </p>
      )}

      {notifications.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Notifications
            {unread > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                {unread} new
              </span>
            )}
          </div>
          <ul className="divide-y divide-slate-200/60 dark:divide-white/10">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-start gap-3 py-2.5">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    KIND_DOT[n.kind] ?? "bg-slate-400"
                  } ${n.read_at ? "opacity-30" : ""}`}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm ${
                      n.read_at
                        ? "text-slate-500 dark:text-slate-400"
                        : "font-medium text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {n.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {n.body}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {fmtDateTime(n.created_at)}
                  </div>
                </div>
                {!n.read_at && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}
