"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { FlightAuditEntry } from "@/lib/types";
import { bookingRef, fmtDateTime } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Td, Th } from "@/components/ui";

const ACTION_LABEL: Record<FlightAuditEntry["action"], string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
};

const ACTION_CLASS: Record<FlightAuditEntry["action"], string> = {
  create:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  delete: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
};

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function Changes({ entry }: { entry: FlightAuditEntry }) {
  if (!entry.changes) return null;
  return (
    <ul className="space-y-0.5">
      {Object.entries(entry.changes).map(([field, c]) => (
        <li
          key={field}
          className="text-xs text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400"
        >
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {field.replace(/_/g, " ")}:
          </span>{" "}
          <span className="break-all">
            {fmtVal(c.from)} → {fmtVal(c.to)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Actor({ entry }: { entry: FlightAuditEntry }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span>{entry.user_email ?? "system"}</span>
      {entry.user_role && (
        <Badge
          className={
            entry.user_role === "agent"
              ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
              : "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300"
          }
        >
          {entry.user_role}
        </Badge>
      )}
    </span>
  );
}

export default function FlightAuditPage() {
  const [entries, setEntries] = useState<FlightAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("flight_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300)
      .then(({ data }) => {
        setEntries((data as FlightAuditEntry[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <PageHeader title="Activity" />
      <Card className="table-scroll">
        <div className="space-y-3 p-3 lg:hidden">
          {entries.map((e) => (
            <div
              key={e.id}
              className="rounded-2xl border border-slate-200/60 bg-white/40 p-4 shadow-sm dark:bg-white/[0.04] dark:border-white/10"
            >
              <div className="flex items-center justify-between gap-2">
                <Actor entry={e} />
                <Badge className={ACTION_CLASS[e.action]}>
                  {ACTION_LABEL[e.action]}
                </Badge>
              </div>
              <div className="mt-1 text-sm">
                {e.booking_id ? (
                  <Link
                    href={`/flights/bookings/${e.booking_id}`}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {bookingRef(e.booking_id)}
                  </Link>
                ) : null}{" "}
                {e.booking_ref}
              </div>
              <div className="mt-1.5">
                <Changes entry={e} />
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {fmtDateTime(e.created_at)}
              </div>
            </div>
          ))}
        </div>
        <table className="hidden w-full lg:table">
          <thead className="border-b border-slate-200/60 dark:border-white/10">
            <tr>
              <Th>When</Th>
              <Th>Who</Th>
              <Th>Action</Th>
              <Th>Booking</Th>
              <Th>Changes</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
            {entries.map((e) => (
              <tr
                key={e.id}
                className="align-top hover:bg-white/60 dark:hover:bg-white/[0.08]"
              >
                <Td className="whitespace-nowrap">{fmtDateTime(e.created_at)}</Td>
                <Td>
                  <Actor entry={e} />
                </Td>
                <Td>
                  <Badge className={ACTION_CLASS[e.action]}>
                    {ACTION_LABEL[e.action]}
                  </Badge>
                </Td>
                <Td>
                  {e.booking_id ? (
                    <Link
                      href={`/flights/bookings/${e.booking_id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {bookingRef(e.booking_id)}
                    </Link>
                  ) : (
                    "—"
                  )}
                  {e.booking_ref && (
                    <div className="max-w-48 truncate text-xs text-slate-500 dark:text-slate-400">
                      {e.booking_ref}
                    </div>
                  )}
                </Td>
                <Td>
                  <div className="max-w-md">
                    <Changes entry={e} />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && entries.length === 0 && (
          <EmptyState message="No activity recorded yet — booking changes will appear here." />
        )}
      </Card>
    </div>
  );
}
