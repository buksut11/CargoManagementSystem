import Link from "next/link";
import { PLANS } from "@/lib/plans";

export const metadata = {
  title: "Pricing — CargoBook",
};

export default function PricingPage() {
  const plans = [PLANS.free, PLANS.pro];
  return (
    <main className="app-bg min-h-dvh px-6 py-16 text-slate-900 dark:text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Simple pricing</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Track shipments, invoices and payments for your cargo business.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`glass-panel rounded-3xl p-8 ${
                plan.id === "pro"
                  ? "outline-2 -outline-offset-2 outline-blue-500/60"
                  : ""
              }`}
            >
              <div className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                {plan.name}
              </div>
              <div className="mt-2 text-3xl font-bold">{plan.priceLabel}</div>
              <ul className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-slate-600 dark:text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Sign in
          </Link>
          {" "}· Questions?{" "}
          <Link href="/contact" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Contact us
          </Link>
        </p>
      </div>
    </main>
  );
}
