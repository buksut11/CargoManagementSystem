"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isConfigured } from "@/lib/supabase";
import { Button, Card, ErrorNote, Field, Input } from "@/components/ui";

// Emails that signed in successfully on this device, newest first.
const RECENT_KEY = "recent-logins";
const RECENT_MAX = 5;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // After first paint (avoids hydration mismatch) — same trick as ThemeToggle.
    const id = requestAnimationFrame(() => {
      try {
        const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
        if (Array.isArray(list)) {
          setRecent(list.filter((x): x is string => typeof x === "string"));
        }
      } catch {
        // corrupt or unavailable storage — just show no suggestions
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function saveRecent(list: string[]) {
    setRecent(list);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {
      // private mode — suggestions just won't persist
    }
  }

  function removeRecent(em: string) {
    saveRecent(recent.filter((e) => e !== em));
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
    } else {
      saveRecent(
        [email, ...recent.filter((e) => e !== email)].slice(0, RECENT_MAX),
      );
      router.replace("/");
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm p-8">
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
        {recent.length > 0 && (
          <div className="mb-4">
            <div className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Recent logins
            </div>
            <div className="flex flex-wrap gap-2">
              {recent.map((em) => (
                <span
                  key={em}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1.5 text-xs dark:border-slate-600 dark:bg-slate-700/40"
                >
                  <button
                    type="button"
                    onClick={() => setEmail(em)}
                    className="font-medium text-slate-700 hover:text-orange-600 dark:text-slate-200 dark:hover:text-orange-400"
                  >
                    {em}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${em} from recent logins`}
                    onClick={() => removeRecent(em)}
                    className="rounded-full px-1 text-slate-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={signIn} className="space-y-4">
          <Field label="Email">
            <Input
              type="email"
              name="email"
              autoComplete="username"
              list="recent-login-emails"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            {/* Shows this device's recent logins as a native dropdown on the field */}
            <datalist id="recent-login-emails">
              {recent.map((em) => (
                <option key={em} value={em} />
              ))}
            </datalist>
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
