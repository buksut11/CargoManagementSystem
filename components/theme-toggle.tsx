"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";
import { useT } from "@/lib/i18n";

/**
 * Segmented moon/sun pill (login card, top-right in the reference art).
 * Clicking a segment selects that theme; the active segment is highlighted.
 */
export function ThemeTogglePill({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setDark(document.documentElement.classList.contains("dark")),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  function set(next: boolean) {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage unavailable (private mode) — theme still applies for this page.
    }
  }

  const segment =
    "flex h-7 w-7 items-center justify-center rounded-full transition-colors [&_svg]:h-4 [&_svg]:w-4";
  return (
    <div
      className={`flex items-center gap-0.5 rounded-full border border-slate-900/10 bg-slate-900/80 p-1 shadow-inner backdrop-blur dark:border-white/10 dark:bg-slate-950/60 ${className}`}
    >
      <button
        type="button"
        aria-label="Dark mode"
        aria-pressed={dark}
        onClick={() => set(true)}
        className={`${segment} ${
          dark
            ? "bg-slate-700 text-white shadow"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <MoonIcon />
      </button>
      <button
        type="button"
        aria-label="Light mode"
        aria-pressed={!dark}
        onClick={() => set(false)}
        className={`${segment} ${
          dark
            ? "text-slate-400 hover:text-slate-200"
            : "bg-white text-amber-500 shadow"
        }`}
      >
        <SunIcon />
      </button>
    </div>
  );
}

export function ThemeToggle({
  className = "",
  labelClass = "hidden md:inline",
}: {
  className?: string;
  labelClass?: string;
}) {
  const t = useT();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setDark(document.documentElement.classList.contains("dark")),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage unavailable (private mode) — theme still applies for this page.
    }
  }

  return (
    <button
      onClick={toggle}
      title={t("Switch light/dark mode")}
      aria-label={t("Switch light/dark mode")}
      className={className}
    >
      <span className="relative block h-5 w-5 shrink-0">
        <span
          className={`absolute inset-0 transition-all duration-500 ${
            dark ? "scale-50 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
          }`}
        >
          <SunIcon />
        </span>
        <span
          className={`absolute inset-0 transition-all duration-500 ${
            dark ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-90 opacity-0"
          }`}
        >
          <MoonIcon />
        </span>
      </span>
      <span className={labelClass}>
        {dark ? t("Dark mode") : t("Light mode")}
      </span>
    </button>
  );
}
