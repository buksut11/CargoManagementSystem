import { NextResponse } from "next/server";
import { getPremierConfig, premierPurchase } from "@/lib/premier";
import {
  finalizeCharge,
  newReferenceId,
  PLAN_CURRENCY,
  requireBillingAdmin,
} from "@/lib/billing";

export const runtime = "nodejs";

// Upgrade an organization to the Pro plan by charging Premier Bank. Returns 501
// until the Premier Bank merchant keys are configured.
export async function POST(request: Request) {
  const cfg = getPremierConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "Premier Bank payments are not configured yet." },
      { status: 501 },
    );
  }

  const ctx = await requireBillingAdmin(request);
  if ("error" in ctx) return ctx.error;

  // Premier accepts a phone or an account number, so we don't force the Somali
  // mobile format — just require something was entered.
  if (!ctx.account) {
    return NextResponse.json(
      { error: "Enter your Premier Bank account or phone number." },
      { status: 400 },
    );
  }

  const referenceId = newReferenceId(ctx.orgId);
  const result = await premierPurchase(cfg, {
    accountNo: ctx.account,
    amount: ctx.amount,
    currency: PLAN_CURRENCY,
    referenceId,
    description: "CargoBook Pro plan",
  });

  return finalizeCharge(ctx.admin, {
    provider: "premier",
    orgId: ctx.orgId,
    account: ctx.account,
    referenceId,
    result,
    amount: ctx.amount,
  });
}
