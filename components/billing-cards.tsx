"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Field, Input } from "@/components/ui";
import { BuildingIcon, PhoneIcon, WalletIcon } from "@/components/icons";
import type { Plan } from "@/lib/plans";

// One payment provider the org can upgrade the Pro plan with. Each is a separate
// gateway with its own route; the card handles its own account field + charge.
type Provider = {
  id: "evc" | "edahab" | "premier";
  name: string;
  tag: string;
  endpoint: string;
  label: string;
  placeholder: string;
  // Tailwind classes for the coloured logo chip — kept static so Tailwind can
  // see them (no dynamic `bg-${x}` strings).
  chip: string;
  icon: React.ReactNode;
};

const PROVIDERS: Provider[] = [
  {
    id: "evc",
    name: "EVC Plus",
    tag: "Hormuud · via WaafiPay",
    endpoint: "/api/evc/charge",
    label: "EVC number",
    placeholder: "0615000000",
    chip: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
    icon: <WalletIcon />,
  },
  {
    id: "edahab",
    name: "eDahab",
    tag: "Somtel · Dahabshiil",
    endpoint: "/api/edahab/charge",
    label: "eDahab number",
    placeholder: "0625000000",
    chip: "bg-sky-500/15 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300",
    icon: <WalletIcon />,
  },
  {
    id: "premier",
    name: "Premier Bank",
    tag: "Premier Wallet",
    endpoint: "/api/premier/charge",
    label: "Account or phone",
    placeholder: "0617000000",
    chip: "bg-violet-500/15 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
    icon: <BuildingIcon />,
  },
];

// The billing block on the Settings page: a Pro-plan summary plus one card per
// payment provider (EVC Plus, eDahab, Premier Bank). When the org is already on
// Pro the provider cards are hidden and a single active card is shown instead.
export function BillingCards({
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
  return (
    <div className="space-y-4">
      {/* Pro-plan summary. */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5">
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
          <div className="shrink-0 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {plan.priceLabel}
          </div>
        </div>
      </div>

      {paid ? (
        <div className="glass-panel flex items-center gap-2 rounded-2xl p-4 text-sm text-emerald-600 dark:text-emerald-400 sm:p-5">
          <CheckMark />
          Your organization is on the Pro plan.
        </div>
      ) : (
        <>
          <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
            Choose how to pay for Pro:
          </p>
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              orgId={orgId}
              priceLabel={plan.priceLabel}
              onUpgraded={onUpgraded}
            />
          ))}
        </>
      )}
    </div>
  );
}

function ProviderCard({
  provider,
  orgId,
  priceLabel,
  onUpgraded,
}: {
  provider: Provider;
  orgId: string;
  priceLabel: string;
  onUpgraded: () => void;
}) {
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch(provider.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token ?? ""}`,
      },
      body: JSON.stringify({ orgId, account: account.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "The payment could not be completed.");
      return;
    }
    setAccount("");
    setDone(true);
    onUpgraded();
  }

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${provider.chip}`}
        >
          {provider.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {provider.name}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {provider.tag}
          </div>
        </div>
      </div>

      <form onSubmit={pay} className="space-y-3">
        <Field label={provider.label}>
          <div className="relative">
            <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={provider.placeholder}
              className="pl-9"
              value={account}
              onChange={(e) => {
                setAccount(e.target.value);
                setDone(false);
                setError(null);
              }}
              required
            />
          </div>
        </Field>

        <Button
          type="submit"
          disabled={busy || !account.trim()}
          className="flex w-full items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <Spinner />
              Confirming…
            </>
          ) : (
            `Pay ${priceLabel} with ${provider.name}`
          )}
        </Button>

        {busy && (
          <p className="text-center text-xs text-blue-600 dark:text-blue-400">
            A prompt was sent to {account.trim()} — approve it with your PIN.
          </p>
        )}
      </form>

      {done && (
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
    </div>
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
