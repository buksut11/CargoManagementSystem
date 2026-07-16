import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import {
  getWaafiConfig,
  normalizeSomaliPhone,
  waafiPurchase,
} from "@/lib/waafi";

export const runtime = "nodejs";

// Upgrades an organization to the paid plan by charging EVC Plus / ZAAD / Sahal
// through WaafiPay. This replaces the Stripe subscription checkout for the
// Somali market: the admin enters their mobile-money number, approves the USSD
// PIN prompt on their handset, and the plan flips to "pro" on success — all in
// one synchronous request (no redirect, no webhook).
//
// Returns 501 until WAAFI_MERCHANT_UID / WAAFI_API_USER_ID / WAAFI_API_KEY are
// configured on the server, mirroring the Stripe routes' "not configured" guard.

// Amount charged for the Pro plan, in whole currency units. Defaults are
// placeholders — set WAAFI_PLAN_AMOUNT / WAAFI_CURRENCY to your real pricing.
const PLAN_AMOUNT = Number(process.env.WAAFI_PLAN_AMOUNT ?? "5");
const CURRENCY = process.env.WAAFI_CURRENCY ?? "USD";

export async function POST(request: Request) {
  const cfg = getWaafiConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "EVC payments are not configured yet." },
      { status: 501 },
    );
  }

  const token = (request.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );
  let body: { orgId?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const orgId = body.orgId;
  const phone = normalizeSomaliPhone(body.phone ?? "");
  if (!token || !orgId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid Somali mobile number, e.g. 0615000000." },
      { status: 400 },
    );
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Server is not configured." }, { status: 500 });
  }

  const { data: userData } = await admin.auth.getUser(token);
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  // Caller must be an owner/admin of the organization — same guard as billing.
  const { data: mem } = await admin
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!mem || !["owner", "admin"].includes(mem.role as string)) {
    return NextResponse.json(
      { error: "Only organization admins can manage billing." },
      { status: 403 },
    );
  }

  // Unique per attempt so a retry can never double-charge the same approval.
  const referenceId = `org-${orgId}-${Date.now()}`;
  const result = await waafiPurchase(cfg, {
    accountNo: phone,
    amount: PLAN_AMOUNT,
    currency: CURRENCY,
    referenceId,
    invoiceId: `PRO-${orgId}`,
    description: "CargoBook Pro plan",
  });

  // Log every attempt (approved or declined) for reconciliation. Best-effort:
  // a logging failure must never block a successful upgrade.
  await admin.from("evc_transactions").insert({
    organization_id: orgId,
    reference_id: referenceId,
    transaction_id: result.transactionId ?? null,
    phone,
    amount: PLAN_AMOUNT,
    currency: CURRENCY,
    status: result.ok ? "approved" : "failed",
    response_code: result.code ?? null,
    response_msg: result.message ?? null,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message ?? "The payment was declined." },
      { status: 402 },
    );
  }

  // Payment approved on the handset — lift the org to the paid plan.
  const { error: upErr } = await admin
    .from("organizations")
    .update({ plan: "pro", subscription_status: "active" })
    .eq("id", orgId);
  if (upErr) {
    // The money moved but we couldn't record it. Surface the transaction id so
    // it can be reconciled manually rather than silently losing the upgrade.
    return NextResponse.json(
      {
        error:
          "Payment succeeded but the upgrade could not be saved. Contact support with transaction " +
          (result.transactionId ?? referenceId) +
          ".",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    plan: "pro",
    transactionId: result.transactionId,
  });
}
