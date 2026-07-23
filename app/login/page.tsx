"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { supabase, isConfigured } from "@/lib/supabase";
import {
  cacheBranding,
  readCachedBranding,
  type LoginBranding,
} from "@/lib/branding";
import { ErrorNote, Field } from "@/components/ui";
import {
  BoxIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
} from "@/components/icons";
import { LogoOrb } from "@/components/logo-orb";
import { LoginStory } from "@/components/login-story";
import { ThemeTogglePill } from "@/components/theme-toggle";
import { LanguageTogglePill } from "@/components/language-toggle";
import { useT } from "@/lib/i18n";

// WebGL backdrop is client-only and lazy-loaded so it never blocks first paint.
const ThreeBackground = dynamic(
  () => import("@/components/three-background").then((m) => m.ThreeBackground),
  { ssr: false },
);

const REMEMBER_KEY = "cargobook:email";

// Glass input styling shared by both fields: frosted fill, soft border, and
// room on the left for the leading icon.
const glassInput =
  "glass-field w-full min-w-0 rounded-xl border border-white/60 bg-white/50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-300/60 dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/30";

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [branding, setBranding] = useState<LoginBranding | null>(null);

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

  // Resolve which organization's branding to show. The cache (written by the
  // app layout on each visit) covers returning users instantly; a branded
  // login link (/login?org={slug}) wins over it once the lookup resolves, so
  // shared links always show the right org even on a fresh browser.
  useEffect(() => {
    setBranding(readCachedBranding());
    const slug = new URLSearchParams(window.location.search).get("org");
    if (!slug || !isConfigured) return;
    let active = true;
    supabase
      .rpc("login_branding", { org_slug: slug })
      .then(({ data }: { data: { name: string; logo_url: string | null }[] | null }) => {
        if (!active) return;
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.name) {
          const next = { name: row.name, logoUrl: row.logo_url ?? null };
          setBranding(next);
          cacheBranding(next);
        }
      });
    return () => {
      active = false;
    };
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
      setError(t("Enter your email above first, then tap “Forgot password”."));
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setNotice(t("We’ve sent a password reset link to {email}.", { email }));
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
      {/* Ambient WebGL layer — floating pastel cargo containers. */}
      <ThreeBackground />
      {/* Brand-tinted scrims tie the photo to the card and keep text legible.
          They lighten in light mode so the glass card reads bright and airy. */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-white/75 via-white/30 to-white/15 dark:from-slate-950/85 dark:via-slate-950/45 dark:to-slate-950/70"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent dark:from-slate-950/60 dark:to-slate-950/20"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-start gap-8 px-6 py-10 lg:flex-row lg:justify-between lg:gap-12 lg:px-10">
        {/* Brand + storytelling panel — shown on every screen size. On desktop
            it fills the left column; on mobile it sits above the auth card so
            new users see what CargoBook does before signing in. */}
        <section
          data-animate
          style={{ opacity: 0 }}
          className="flex w-full max-w-md flex-col gap-5 text-slate-900 dark:text-white"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900/10 ring-1 ring-slate-900/20 backdrop-blur dark:bg-white/15 dark:ring-white/25">
              <BoxIcon />
            </span>
            <span className="text-xl font-bold tracking-tight">
              {branding?.name ?? "CargoBook"}
            </span>
          </div>
          <h2 className="hidden text-3xl font-bold leading-tight tracking-tight lg:block xl:text-4xl">
            {t("Run flights and cargo from one clean dashboard")}
          </h2>
          <LoginStory className="mx-auto w-full max-w-[15rem] sm:max-w-[17rem] lg:mx-0 lg:max-w-none" />
        </section>

        {/* Auth card — frosted glass in both themes */}
        <div
          data-animate
          style={{ opacity: 0 }}
          className="glass-card relative w-full max-w-md rounded-[1.75rem] p-8 sm:p-10"
        >
          <div className="absolute right-5 top-5 flex items-center gap-2">
            <LanguageTogglePill />
            <ThemeTogglePill />
          </div>

          <div className="mb-8 text-center">
            {branding?.logoUrl ? (
              <span className="mx-auto mb-4 mt-1 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-black/10 dark:ring-white/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={branding.logoUrl}
                  alt={`${branding.name} logo`}
                  width={80}
                  height={80}
                  className="h-full w-full object-contain"
                />
              </span>
            ) : (
              <LogoOrb className="mx-auto -mt-2 mb-3 h-24 w-24 drop-shadow-[0_10px_25px_rgba(59,130,246,0.4)]" />
            )}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t("Welcome back")}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("Sign in to continue to CargoBook")}
            </p>
          </div>
          {!isConfigured && (
            <p className="mb-4 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
              Supabase is not configured yet — copy <code>.env.example</code> to{" "}
              <code>.env.local</code> and fill in your project keys (see README).
            </p>
          )}
          <form onSubmit={signIn} className="space-y-4">
            <Field label={t("Email")}>
              <span className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-600 dark:text-slate-500 [&_svg]:h-4.5 [&_svg]:w-4.5">
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
            <Field label={t("Password")}>
              <span className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-600 dark:text-slate-500 [&_svg]:h-4.5 [&_svg]:w-4.5">
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
                  aria-label={showPassword ? t("Hide password") : t("Show password")}
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-600 transition-colors hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-300 [&_svg]:h-4.5 [&_svg]:w-4.5"
                >
                  {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </span>
            </Field>
            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 focus:ring-blue-500 dark:border-slate-600"
                />
                {t("Remember me")}
              </label>
              <button
                type="button"
                onClick={forgotPassword}
                disabled={busy}
                className="font-medium text-blue-700 hover:text-blue-800 hover:underline disabled:opacity-50 dark:text-blue-400"
              >
                {t("Forgot password?")}
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
              className="w-full rounded-full bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/40 transition hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
            >
              {busy ? t("Signing in…") : t("Sign in")}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
