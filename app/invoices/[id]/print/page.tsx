"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Invoice, Organization, Payment, Shipment } from "@/lib/types";
import {
  fmtDate,
  fmtKg,
  fmtMoney,
  invoiceRef,
  shipmentRef,
} from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function PrintInvoicePage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = Number(id);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [org, setOrg] = useState<Pick<
    Organization,
    "name" | "logo_url" | "address" | "phone" | "email"
  > | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        router.replace("/login");
        return;
      }
      const [i, s, p] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", invoiceId).single(),
        supabase
          .from("shipments")
          .select("*, destinations(id, name, country)")
          .eq("invoice_id", invoiceId)
          .order("id"),
        supabase
          .from("payments")
          .select("*")
          .eq("invoice_id", invoiceId)
          .order("paid_date"),
      ]);
      const inv = (i.data as Invoice) ?? null;
      setInvoice(inv);
      setShipments((s.data as Shipment[]) ?? []);
      setPayments((p.data as Payment[]) ?? []);
      // The issuing organization's details brand the invoice header.
      if (inv?.organization_id) {
        const { data: o } = await supabase
          .from("organizations")
          .select("name, logo_url, address, phone, email")
          .eq("id", inv.organization_id)
          .single();
        setOrg(o ?? null);
      }
    }
    load();
  }, [invoiceId, router]);

  if (!invoice) {
    return (
      <p className="p-8 text-sm text-slate-400">{t("Loading invoice…")}</p>
    );
  }

  const total = shipments.reduce((sum, s) => sum + Number(s.total), 0);
  const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = total - paid;
  const totalKg = shipments.reduce((sum, s) => sum + Number(s.weight_kg), 0);

  return (
    <div className="print-sheet mx-auto max-w-3xl bg-white p-8 text-slate-900 print:p-0">
      <div className="no-print mb-6 flex gap-3">
        <button
          onClick={() => window.print()}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
        >
          {t("🖨 Print / Save as PDF")}
        </button>
        <Link
          href={`/invoices/${invoice.id}`}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          {t("← Back to invoice")}
        </Link>
      </div>

      <div className="border border-slate-300 p-10">
        {/* Organization branding — centered */}
        <div className="flex flex-col items-center gap-1 text-center">
          {org?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logo_url}
              alt={`${org.name} logo`}
              className="h-24 w-auto max-w-[320px] shrink-0 object-contain"
            />
          )}
          {/* The name is only shown as text when there's no logo — a logo
              typically already includes the organization's name. */}
          {!org?.logo_url && (
            <div className="text-2xl font-bold leading-tight">
              {org?.name ?? "📦 CargoBook"}
            </div>
          )}
          {org?.address && (
            <div className="whitespace-pre-line text-xs text-slate-600">
              {org.address}
            </div>
          )}
          {(org?.phone || org?.email) && (
            <div className="text-xs text-slate-600">
              {[org.phone, org.email].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-lg font-bold uppercase tracking-wide text-slate-800">
          {t("Cargo invoice")}
        </div>

        {/* Customer details on the left, invoice number/date on the right */}
        <div className="mt-8 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-600">
              {t("Bill to")}
            </div>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-slate-500">{t("Name")}</dt>
                <dd className="font-medium">{invoice.bill_to || "—"}</dd>
              </div>
              {invoice.phone && (
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 text-slate-500">{t("Phone")}</dt>
                  <dd className="text-slate-700">{invoice.phone}</dd>
                </div>
              )}
              {invoice.address && (
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 text-slate-500">{t("Address")}</dt>
                  <dd className="whitespace-pre-line text-slate-700">
                    {invoice.address}
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">{invoiceRef(invoice.id)}</div>
            <div className="mt-1 text-sm text-slate-500">
              {t("Issued")} {fmtDate(invoice.issued_date)}
            </div>
          </div>
        </div>

        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y-2 border-slate-800 text-left">
              <th className="py-2 pr-4 font-semibold">{t("Shipment")}</th>
              <th className="py-2 pr-4 font-semibold">{t("Description")}</th>
              <th className="py-2 pr-4 font-semibold">{t("Destination")}</th>
              <th className="py-2 pr-4 text-right font-semibold">{t("Weight")}</th>
              <th className="py-2 text-right font-semibold">{t("Amount")}</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s.id} className="border-b border-slate-200">
                <td className="py-2.5 pr-4">{shipmentRef(s.id)}</td>
                <td className="py-2.5 pr-4">{s.description}</td>
                <td className="py-2.5 pr-4">
                  {s.destinations
                    ? `${s.destinations.name}${
                        s.destinations.country
                          ? `, ${s.destinations.country}`
                          : ""
                      }`
                    : "—"}
                </td>
                <td className="py-2.5 pr-4 text-right">
                  {fmtKg(Number(s.weight_kg))}
                </td>
                <td className="py-2.5 text-right">
                  {fmtMoney(Number(s.total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="py-1 pr-8 text-slate-500">{t("Total weight")}</td>
                <td className="py-1 text-right">{fmtKg(totalKg)}</td>
              </tr>
              <tr>
                <td className="py-1 pr-8 text-slate-500">{t("Total")}</td>
                <td className="py-1 text-right font-medium">
                  {fmtMoney(total)}
                </td>
              </tr>
              <tr>
                <td className="py-1 pr-8 text-slate-500">{t("Paid")}</td>
                <td className="py-1 text-right">{fmtMoney(paid)}</td>
              </tr>
              <tr className="border-t-2 border-slate-800">
                <td className="py-2 pr-8 font-bold">{t("Balance due")}</td>
                <td className="py-2 text-right text-lg font-bold">
                  {fmtMoney(balance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {invoice.notes && (
          <p className="mt-8 border-t border-slate-200 pt-4 text-sm text-slate-600">
            {invoice.notes}
          </p>
        )}

        <p className="mt-10 text-center text-xs text-slate-400">
          {t("Generated by")} {org?.name ?? "CargoBook"} ·{" "}
          {fmtDate(new Date().toISOString())}
        </p>
      </div>
    </div>
  );
}
