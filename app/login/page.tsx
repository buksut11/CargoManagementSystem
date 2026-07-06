"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isConfigured } from "@/lib/supabase";
import { Button, ErrorNote, Field, Input } from "@/components/ui";
import { BoxIcon } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) setError(error.message);
    else router.replace("/");
  }

  return (
    <main className="relative flex min-h-dvh flex-1 flex-col overflow-hidden">
      {/* Full-bleed background photo (public/login-bg.webp). */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/login-bg.webp)" }}
        aria-hidden
      />
      {/* Brand-tinted scrims tie the photo to the card and keep text legible. */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-slate-950/70"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/20"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-12 px-6 py-10 lg:flex-row lg:justify-between lg:px-10">
        {/* Brand hero — desktop only */}
        <section className="hidden max-w-md flex-col gap-6 text-white lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur">
              <BoxIcon />
            </span>
            <span className="text-xl font-bold tracking-tight">CargoBook</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Track every shipment, from port to door.
          </h2>
          <p className="max-w-sm text-lg text-white/75">
            Shipments, invoices and payments — organised in one clean, fast
            dashboard built for the way you work.
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-white/70">
            <span>Shipments</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span>Invoices</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span>Payments</span>
          </div>
        </section>

        {/* Auth card */}
        <div className="w-full max-w-md rounded-3xl border border-white/40 bg-white/90 p-8 shadow-[0_25px_70px_-20px_rgba(2,6,23,0.7)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30">
              <BoxIcon />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Sign in to continue to CargoBook
            </p>
          </div>
          {!isConfigured && (
            <p className="mb-4 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
              Supabase is not configured yet — copy <code>.env.example</code> to{" "}
              <code>.env.local</code> and fill in your project keys (see README).
            </p>
          )}
          <form onSubmit={signIn} className="space-y-4">
            <Field label="Email">
              <Input
                type="email"
                name="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            <ErrorNote message={error} />
            <Button
              type="submit"
              disabled={busy}
              className="w-full shadow-lg shadow-orange-500/30"
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
