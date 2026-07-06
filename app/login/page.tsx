"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isConfigured } from "@/lib/supabase";
import { Button, Card, ErrorNote, Field, Input } from "@/components/ui";

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
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-sky-700 via-blue-900 to-slate-900 p-6 md:justify-end md:p-12 lg:pr-24">
      {/* Full-bleed background photo (add public/login-bg.jpg). The gradient
          above shows through as a fallback if the image is missing. */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/login-bg.jpg)" }}
        aria-hidden
      />
      {/* Slight dark overlay so the card stays legible over the photo. */}
      <div className="absolute inset-0 bg-black/25" aria-hidden />
      <Card className="relative z-10 w-full max-w-sm p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="text-3xl">📦</div>
          <h1 className="mt-2 text-xl font-bold">CargoBook</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your personal cargo tracker
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <ErrorNote message={error} />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
