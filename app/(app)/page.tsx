"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Payment, Shipment } from "@/lib/types";
import {
  fmtDate,
  fmtKg,
  fmtMoney,
  shipmentRef,
  STATUS_CLASS,
  STATUS_LABEL,
} from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Td, Th } from "@/components/ui";

export default function DashboardPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, p] = await Promise.all([
        supabase
          .from("shipments")
          .select("*, destinations(id, name, country)")
          .order("created_at", { ascending: false }),
        supabase.from("payments").select("*"),
      ]);
      setShipments((s.data as Shipment[]) ?? []);
      setPayments((p.data as Payment[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const totalKg = shipments.reduce((sum, s) => sum + Number(s.weight_kg), 0);
  const invoiced = shipments
    .filter((s) => s.invoice_id !== null)
    .reduce((sum, s) => sum + Number(s.total), 0);
  const received = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = invoiced - received;

  const stats = [
    { label: "Shipments", value: String(shipments.length) },
    { label: "Total weight", value: fmtKg(totalKg) },
    { label: "Invoiced", value: fmtMoney(invoiced) },
    {
      label: "Outstanding",
      value: fmtMoney(outstanding),
      accent: outstanding > 0,
    },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {s.label}
            </div>
            <div
              className={`mt-1 text-2xl font-bold ${
                s.accent ? "text-orange-600" : ""
              }`}
            >
              {loading ? "…" : s.value}
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Recent shipments</h2>
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
              <Th>Date</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shipments.slice(0, 5).map((s) => (
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
                <Td>{fmtDate(s.ship_date)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && shipments.length === 0 && (
          <EmptyState message="No shipments yet — add your first one from the Shipments page." />
        )}
      </Card>
    </div>
  );
}
