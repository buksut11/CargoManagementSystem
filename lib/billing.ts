import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase-server";

// Shared plumbing for the three Pro-plan payment routes (EVC, eDahab, Premier).
// Each provider differs only in how it talks to its gateway; the authorization,
// the transaction log and the plan upgrade are identical, and live here so the
// routes stay thin and behave the same way.

// Price charged for the Pro plan, provider-agnostic. Keep in step with the
// plans.ts price label shown on the cards (default 5 USD).
export const PLAN_AMOUNT = Number(process.env.BILLING_PLAN_AMOUNT ?? "5");
export const PLAN_CURRENCY = process.env.BILLING_CURRENCY ?? "USD";

export type BillingProvider = "evc" | "edahab" | "premier";

// The normalised outcome every provider client returns, so finalizeCharge can
// log and upgrade without knowing which gateway produced it.
export type ChargeResult = {
  ok: boolean;
  transactionId?: string;
  message?: string;
  code?: string;
};

type AdminContext = {
  admin: SupabaseClient;
  orgId: string;
  account: string;
};

// Validates the caller (bearer token → owner/admin of the org) and pulls the
// account/phone out of the body. Returns a ready-to-send error response on any
// failure, or the trusted context to proceed with.
export async function requireBillingAdmin(
  request: Request,
): Promise<{ error: NextResponse } | AdminContext> {
  const token = (request.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );
  let body: { orgId?: string; account?: string };
  try {
    body = await request.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid request." }, { status: 400 }) };
  }
  const orgId = body.orgId;
  const account = (body.account ?? "").trim();
  if (!token || !orgId) {
    return { error: NextResponse.json({ error: "Not authorized." }, { status: 401 }) };
  }

  let admin: SupabaseClient;
  try {
    admin = createServiceClient();
  } catch {
    return {
      error: NextResponse.json({ error: "Server is not configured." }, { status: 500 }),
    };
  }

  const { data: userData } = await admin.auth.getUser(token);
  const user = userData.user;
  if (!user) {
    return { error: NextResponse.json({ error: "Not authorized." }, { status: 401 }) };
  }

  const { data: mem } = await admin
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!mem || !["owner", "admin"].includes(mem.role as string)) {
    return {
      error: NextResponse.json(
        { error: "Only organization admins can manage billing." },
        { status: 403 },
      ),
    };
  }

  return { admin, orgId, account };
}

// Logs the attempt (approved or declined) and, on success, lifts the org to the
// Pro plan. Returns the response the route should send back. Best-effort log: a
// logging failure never blocks a successful upgrade.
export async function finalizeCharge(
  admin: SupabaseClient,
  args: {
    provider: BillingProvider;
    orgId: string;
    account: string;
    referenceId: string;
    result: ChargeResult;
  },
): Promise<NextResponse> {
  const { provider, orgId, account, referenceId, result } = args;

  await admin.from("billing_transactions").insert({
    organization_id: orgId,
    provider,
    reference_id: referenceId,
    transaction_id: result.transactionId ?? null,
    account,
    amount: PLAN_AMOUNT,
    currency: PLAN_CURRENCY,
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

  const { error: upErr } = await admin
    .from("organizations")
    .update({ plan: "pro", subscription_status: "active" })
    .eq("id", orgId);
  if (upErr) {
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

  return NextResponse.json({ ok: true, plan: "pro", transactionId: result.transactionId });
}

// A unique reference for a charge attempt, so a retry can never double-charge
// the same approval.
export function newReferenceId(orgId: string): string {
  return `org-${orgId}-${Date.now()}`;
}
