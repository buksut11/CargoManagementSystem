// Subscription plans. Pricing is still "to be decided" — these are sensible
// placeholders. The free tier's limits are what the app enforces softly today;
// wire real numbers here once you pick a pricing model, and set STRIPE_PRICE_ID
// to the paid tier's price.

export type PlanId = "free" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  priceLabel: string;
  maxShipments: number; // Infinity = unlimited
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Pro",
    priceLabel: "$0",
    maxShipments: Infinity,
    features: ["Unlimited shipments", "Invoices & payments", "1 organization"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    // Display price. Keep in step with WAAFI_PLAN_AMOUNT / WAAFI_CURRENCY, which
    // set what the EVC upgrade actually charges (default 5 USD).
    priceLabel: "$5 / mo",
    maxShipments: Infinity,
    features: [
      "Unlimited shipments",
      "Invoices, payments & statements",
      "Priority support",
    ],
  },
};

export function getPlan(plan: string | null | undefined): Plan {
  return PLANS[(plan as PlanId) ?? "free"] ?? PLANS.free;
}

// True when an active/trialing subscription lifts the free-tier caps.
export function isPaid(subscriptionStatus: string | null | undefined): boolean {
  return subscriptionStatus === "active" || subscriptionStatus === "trialing";
}
