"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { supabase, isConfigured } from "@/lib/supabase";
import { ErrorNote, Field } from "@/components/ui";
import {
  BoxIcon,
  CoinsIcon,
  EyeIcon,
  EyeOffIcon,
  InvoiceIcon,
  LockIcon,
  MailIcon,
} from "@/components/icons";
import { LogoOrb } from "@/components/logo-orb";
import { ThemeTogglePill } from "@/components/theme-toggle";

// WebGL backdrop is client-only and lazy-loaded so it never blocks first paint.
const ThreeBackground = dynamic(
  () => import("@/components/three-background").then((m) => m.ThreeBackground),
  { ssr: false },
);

const REMEMBER_KEY = "cargobook:email";

// Glass input styling shared by both fields: frosted fill, soft border, and
// room on the left for the leading icon.
const glassInput =
  "glass-field w-full min-w-0 rounded-xl border border-white/60 bg-white/45 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-300/60 dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-orange-400 dark:focus:ring-orange-500/30";

const featureItems = [
  { label: "Shipments", icon: <BoxIcon /> },
  { label: "Invoices", icon: <InvoiceIcon /> },
  { label: "Payments", icon: <CoinsIcon /> },
];

export default function LoginPage() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      {/* Brand-tinted scrims tie the layers to the card and keep text legible.
          They lighten in light mode so the glass card reads bright and airy. */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-white/75 via-white/30 to-white/15 dark:from-slate-950/85 dark:via-slate-950/45 dark:to-slate-950/70"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent dark:from-slate-950/60 dark:to-slate-950/20"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-12 px-6 py-10 lg:flex-row lg:justify-between lg:px-10">
        {/* Brand hero — desktop only */}
        <section
          data-animate
          style={{ opacity: 0 }}
          className="hidden max-w-md flex-col gap-6 text-slate-900 lg:flex dark:text-white"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900/10 ring-1 ring-slate-900/20 backdrop-blur dark:bg-white/15 dark:ring-white/25">
              <BoxIcon />
            </span>
            <span className="text-xl font-bold tracking-tight">CargoBook</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Track Every Shipment, From Port to Door
          </h2>
          <p className="max-w-sm text-lg text-slate-700 dark:text-white/75">
            Shipments, invoices and payments — organised in one clean, fast
            dashboard built for the way you work.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-5 text-sm font-medium text-slate-800 dark:text-white/80">
            {featureItems.map(({ label, icon }) => (
              <span key={label} className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/10 ring-1 ring-slate-900/15 backdrop-blur dark:bg-white/10 dark:ring-white/20 [&_svg]:h-4 [&_svg]:w-4">
                  {icon}
                </span>
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* Auth card — frosted glass in both themes */}
        <div
          data-animate
          style={{ opacity: 0 }}
          className="glass-card relative w-full max-w-md rounded-[1.75rem] p-8 sm:p-10"
        >
          <ThemeTogglePill className="absolute right-5 top-5" />

          <div className="mb-8 text-center">
            <LogoOrb className="mx-auto -mt-2 mb-3 h-24 w-24 drop-shadow-[0_10px_25px_rgba(249,115,22,0.35)]" />
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
              <span className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 [&_svg]:h-4.5 [&_svg]:w-4.5">
                  <MailIcon />
                </span>
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className={glassInput}
                />
              </span>
            </Field>
            <Field label="Password">
              <span className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 [&_svg]:h-4.5 [&_svg]:w-4.5">
                  <LockIcon />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`${glassInput} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 [&_svg]:h-4.5 [&_svg]:w-4.5"
                >
                  {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </span>
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
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/40 transition hover:from-orange-600 hover:to-orange-700 disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
