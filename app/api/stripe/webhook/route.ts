import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

// Keeps each organization's plan/subscription_status in sync with Stripe.
// Point a Stripe webhook at /api/stripe/webhook and set STRIPE_WEBHOOK_SECRET.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature") ?? "";
  const raw = await request.text();
  const stripe = new Stripe(secret);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Server is not configured." }, { status: 500 });
  }

  const updateByCustomer = (customerId: string, fields: Record<string, unknown>) =>
    admin.from("organizations").update(fields).eq("stripe_customer_id", customerId);

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.customer) {
        await updateByCustomer(String(s.customer), {
          plan: "pro",
          subscription_status: "active",
          stripe_subscription_id: s.subscription ? String(s.subscription) : null,
        });
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const active = sub.status === "active" || sub.status === "trialing";
      await updateByCustomer(String(sub.customer), {
        subscription_status: sub.status,
        plan: active ? "pro" : "free",
        stripe_subscription_id: sub.id,
      });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await updateByCustomer(String(sub.customer), {
        subscription_status: "canceled",
        plan: "free",
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
