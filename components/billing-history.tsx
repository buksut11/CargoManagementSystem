"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Section } from "@/components/ui";
import { ReceiptIcon } from "@/components/icons";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

// A single row from billing_transactions (migration 0042). Only the fields the
// list needs are selected.
type Txn = {
  id: number;
  provider: string;
  account: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

// How each provider reads in the list, with its accent dot colour.
const PROVIDER_META: Record<string, { name: string; dot: string }> = {
  evc: { name: "EVC Plus", dot: "bg-emerald-500" },
  edahab: { name: "eDahab", dot: "bg-sky-500" },
  premier: { name: "Premier Bank", dot: "bg-violet-500" },
};

// Masks all but the last 3 digits of the payer's number/account so the history
// doesn't display full phone numbers.
function maskAccount(account: string): string {
  const tail = account.slice(-3);
  return account.length > 3 ? `••• ${tail}` : account;
}

// The org's Pro-plan payment history, read straight from billing_transactions.
// RLS (migration 0042) only returns rows for orgs where the viewer is an admin,
// so non-admins simply see an empty list.
export function BillingHistory({ orgId }: { orgId: string }) {
  const tr = useT();
  const [rows, setRows] = useState<Txn[] | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    supabase
      .from("billing_transactions")
      .select("id, provider, account, amount, currency, status, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (active) setRows((data as Txn[]) ?? []);
      });
    return () => {
      active = false;
    };
  }, [orgId]);

  // Hide the whole section until we know there's something to show — keeps the
  // Settings page clean for orgs that have never paid (and for non-admins).
  if (!rows || rows.length === 0) return null;

  return (
    <Section
      icon={<ReceiptIcon />}
      title={tr("Billing history")}
      subtitle={tr("Pro-plan payment attempts, most recent first.")}
      className="mt-4"
    >
      <ul className="divide-y divide-slate-200/60 dark:divide-white/10">
        {rows.map((t) => {
          const meta = PROVIDER_META[t.provider] ?? {
            name: t.provider,
            dot: "bg-slate-400",
          };
          const approved = t.status === "approved";
          return (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {meta.name}
                  <span className="ml-2 font-normal text-slate-400">
                    {maskAccount(t.account)}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {fmtDateTime(t.created_at)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t.currency === "USD"
                    ? fmtMoney(Number(t.amount))
                    : `${Number(t.amount).toFixed(2)} ${t.currency}`}
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    approved
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {approved ? tr("Approved") : tr("Failed")}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
