"use client";

import { useEffect, useRef, useState } from "react";
import { GlobeIcon } from "@/components/icons";
import {
  LOCALES,
  LOCALE_META,
  useI18n,
  type Locale,
} from "@/lib/i18n";

/**
 * Sidebar language control — a full-width row matching the theme toggle and
 * sign-out items. Clicking opens a small popover listing every language by its
 * own name; picking one switches instantly and persists the choice.
 */
export function LanguageToggle({
  className = "",
  labelClass = "inline",
}: {
  className?: string;
  labelClass?: string;
}) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function choose(next: Locale) {
    setLocale(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("Language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={className}
      >
        <span className="shrink-0">
          <GlobeIcon />
        </span>
        <span className={labelClass}>{LOCALE_META[locale].native}</span>
      </button>
      {open && (
        <div
          role="listbox"
          className="glass-popover animate-pop-in absolute bottom-full left-0 z-50 mb-2 w-44 rounded-xl p-1.5"
        >
          {LOCALES.map((code) => {
            const active = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => choose(code)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  active
                    ? "font-semibold text-blue-700 dark:text-blue-300"
                    : "text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/[0.08]"
                }`}
              >
                <span>{LOCALE_META[code].native}</span>
                {active && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden
                  >
                    <path d="M5 13l4 4 10-10" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Compact glass pill for the login card (sits beside the theme pill). Shows a
 * globe and the active language code; opens the same language menu.
 */
export function LanguageTogglePill({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function choose(next: Locale) {
    setLocale(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("Language")}
        aria-label={t("Language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-full border border-slate-900/10 bg-slate-900/80 px-3 text-xs font-semibold uppercase tracking-wide text-white shadow-inner backdrop-blur dark:border-white/10 dark:bg-slate-950/60 [&_svg]:h-4 [&_svg]:w-4"
      >
        <GlobeIcon />
        {locale}
      </button>
      {open && (
        <div
          role="listbox"
          className="glass-popover animate-pop-in absolute right-0 top-full z-50 mt-2 w-40 rounded-xl p-1.5"
        >
          {LOCALES.map((code) => {
            const active = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => choose(code)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  active
                    ? "font-semibold text-blue-700 dark:text-blue-300"
                    : "text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/[0.08]"
                }`}
              >
                <span>{LOCALE_META[code].native}</span>
                {active && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden
                  >
                    <path d="M5 13l4 4 10-10" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
