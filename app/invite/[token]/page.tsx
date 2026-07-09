"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button, ErrorNote, Field, Input } from "@/components/ui";
import { BoxIcon } from "@/components/icons";

type InviteInfo =
  | { valid: true; email: string; role: string; orgName: string }
  | { valid: false; reason?: string };

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/invitations/accept?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => active && setInfo(d))
      .catch(() => active && setInfo({ valid: false, reason: "server" }));
    return () => {
      active = false;
    };
  }, [token]);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBusy(false);
      setError(data.error ?? "Something went wrong.");
      return;
    }
    // Account + membership created — sign in and enter the app.
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: data.email,
      password,
    });
    setBusy(false);
    if (signInErr) {
      setError("Account created — please sign in from the login page.");
      return;
    }
    router.replace("/");
  }

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30">
            <BoxIcon />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Join on CargoBook
          </h1>
        </div>

        {info === null && (
          <p className="text-center text-sm text-slate-400">Checking your invitation…</p>
        )}

        {info && info.valid === false && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
            {info.reason === "used"
              ? "This invitation has already been used."
              : info.reason === "expired"
                ? "This invitation has expired. Ask for a new one."
                : info.reason === "server"
                  ? "Invites aren’t fully set up yet. Ask the admin to add the SUPABASE_SERVICE_ROLE_KEY to the site’s environment."
                  : "This invitation link is invalid."}
          </p>
        )}

        {info && info.valid && (
          <form onSubmit={accept} className="space-y-4">
            <p className="text-center text-sm text-slate-400">
              You’ve been invited to <strong className="text-white">{info.orgName}</strong> as{" "}
              <span className="capitalize">{info.role}</span>.
            </p>
            <Field label="Email">
              <Input type="email" value={info.email} disabled readOnly />
            </Field>
            <Field label="Choose a password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
              />
            </Field>
            <ErrorNote message={error} />
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Joining…" : "Accept & join"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
