"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { supabase, isConfigured } from "@/lib/supabase";
import { Button, ErrorNote, Field, Input } from "@/components/ui";
import { BoxIcon } from "@/components/icons";

// WebGL backdrop is client-only and lazy-loaded so it never blocks first paint.
const ThreeBackground = dynamic(
  () => import("@/components/three-background").then((m) => m.ThreeBackground),
  { ssr: false },
);

const REMEMBER_KEY = "cargobook:email";

export default function LoginPage() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Prefill the email if it was remembered on a previous visit.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      // localStorage unavailable — no prefill.
    }
  }, []);

  // GSAP entrance: the hero and card cascade in on load.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>("[data-animate]");
      if (reduce) {
        gsap.set(items, { opacity: 1 });
        return;
      }
      gsap.fromTo(
        items,
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.14,
          delay: 0.1,
          clearProps: "transform",
        },
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  function persistEmail() {
    try {
      if (remember && email) localStorage.setItem(REMEMBER_KEY, email);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {
      // ignore storage errors
    }
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
    } else {
      persistEmail();
      router.replace("/");
    }
  }

  async function forgotPassword() {
    setError(null);
    setNotice(null);
    if (!email) {
      setError("Enter your email above first, then tap “Forgot password”.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setNotice(`We’ve sent a password reset link to ${email}.`);
  }

  return (
    <main
      ref={rootRef}
      className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-slate-950"
    >
      {/* Full-bleed background photo (public/login-bg.webp). */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/login-bg.webp)" }}
        aria-hidden
      />
      {/* Ambient WebGL layer — floating cargo containers. */}
      <ThreeBackground />
      {/* Brand-tinted scrims tie the layers to the card and keep text legible. */}
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
        <section
          data-animate
          style={{ opacity: 0 }}
          className="hidden max-w-md flex-col gap-6 text-white lg:flex"
        >
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
        <div
          data-animate
          style={{ opacity: 0 }}
          className="w-full max-w-md rounded-3xl border border-white/40 bg-white/70 p-8 shadow-[0_25px_70px_-20px_rgba(2,6,23,0.7)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60 sm:p-10"
        >
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
            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-orange-600 accent-orange-600 focus:ring-orange-500 dark:border-slate-600"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={forgotPassword}
                disabled={busy}
                className="font-medium text-orange-600 hover:text-orange-700 hover:underline disabled:opacity-50 dark:text-orange-400"
              >
                Forgot password?
              </button>
            </div>
            {notice && (
              <p className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                {notice}
              </p>
            )}
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
