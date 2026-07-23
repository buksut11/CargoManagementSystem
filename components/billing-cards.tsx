"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Field, inputClass } from "@/components/ui";
import { BuildingIcon, PhoneIcon, WalletIcon } from "@/components/icons";
import { PLANS, type Plan } from "@/lib/plans";
import { useT } from "@/lib/i18n";

// Per-provider accent styling, kept as literal class strings so Tailwind's
// compiler can see them (no dynamic `bg-${x}`).
type Accent = {
  bar: string; // thin colour strip along the top of the card
  chip: string; // logo tile
  price: string; // price tag text
  button: string; // CTA fill + shadow
  focus: string; // input focus border + ring
};

// The shared input style, minus its built-in blue focus colours, so each
// provider can tint the field's focus border/ring with its own brand colour.
// (`focus:ring-2` — the ring width — has no "blue" in it and is kept.)
const fieldBase = inputClass
  .split(" ")
  .filter((c) => !c.includes("blue"))
  .join(" ");

// Real brand colours, sampled from each provider's official logo:
//   EVC Plus (Hormuud)  green  #009048
//   eDahab (Somtel)     gold   #f0c000  (deeper #b8860b fill keeps white text legible)
//   Premier Bank        navy   #003078
// Dark-mode text uses a lighter tint of each so it stays readable on the dark
// card. Arbitrary hex values are literal strings so Tailwind can compile them.
const ACCENTS: Record<string, Accent> = {
  green: {
    bar: "bg-[#009048]",
    chip: "bg-[#009048]/15 text-[#009048] dark:text-[#2fbf74]",
    price: "text-[#009048] dark:text-[#2fbf74]",
    button:
      "bg-[#009048] hover:bg-[#00753a] shadow-[#009048]/30 focus-visible:ring-[#009048]",
    focus: "focus:border-[#009048] focus:ring-[#009048]/30",
  },
  gold: {
    bar: "bg-[#f0c000]",
    chip: "bg-[#f0c000]/15 text-[#a67c00] dark:text-[#e0b400]",
    price: "text-[#a67c00] dark:text-[#e0b400]",
    button:
      "bg-[#b8860b] hover:bg-[#9a7009] shadow-[#f0c000]/30 focus-visible:ring-[#f0c000]",
    focus: "focus:border-[#f0c000] focus:ring-[#f0c000]/35",
  },
  navy: {
    bar: "bg-[#003078]",
    chip: "bg-[#003078]/15 text-[#003078] dark:text-[#7b9fe0]",
    price: "text-[#003078] dark:text-[#7b9fe0]",
    button:
      "bg-[#003078] hover:bg-[#00265e] shadow-[#003078]/30 focus-visible:ring-[#003078]",
    focus: "focus:border-[#003078] focus:ring-[#003078]/35",
  },
};

// One payment provider the org can upgrade the Pro plan with. Each is a separate
// gateway with its own route; the card handles its own account field + charge.
type Provider = {
  id: "evc" | "edahab" | "premier";
  name: string;
  tag: string;
  endpoint: string;
  label: string;
  placeholder: string;
  hint: string;
  accent: keyof typeof ACCENTS;
  icon: React.ReactNode;
};

const PROVIDERS: Provider[] = [
  {
    id: "evc",
    name: "EVC Plus",
    tag: "Hormuud - EVC Plus",
    endpoint: "/api/evc/charge",
    label: "EVC number",
    placeholder: "0615714971",
    hint: "You'll approve the payment with your PIN on this phone.",
    accent: "green",
    icon: <WalletIcon />,
  },
  {
    id: "edahab",
    name: "eDahab",
    tag: "Somtel · Dahabshiil",
    endpoint: "/api/edahab/charge",
    label: "eDahab number",
    placeholder: "0625714971",
    hint: "You'll approve the payment with your PIN on this phone.",
    accent: "gold",
    icon: <WalletIcon />,
  },
  {
    id: "premier",
    name: "Premier Bank",
    tag: "Premier Wallet",
    endpoint: "/api/premier/charge",
    label: "Account or phone",
    placeholder: "0615714971",
    hint: "You'll confirm the payment through Premier Bank.",
    accent: "navy",
    icon: <BuildingIcon />,
  },
];

// The billing block on the Settings page: one card per payment provider (EVC
// Plus, eDahab, Premier Bank). When the org is already on Pro the provider cards
// are replaced by a single active confirmation.
export function BillingCards({
  orgId,
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
  const t = useT();
  // Always the Pro price — these cards upgrade to Pro regardless of the org's
  // current plan (reading the current plan's label showed the free "$0").
  const proPrice = PLANS.pro.priceLabel;

  if (paid) {
    return (
      <div className="glass-panel flex items-center gap-2 rounded-2xl p-4 text-sm text-emerald-600 dark:text-emerald-400 sm:p-5">
        <CheckMark />
        {t("Your organization is on the Pro plan")}
        {subStatus ? ` · ${subStatus}` : ""}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {PROVIDERS.map((p) => (
        <ProviderCard
          key={p.id}
          provider={p}
          orgId={orgId}
          price={proPrice}
          onUpgraded={onUpgraded}
        />
      ))}
    </div>
  );
}

function ProviderCard({
  provider,
  orgId,
  price,
  onUpgraded,
}: {
  provider: Provider;
  orgId: string;
  price: string;
  onUpgraded: () => void;
}) {
  const t = useT();
  const accent = ACCENTS[provider.accent];
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
      setError(data.error ?? t("The payment could not be completed."));
      return;
    }
    setAccount("");
    setDone(true);
    onUpgraded();
  }

  return (
    <div className="glass-panel overflow-hidden rounded-2xl">
      {/* Accent strip gives each provider a distinct, branded identity. */}
      <div className={`h-1.5 w-full ${accent.bar}`} />

      <div className="p-4 sm:p-5">
        {/* Header: logo · name/tag · price. */}
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent.chip}`}
          >
            {provider.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {provider.name}
            </div>
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
              {provider.tag}
            </div>
          </div>
          <div className="shrink-0 text-right leading-tight">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Pro
            </div>
            <div className={`text-sm font-bold ${accent.price}`}>{price}</div>
          </div>
        </div>

        <div className="my-4 h-px bg-slate-200/70 dark:bg-white/10" />

        <form onSubmit={pay} className="space-y-3">
          <Field label={t(provider.label)} hint={t(provider.hint)}>
            <div className="relative">
              <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={provider.placeholder}
                className={`${fieldBase} pl-9 ${accent.focus}`}
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

          <button
            type="submit"
            disabled={busy || !account.trim()}
            className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50 ${accent.button}`}
          >
            {busy ? (
              <>
                <Spinner />
                {t("Confirming…")}
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                {t("Pay {price}", { price })}
              </>
            )}
          </button>

          {busy && (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              {t("A prompt was sent to {account} — approve it with your PIN.", {
                account: account.trim(),
              })}
            </p>
          )}
        </form>

        {done && (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckMark />
            {t("Payment received — you're now on the Pro plan.")}
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Lock className="h-3 w-3" />
          {t("Secured · {tag}", { tag: provider.tag })}
        </p>
      </div>
    </div>
  );
}

function Lock({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
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
