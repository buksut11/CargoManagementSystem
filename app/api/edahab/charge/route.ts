import { NextResponse } from "next/server";
import { edahabPurchase, getEdahabConfig } from "@/lib/edahab";
import { normalizeSomaliPhone } from "@/lib/phone";
import {
  finalizeCharge,
  newReferenceId,
  PLAN_CURRENCY,
  requireBillingAdmin,
} from "@/lib/billing";

export const runtime = "nodejs";

// Upgrade an organization to the Pro plan by charging eDahab (Somtel /
// Dahabshiil). Returns 501 until the eDahab merchant keys are configured.
export async function POST(request: Request) {
  const cfg = getEdahabConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "eDahab payments are not configured yet." },
      { status: 501 },
    );
  }

  const ctx = await requireBillingAdmin(request);
  if ("error" in ctx) return ctx.error;

  const phone = normalizeSomaliPhone(ctx.account);
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid eDahab number, e.g. 0625000000." },
      { status: 400 },
    );
  }

  const referenceId = newReferenceId(ctx.orgId);
  const result = await edahabPurchase(cfg, {
    accountNo: phone,
    amount: ctx.amount,
    currency: PLAN_CURRENCY,
    referenceId,
    description: "CargoBook Pro plan",
  });

  return finalizeCharge(ctx.admin, {
    provider: "edahab",
    orgId: ctx.orgId,
    account: phone,
    referenceId,
    result,
    amount: ctx.amount,
  });
}
