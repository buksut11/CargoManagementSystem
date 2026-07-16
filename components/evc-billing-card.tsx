"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Field, Input, Section } from "@/components/ui";
import { PhoneIcon, WalletIcon } from "@/components/icons";
import type { Plan } from "@/lib/plans";

// The three mobile wallets one WaafiPay merchant account covers, in their
// recognisable brand colours so Somali users spot their provider at a glance.
const WALLETS = [
  { name: "EVC Plus", dot: "bg-emerald-500" },
  { name: "ZAAD", dot: "bg-sky-500" },
  { name: "Sahal", dot: "bg-amber-500" },
];

// Billing card for the Settings page: upgrade an organization to the Pro plan
// by paying with EVC Plus / ZAAD / Sahal through WaafiPay. Owns its own payment
// state and talks to /api/evc/charge; calls onUpgraded() so the parent can
// reflect the new plan without a refetch.
export function EvcBillingCard({
  orgId,
  plan,
  paid,
  subStatus,
  onUpgraded,
}: {
  orgId: string;
  plan: Plan;
  paid: boolean;
  subStatus: string | null;
  onUpgraded: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function payWithEvc(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/evc/charge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token ?? ""}`,
      },
      body: JSON.stringify({ orgId, phone: phone.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "The payment could not be completed.");
      return;
    }
    setPhone("");
    setDone(true);
    onUpgraded();
  }

  return (
    <Section icon={<WalletIcon />} title="Billing" subtitle="Powered by WaafiPay">
      {/* Plan banner — a soft blue field that states the plan and its price. */}
      <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-500/10 to-blue-500/[0.03] p-4 dark:border-blue-400/20 dark:from-blue-400/10 dark:to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                Pro plan
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  paid
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-500 dark:bg-white/[0.08] dark:text-slate-300"
                }`}
              >
                {paid ? `Active${subStatus ? ` · ${subStatus}` : ""}` : "Not active"}
              </span>
            </div>
            <ul className="mt-2 space-y-1">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
                >
                  <CheckMark />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {plan.priceLabel}
            </div>
          </div>
        </div>
      </div>

      {paid ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckMark />
          Your organization is on the Pro plan.
        </p>
      ) : (
        <>
          {/* Supported wallets. */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {WALLETS.map((w) => (
              <span
                key={w.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
              >
                <span className={`h-2 w-2 rounded-full ${w.dot}`} />
                {w.name}
              </span>
            ))}
          </div>

          <form onSubmit={payWithEvc} className="mt-4 space-y-3">
            <Field
              label="Mobile-money number"
              hint="You'll approve the payment with your PIN on this phone."
            >
              <div className="relative">
                <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0615000000"
                  className="pl-9"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setDone(false);
                    setError(null);
                  }}
                  required
                />
              </div>
            </Field>

            <Button
              type="submit"
              disabled={busy || !phone.trim()}
              className="flex w-full items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <Spinner />
                  Check your phone…
                </>
              ) : (
                `Pay ${plan.priceLabel} with EVC`
              )}
            </Button>

            {busy && (
              <p className="text-center text-xs text-blue-600 dark:text-blue-400">
                A prompt was sent to {phone.trim()} — enter your PIN to approve.
              </p>
            )}
          </form>
        </>
      )}

      {done && !paid && (
        <p className="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckMark />
          Payment received — you&apos;re now on the Pro plan.
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      )}

      <p className="mt-3 text-center text-[11px] text-slate-400">
        Secured by WaafiPay · Hormuud, Telesom &amp; Golis wallets
      </p>
    </Section>
  );
}

function CheckMark() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0 text-emerald-500"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.29 6.8-6.8a1 1 0 0 1 1.4 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-current"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z"
      />
    </svg>
  );
}
