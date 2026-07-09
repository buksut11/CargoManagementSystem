"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/org-context";
import { getPlan, isPaid } from "@/lib/plans";
import { Button, Card, ErrorNote, Field, Input, PageHeader } from "@/components/ui";

export default function SettingsPage() {
  const org = useOrg();
  const orgId = org?.orgId ?? "";
  const [name, setName] = useState(org?.orgName ?? "");
  const [plan, setPlan] = useState<string>("free");
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!orgId) return;
    supabase
      .from("organizations")
      .select("name, plan, subscription_status")
      .eq("id", orgId)
      .single()
      .then(({ data }) => {
        if (!active || !data) return;
        setName(data.name ?? "");
        setPlan(data.plan ?? "free");
        setSubStatus(data.subscription_status ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orgId]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setError(null);
    setNameSaved(false);
    const { error: upErr } = await supabase
      .from("organizations")
      .update({ name: name.trim() })
      .eq("id", orgId);
    setSavingName(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setNameSaved(true);
  }

  async function startCheckout() {
    setCheckoutBusy(true);
    setError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token ?? ""}`,
      },
      body: JSON.stringify({ orgId }),
    });
    const data = await res.json();
    setCheckoutBusy(false);
    if (!res.ok || !data.url) {
      setError(data.error ?? "Billing is not available right now.");
      return;
    }
    window.location.href = data.url;
  }

  const current = getPlan(plan);
  const paid = isPaid(subStatus);

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Organization
          </h2>
          <form onSubmit={saveName} className="space-y-3">
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameSaved(false);
                }}
                required
              />
            </Field>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={savingName || !name.trim()}>
                {savingName ? "Saving…" : "Save"}
              </Button>
              {nameSaved && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                  Saved
                </span>
              )}
            </div>
          </form>
          <div className="mt-3">
            <ErrorNote message={error} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Billing
          </h2>
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {current.name} plan
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {paid
                      ? `Subscription ${subStatus}`
                      : current.maxShipments === Infinity
                        ? "Unlimited shipments"
                        : `Up to ${current.maxShipments} shipments`}
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {current.priceLabel}
                </span>
              </div>
              {!paid && (
                <Button
                  onClick={startCheckout}
                  disabled={checkoutBusy}
                  className="mt-4 w-full"
                >
                  {checkoutBusy ? "Starting…" : "Upgrade"}
                </Button>
              )}
              <p className="mt-3 text-xs text-slate-400">
                Billing runs on Stripe. It activates once Stripe keys are
                configured on the server.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
