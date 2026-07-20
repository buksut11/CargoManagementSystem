import { NextResponse } from "next/server";
import { getWaafiConfig, waafiPurchase } from "@/lib/waafi";
import { normalizeSomaliPhone } from "@/lib/phone";
import {
  finalizeCharge,
  newReferenceId,
  PLAN_CURRENCY,
  requireBillingAdmin,
} from "@/lib/billing";

export const runtime = "nodejs";

// Upgrade an organization to the Pro plan by charging EVC Plus (Hormuud) through
// WaafiPay. Returns 501 until the WaafiPay merchant keys are configured.
export async function POST(request: Request) {
  const cfg = getWaafiConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "EVC Plus payments are not configured yet." },
      { status: 501 },
    );
  }

  const ctx = await requireBillingAdmin(request);
  if ("error" in ctx) return ctx.error;

  const phone = normalizeSomaliPhone(ctx.account);
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid EVC number, e.g. 0615000000." },
      { status: 400 },
    );
  }

  const referenceId = newReferenceId(ctx.orgId);
  const result = await waafiPurchase(cfg, {
    accountNo: phone,
    amount: ctx.amount,
    currency: PLAN_CURRENCY,
    referenceId,
    invoiceId: `PRO-${ctx.orgId}`,
    description: "CargoBook Pro plan",
  });

  return finalizeCharge(ctx.admin, {
    provider: "evc",
    orgId: ctx.orgId,
    account: phone,
    referenceId,
    result,
    amount: ctx.amount,
  });
}
