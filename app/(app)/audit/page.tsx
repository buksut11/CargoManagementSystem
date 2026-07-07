"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { AuditEntry, ShipmentStatus } from "@/lib/types";
import { fmtDateTime, shipmentRef, STATUS_LABEL } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Select, Td, Th } from "@/components/ui";

const ACTION_LABEL: Record<AuditEntry["action"], string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
};

const ACTION_CLASS: Record<AuditEntry["action"], string> = {
  create:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  delete: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
};

function fmtVal(key: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (key === "status") {
    return STATUS_LABEL[v as ShipmentStatus] ?? String(v);
  }
  return String(v);
}

function Changes({ entry }: { entry: AuditEntry }) {
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
            {fmtVal(field, c.from)} → {fmtVal(field, c.to)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Actor({ entry }: { entry: AuditEntry }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span>{entry.user_email ?? "system"}</span>
      {entry.user_role && (
        <Badge
          className={
            entry.user_role === "agent"
              ? "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300"
              : "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300"
          }
        >
          {entry.user_role}
        </Badge>
      )}
    </span>
  );
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");

  useEffect(() => {
    supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300)
      .then(({ data }) => {
        setEntries((data as AuditEntry[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = roleFilter
    ? entries.filter((e) => e.user_role === roleFilter)
    : entries;

  return (
    <div>
      <PageHeader
        title="Audit trail"
        action={
          <div className="w-44">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">Everyone</option>
              <option value="agent">Agents only</option>
              <option value="admin">Admins only</option>
            </Select>
          </div>
        }
      />
      <Card className="overflow-x-auto">
        <div className="space-y-3 p-3 md:hidden">
          {filtered.map((e) => (
            <div
              key={e.id}
              className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"
            >
              <div className="flex items-center justify-between gap-2">
                <Actor entry={e} />
                <Badge className={ACTION_CLASS[e.action]}>
                  {ACTION_LABEL[e.action]}
                </Badge>
              </div>
              <div className="mt-1 text-sm">
                {e.shipment_id ? (
                  <Link
                    href={`/shipments/${e.shipment_id}`}
                    className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {shipmentRef(e.shipment_id)}
                  </Link>
                ) : null}{" "}
                {e.shipment_desc}
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
        <table className="hidden w-full md:table">
          <thead className="border-b border-slate-200 dark:border-slate-700">
            <tr>
              <Th>When</Th>
              <Th>Who</Th>
              <Th>Action</Th>
              <Th>Shipment</Th>
              <Th>Changes</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {filtered.map((e) => (
              <tr
                key={e.id}
                className="align-top hover:bg-slate-50 dark:hover:bg-slate-700/40"
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
                  {e.shipment_id ? (
                    <Link
                      href={`/shipments/${e.shipment_id}`}
                      className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      {shipmentRef(e.shipment_id)}
                    </Link>
                  ) : (
                    "—"
                  )}
                  {e.shipment_desc && (
                    <div className="max-w-48 truncate text-xs text-slate-500 dark:text-slate-400">
                      {e.shipment_desc}
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
        {!loading && filtered.length === 0 && (
          <EmptyState
            message={
              entries.length === 0
                ? "No activity recorded yet — shipment changes will appear here."
                : "No activity matches this filter."
            }
          />
        )}
      </Card>
    </div>
  );
}
