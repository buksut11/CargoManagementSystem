import Link from "next/link";
import { PLANS } from "@/lib/plans";

export const metadata = {
  title: "Pricing — CargoBook",
};

export default function PricingPage() {
  const plans = [PLANS.free, PLANS.pro];
  return (
    <main className="min-h-dvh bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Simple pricing</h1>
          <p className="mt-3 text-slate-400">
            Track shipments, invoices and payments for your cargo business.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl border p-8 ${
                plan.id === "pro"
                  ? "border-orange-500/50 bg-orange-500/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="text-sm font-semibold uppercase tracking-wide text-orange-400">
                {plan.name}
              </div>
              <div className="mt-2 text-3xl font-bold">{plan.priceLabel}</div>
              <ul className="mt-6 space-y-2 text-sm text-slate-300">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-orange-400">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-orange-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
