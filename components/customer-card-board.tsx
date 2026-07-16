"use client";

import Link from "next/link";
import { fmtMoney } from "@/lib/format";
import {
  EditIcon,
  MailIcon,
  PhoneIcon,
  StatementIcon,
  TrashIcon,
} from "@/components/icons";

// The shared Customers card board, styled to mirror the Destinations pages:
// a compact stacked list on phones and a dense auto-fill card grid on tablets
// and up, with hover-lift cards and hover-revealed corner actions. Used by
// both the cargo and flight Customers pages so the two always match.

export type CustomerCardItem = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
};

// Same deterministic gradient set as the Destinations badges so the boards
// read as one family.
const BADGE_GRADIENTS = [
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-sky-600",
  "from-indigo-500 to-blue-600",
];

function gradientFor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return BADGE_GRADIENTS[Math.abs(hash) % BADGE_GRADIENTS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase() || "?";
}

// Leading badge sized and shaped exactly like the Destinations InitialBadge.
function AvatarBadge({ name }: { name: string }) {
  const gradient = gradientFor(name);
  return (
    <span
      className={`flex h-10 w-10 shrink-0 transform-gpu items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md shadow-black/10 ring-1 ring-white/40 transition-transform duration-300 ease-out will-change-transform group-hover:scale-105 motion-reduce:transform-none dark:ring-white/10`}
      aria-hidden
    >
      <span className="text-sm font-bold leading-none tracking-wide">
        {initials(name)}
      </span>
    </span>
  );
}

function StatusPill({
  name,
  due,
  onShowBreakdown,
}: {
  name: string;
  due: number;
  onShowBreakdown: () => void;
}) {
  if (due > 0) {
    return (
      <button
        type="button"
        onClick={onShowBreakdown}
        title={`See what makes up ${name}'s balance`}
        aria-label={`See what makes up ${name}'s balance of ${fmtMoney(due)}`}
        className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 transition-colors duration-200 ease-out hover:bg-amber-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 dark:bg-amber-400/15 dark:text-amber-400 dark:hover:bg-amber-400/25"
      >
        {fmtMoney(due)} due
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Settled
    </span>
  );
}

function CardActions<T extends CustomerCardItem>({
  customer,
  statementHref,
  onEdit,
  onDelete,
  revealOnHover,
}: {
  customer: T;
  statementHref: (c: T) => string;
  onEdit: (c: T) => void;
  onDelete: (c: T) => void;
  revealOnHover: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center gap-0.5 ${
        revealOnHover
          ? "transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 motion-reduce:transition-none"
          : ""
      }`}
    >
      <Link
        href={statementHref(customer)}
        title="View statement"
        aria-label={`View ${customer.name}'s statement`}
        className="rounded-lg p-1.5 text-slate-400 transition-colors duration-200 ease-out hover:bg-blue-500/10 hover:text-blue-600 dark:hover:bg-blue-400/10 dark:hover:text-blue-400"
      >
        <StatementIcon className="h-4 w-4" />
      </Link>
      <button
        onClick={() => onEdit(customer)}
        title="Edit"
        aria-label={`Edit ${customer.name}`}
        className="rounded-lg p-1.5 text-slate-400 transition-colors duration-200 ease-out hover:bg-slate-500/10 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-100"
      >
        <EditIcon className="h-4 w-4" />
      </button>
      <button
        onClick={() => onDelete(customer)}
        title="Delete"
        aria-label={`Delete ${customer.name}`}
        className="rounded-lg p-1.5 text-slate-400 transition-colors duration-200 ease-out hover:bg-red-500/10 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function CustomerCardBoard<T extends CustomerCardItem>({
  customers,
  balances,
  statementHref,
  onShowBreakdown,
  onEdit,
  onDelete,
}: {
  customers: T[];
  balances: Record<number, number>;
  statementHref: (c: T) => string;
  onShowBreakdown: (c: T) => void;
  onEdit: (c: T) => void;
  onDelete: (c: T) => void;
}) {
  if (customers.length === 0) return null;
  return (
    <>
      {/* Compact list on phones, exactly like the Destinations pages. */}
      <div className="space-y-2 p-3 sm:hidden">
        {customers.map((c) => {
          const due = balances[c.id] ?? 0;
          return (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/40 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <AvatarBadge name={c.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.name}</div>
                <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                  <PhoneIcon className="h-3 w-3 shrink-0 opacity-70" />
                  <span className="truncate">{c.phone || "No phone"}</span>
                  <StatusPill
                    name={c.name}
                    due={due}
                    onShowBreakdown={() => onShowBreakdown(c)}
                  />
                </div>
              </div>
              <CardActions
                customer={c}
                statementHref={statementHref}
                onEdit={onEdit}
                onDelete={onDelete}
                revealOnHover={false}
              />
            </div>
          );
        })}
      </div>

      {/* Dense card board on tablets and up, same card anatomy as Destinations:
          badge · name · icon subtitle lines · hover-revealed corner actions. */}
      <div className="hidden gap-2.5 p-3 sm:grid sm:[grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))]">
        {customers.map((c) => {
          const due = balances[c.id] ?? 0;
          return (
            <div
              key={c.id}
              className="group flex transform-gpu items-center gap-3 rounded-2xl border border-white/60 bg-white/40 p-3 shadow-sm transition-[transform,box-shadow,background-color] duration-300 ease-out will-change-transform hover:-translate-y-0.5 hover:bg-white/70 hover:shadow-lg hover:shadow-black/5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
            >
              <AvatarBadge name={c.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
                  {c.name}
                </div>
                <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                  <MailIcon className="h-3 w-3 shrink-0 opacity-70" />
                  <span className="truncate">{c.email || "No email"}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <PhoneIcon className="h-3 w-3 shrink-0 opacity-70" />
                  <span className="truncate tabular-nums">
                    {c.phone || "No phone"}
                  </span>
                  <StatusPill
                    name={c.name}
                    due={due}
                    onShowBreakdown={() => onShowBreakdown(c)}
                  />
                </div>
              </div>
              <CardActions
                customer={c}
                statementHref={statementHref}
                onEdit={onEdit}
                onDelete={onDelete}
                revealOnHover
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
