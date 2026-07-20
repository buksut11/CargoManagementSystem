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
    // Display price. Keep in step with BILLING_PLAN_AMOUNT / BILLING_CURRENCY,
    // which set what the upgrade actually charges (default 25 USD).
    priceLabel: "$25 / mo",
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

// ── Monthly billing lifecycle (migration 0044) ──────────────────────────────
// Each org carries a billing month (current_period_end = the due date). Near
// month-end admins are reminded; an unpaid invoice earns a 3-day grace period;
// after grace the org is frozen — read-only, with all data intact.

export const GRACE_DAYS = 3;

// The org's lifecycle fields as the app layout reads them. null when the
// database predates migration 0044 — every consumer treats that as "no
// lifecycle", so the app behaves exactly as before.
export type BillingState = {
  status: string | null; // subscription_status
  periodEnd: string | null; // current_period_end (ISO)
  reminderDays: number; // billing_reminder_days
};

export function isFrozen(status: string | null | undefined): boolean {
  return status === "frozen";
}

// past_due = the 3-day grace window: service continues, payment is overdue.
export function inGrace(status: string | null | undefined): boolean {
  return status === "past_due";
}

// Whole days from now until the given date; negative when it has passed.
export function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

// When the grace period runs out for a month ending at periodEnd.
export function graceEndsAt(periodEnd: string): Date {
  return new Date(new Date(periodEnd).getTime() + GRACE_DAYS * 86_400_000);
}
