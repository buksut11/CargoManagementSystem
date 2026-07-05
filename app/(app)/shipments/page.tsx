"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Shipment, ShipmentStatus } from "@/lib/types";
import {
  fmtDate,
  fmtKg,
  fmtMoney,
  invoiceRef,
  shipmentRef,
  STATUS_CLASS,
  STATUS_LABEL,
} from "@/lib/format";
import {
  Badge,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Td,
  Th,
} from "@/components/ui";

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ShipmentStatus>("");

  useEffect(() => {
    supabase
      .from("shipments")
      .select("*, destinations(id, name, country)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setShipments((data as Shipment[]) ?? []);
        setLoading(false);
      });
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = shipments.filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (!q) return true;
    return (
      s.description.toLowerCase().includes(q) ||
      (s.destinations?.name ?? "").toLowerCase().includes(q) ||
      shipmentRef(s.id).toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Shipments"
        action={
          <Link
            href="/shipments/new"
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            + New shipment
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-64">
          <Input
            placeholder="Search description, destination…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "" | ShipmentStatus)
            }
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </Select>
        </div>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200">
            <tr>
              <Th>Ref</Th>
              <Th>Description</Th>
              <Th>Destination</Th>
              <Th>Weight</Th>
              <Th>Total</Th>
              <Th>Status</Th>
              <Th>Invoice</Th>
              <Th>Date</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <Td>
                  <Link
                    href={`/shipments/${s.id}`}
                    className="font-medium text-orange-700 hover:underline"
                  >
                    {shipmentRef(s.id)}
                  </Link>
                </Td>
                <Td>{s.description}</Td>
                <Td>{s.destinations?.name ?? "—"}</Td>
                <Td>{fmtKg(Number(s.weight_kg))}</Td>
                <Td>{fmtMoney(Number(s.total))}</Td>
                <Td>
                  <Badge className={STATUS_CLASS[s.status]}>
                    {STATUS_LABEL[s.status]}
                  </Badge>
                </Td>
                <Td>
                  {s.invoice_id ? (
                    <Link
                      href={`/invoices/${s.invoice_id}`}
                      className="text-orange-700 hover:underline"
                    >
                      {invoiceRef(s.invoice_id)}
                    </Link>
                  ) : (
                    <span className="text-slate-400">not invoiced</span>
                  )}
                </Td>
                <Td>{fmtDate(s.ship_date)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <EmptyState
            message={
              shipments.length === 0
                ? "No shipments yet — click “New shipment” to add your first."
                : "No shipments match your search."
            }
          />
        )}
      </Card>
    </div>
  );
}
