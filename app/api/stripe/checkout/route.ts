import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { appBaseUrl } from "@/lib/app-url";

export const runtime = "nodejs";

// Creates a Stripe Checkout session for an organization's subscription.
// Returns 501 until STRIPE_SECRET_KEY and STRIPE_PRICE_ID are configured.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  if (!secret || !price) {
    return NextResponse.json({ error: "Billing is not configured yet." }, { status: 501 });
  }

  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  let body: { orgId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const orgId = body.orgId;
  if (!token || !orgId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
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

  // Caller must be an owner/admin of the organization.
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

  const { data: orgRow } = await admin
    .from("organizations")
    .select("stripe_customer_id, name")
    .eq("id", orgId)
    .single();

  const stripe = new Stripe(secret);

  // Reuse the org's Stripe customer, or create one on first checkout.
  let customerId = (orgRow?.stripe_customer_id as string | null) ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: (orgRow?.name as string) ?? undefined,
      email: user.email ?? undefined,
      metadata: { org_id: orgId },
    });
    customerId = customer.id;
    await admin
      .from("organizations")
      .update({ stripe_customer_id: customerId })
      .eq("id", orgId);
  }

  const origin = appBaseUrl(request);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}/settings?checkout=success`,
    cancel_url: `${origin}/settings?checkout=cancel`,
    metadata: { org_id: orgId },
    subscription_data: { metadata: { org_id: orgId } },
  });

  return NextResponse.json({ url: session.url });
}
