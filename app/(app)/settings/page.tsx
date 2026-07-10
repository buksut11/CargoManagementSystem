"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg, useSetOrgLogo } from "@/components/org-context";
import { getPlan, isPaid } from "@/lib/plans";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui";

export default function SettingsPage() {
  const org = useOrg();
  const orgId = org?.orgId ?? "";
  const setSidebarLogo = useSetOrgLogo();
  const [name, setName] = useState(org?.orgName ?? "");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [plan, setPlan] = useState<string>("free");
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!orgId) return;
    supabase
      .from("organizations")
      .select("name, plan, subscription_status, address, phone, email, logo_url")
      .eq("id", orgId)
      .single()
      .then(({ data }) => {
        if (!active || !data) return;
        setName(data.name ?? "");
        setAddress(data.address ?? "");
        setPhone(data.phone ?? "");
        setEmail(data.email ?? "");
        setLogoUrl(data.logo_url ?? "");
        setPlan(data.plan ?? "free");
        setSubStatus(data.subscription_status ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orgId]);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSavingDetails(true);
    setError(null);
    setDetailsSaved(false);
    const { error: upErr } = await supabase
      .from("organizations")
      .update({
        name: name.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
      })
      .eq("id", orgId);
    setSavingDetails(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setDetailsSaved(true);
  }

  // The logo persists immediately on upload/remove (it lives in Storage, not
  // in the form), so it can't end up half-saved if the user navigates away.
  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setLogoBusy(true);
    setError(null);
    // Path is prefixed with the organization id so storage RLS can scope
    // writes per-tenant: {org_id}/logo-{timestamp}.{ext}
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${orgId}/logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("org-logos")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setLogoBusy(false);
      setError(uploadError.message);
      return;
    }
    const { data } = supabase.storage.from("org-logos").getPublicUrl(path);
    const { error: upErr } = await supabase
      .from("organizations")
      .update({ logo_url: data.publicUrl })
      .eq("id", orgId);
    setLogoBusy(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setLogoUrl(data.publicUrl);
    setSidebarLogo(data.publicUrl);
  }

  async function removeLogo() {
    setLogoBusy(true);
    setError(null);
    const { error: upErr } = await supabase
      .from("organizations")
      .update({ logo_url: null })
      .eq("id", orgId);
    setLogoBusy(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setLogoUrl("");
    setSidebarLogo(null);
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
          <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Organization
          </h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            The logo and details below appear on your printed invoices.
          </p>

          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/60 bg-white dark:border-white/10 dark:bg-slate-800">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Organization logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400">No logo</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="org-logo-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={uploadLogo}
                disabled={logoBusy}
              />
              <label
                htmlFor="org-logo-input"
                className={`cursor-pointer rounded-full border border-white/60 bg-white/55 px-3 py-1.5 text-sm text-slate-700 backdrop-blur hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200 dark:hover:bg-white/[0.12] ${
                  logoBusy ? "pointer-events-none opacity-60" : ""
                }`}
              >
                {logoBusy
                  ? "Working…"
                  : logoUrl
                    ? "Replace logo"
                    : "Upload logo"}
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={removeLogo}
                  disabled={logoBusy}
                  className="rounded-lg px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <form onSubmit={saveDetails} className="space-y-3">
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setDetailsSaved(false);
                }}
                required
              />
            </Field>
            <Field label="Address">
              <Textarea
                value={address}
                rows={2}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setDetailsSaved(false);
                }}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone">
                <Input
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setDetailsSaved(false);
                  }}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setDetailsSaved(false);
                  }}
                />
              </Field>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={savingDetails || !name.trim()}>
                {savingDetails ? "Saving…" : "Save"}
              </Button>
              {detailsSaved && (
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
