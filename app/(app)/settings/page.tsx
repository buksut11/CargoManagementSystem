"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg, useSetOrgLogo } from "@/components/org-context";
import { getPlan, isPaid } from "@/lib/plans";
import { resizeImageFile } from "@/lib/image";
import {
  downloadBackup,
  exportBackup,
  restoreBackup,
  type Backup,
  type RestoreSummary,
} from "@/lib/backup";
import {
  Button,
  ConfirmDialog,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  Section,
  Textarea,
} from "@/components/ui";
import {
  BookIcon,
  BuildingIcon,
  DashboardIcon,
  WalletIcon,
} from "@/components/icons";
import { BillingCards } from "@/components/billing-cards";
import { BillingHistory } from "@/components/billing-history";

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
  const [modules, setModules] = useState<string[]>(["cargo"]);
  const [loading, setLoading] = useState(true);
  // Backup & restore.
  const [backupBusy, setBackupBusy] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<Backup | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<string | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreSummary | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!orgId) return;
    supabase
      .from("organizations")
      .select(
        "name, plan, subscription_status, address, phone, email, logo_url, modules",
      )
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
        setModules(
          Array.isArray(data.modules) && data.modules.length
            ? data.modules
            : ["cargo"],
        );
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
    // Downscale before upload to keep Storage light (see lib/image.ts). The
    // logo renders at most ~320px wide on the printed invoices/statements, so
    // 640px on the longest edge is 2x that — crisp on high-DPI screens and in
    // printed PDFs without storing more pixels than the layout can ever use.
    const resized = await resizeImageFile(file, 640);
    // Path is prefixed with the organization id so storage RLS can scope
    // writes per-tenant: {org_id}/logo-{timestamp}.{ext}
    const ext = resized.name.split(".").pop() ?? "webp";
    const path = `${orgId}/logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("org-logos")
      .upload(path, resized, { upsert: true });
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

  async function makeBackup() {
    setBackupBusy(true);
    setError(null);
    try {
      downloadBackup(await exportBackup(supabase));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backup failed.");
    }
    setBackupBusy(false);
  }

  // Step 1: read + validate the chosen file, then ask for confirmation.
  async function pickRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setError(null);
    setRestoreResult(null);
    try {
      const parsed = JSON.parse(await file.text()) as Backup;
      if (parsed?.app !== "cargobook" || !parsed.tables) {
        throw new Error("This file is not a CargoBook backup.");
      }
      setPendingRestore(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the file.");
    }
  }

  // Step 2: confirmed — insert the backup's data into this organization.
  async function runRestore() {
    if (!pendingRestore) return;
    const backup = pendingRestore;
    setPendingRestore(null);
    setError(null);
    setRestoreProgress("Starting…");
    try {
      const summary = await restoreBackup(supabase, backup, setRestoreProgress);
      setRestoreResult(summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed.");
    }
    setRestoreProgress(null);
  }

  const restoredCount = restoreResult
    ? Object.values(restoreResult.inserted).reduce((a, b) => a + b, 0)
    : 0;

  const current = getPlan(plan);
  const paid = isPaid(subStatus);
  const MODULE_INFO: { id: string; name: string; desc: string }[] = [
    { id: "cargo", name: "Cargo", desc: "Shipments, invoices, expenses & delivery tracking." },
    { id: "flights", name: "Flights", desc: "Air-ticket bookings, receivables, payables & refunds." },
  ];

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
        <Section
          icon={<BuildingIcon />}
          title="Organization"
          subtitle="The logo and details below appear on your printed invoices."
        >
          <div className="mb-4 flex items-center gap-4">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/60 dark:border-white/10 ${
                logoUrl ? "" : "bg-white dark:bg-slate-800"
              }`}
            >
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
                className={`cursor-pointer rounded-full border border-white/60 bg-white/35 px-3 py-1.5 text-sm text-slate-700 backdrop-blur hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200 dark:hover:bg-white/[0.12] ${
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
        </Section>
        <Section
          icon={<DashboardIcon />}
          title="Modules"
          subtitle="The product areas included in your plan. Contact us to add or remove one."
        >
          <div className="space-y-2">
            {MODULE_INFO.map((m) => {
              const enabled = modules.includes(m.id);
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/60 bg-white/40 p-4 shadow-sm dark:bg-white/[0.04] dark:border-white/10"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {m.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {m.desc}
                    </div>
                  </div>
                  {/* Read-only status. Which modules an org runs is set by the
                      platform operator at provisioning time (see migration
                      0036), not toggled by tenants — so this only reports. */}
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      enabled
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"
                    }`}
                  >
                    {enabled ? "Included" : "Not included"}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
        </div>
        <div className="space-y-6">
        {loading ? (
          <Section icon={<WalletIcon />} title="Billing">
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
          </Section>
        ) : (
          <div>
            <BillingCards
              orgId={orgId}
              plan={current}
              paid={paid}
              subStatus={subStatus}
              onUpgraded={() => {
                setPlan("pro");
                setSubStatus("active");
              }}
            />
            <BillingHistory orgId={orgId} />
          </div>
        )}
        <Section
          icon={<BookIcon />}
          title="Backup & restore"
          subtitle="Download all of this organization's data (shipments, invoices, payments, expenses, bookings, ledgers…) as a JSON file, or add the contents of a backup back in."
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={makeBackup} disabled={backupBusy}>
              {backupBusy ? "Preparing…" : "⬇ Download backup"}
            </Button>
            <input
              id="restore-file-input"
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={pickRestoreFile}
              disabled={!!restoreProgress}
            />
            <label
              htmlFor="restore-file-input"
              className={`cursor-pointer rounded-full border border-white/60 bg-white/35 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200 dark:hover:bg-white/[0.12] ${
                restoreProgress ? "pointer-events-none opacity-60" : ""
              }`}
            >
              ⬆ Restore from backup
            </label>
          </div>
          {restoreProgress && (
            <p className="mt-3 text-sm text-blue-600 dark:text-blue-400">
              {restoreProgress}
            </p>
          )}
          {restoreResult && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              Restore finished — {restoredCount} records added.
              {Object.entries(restoreResult.reused).length > 0 && (
                <span>
                  {" "}
                  Existing entries were reused for:{" "}
                  {Object.entries(restoreResult.reused)
                    .map(([t, n]) => `${t.replace(/_/g, " ")} (${n})`)
                    .join(", ")}
                  .
                </span>
              )}
            </div>
          )}
          <p className="mt-3 text-xs text-slate-400">
            Restore only adds — it never deletes existing data. Restoring the
            same backup twice will duplicate shipments, invoices and bookings.
          </p>
        </Section>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingRestore}
        title="Restore this backup?"
        message={
          pendingRestore
            ? `Backup from ${pendingRestore.exported_at.slice(0, 10)}. Its shipments, invoices, bookings and payments will be ADDED to "${name || "this organization"}". Nothing is deleted, but restoring the same backup twice creates duplicates.`
            : undefined
        }
        confirmLabel="Restore"
        onConfirm={runRestore}
        onCancel={() => setPendingRestore(null)}
      />
    </div>
  );
}
