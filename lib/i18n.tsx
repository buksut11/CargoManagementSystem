"use client";

// Lightweight i18n for CargoBook.
//
// Design goals:
//  - Source string is the key. `t("Dashboard")` looks up the Somali string and
//    falls back to the English source, so wrapping a literal never breaks a
//    page even before its translation exists.
//  - Direction-aware from the start. Each locale carries a `dir` ("ltr"/"rtl"),
//    applied to <html> so an RTL locale can be dropped into LOCALES later and
//    the whole layout flips with no further code changes (see globals.css for
//    the [dir="rtl"] shell overrides).
//  - No hydration mismatch: the server and the first client render both use the
//    default locale; the saved locale is read in an effect and applied after
//    mount (the same shape as the theme toggle).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DICTIONARIES } from "@/lib/i18n-dict";

export type Locale = "en" | "so";
export type Dir = "ltr" | "rtl";

export type LocaleMeta = {
  /** English name of the language. */
  label: string;
  /** The language's own name, shown in the switcher. */
  native: string;
  /** Writing direction. Somali is Latin-script and reads left-to-right; the
   *  field exists so an RTL locale (e.g. Arabic) can be added with a real dir. */
  dir: Dir;
};

// Order here is the order shown in the language switcher.
export const LOCALES: Locale[] = ["en", "so"];

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { label: "English", native: "English", dir: "ltr" },
  so: { label: "Somali", native: "Soomaali", dir: "ltr" },
};

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "cargobook:locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as string[]).includes(value);
}

export function dirFor(locale: Locale): Dir {
  return LOCALE_META[locale]?.dir ?? "ltr";
}

/** Variables interpolated into a translation, e.g. t("Hi {name}", { name }). */
export type TVars = Record<string, string | number>;

/** Translate a source string into `locale`, interpolating any {vars}. */
export function translate(locale: Locale, key: string, vars?: TVars): string {
  const table = DICTIONARIES[locale];
  let out = (table && table[key]) ?? key;
  if (vars) {
    for (const name of Object.keys(vars)) {
      out = out.split(`{${name}}`).join(String(vars[name]));
    }
  }
  return out;
}

type I18nContextValue = {
  locale: Locale;
  dir: Dir;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: TVars) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

/** Apply the locale to <html lang/dir>. Kept in one place so the pre-paint
 *  script (app/layout.tsx) and the provider stay in sync. */
function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.lang = locale;
  el.dir = dirFor(locale);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Start on the default so server HTML and the first client render match; the
  // saved choice is applied in the effect below, after hydration.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(saved) && saved !== locale) {
        setLocaleState(saved);
        applyDocumentLocale(saved);
      }
    } catch {
      // localStorage unavailable (private mode) — stay on the default.
    }
    // Run once on mount; `locale` is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    applyDocumentLocale(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — the choice still applies for this session.
    }
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir: dirFor(locale),
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // A component rendered outside the provider still works, just untranslated.
    return {
      locale: DEFAULT_LOCALE,
      dir: "ltr",
      setLocale: () => {},
      t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
    };
  }
  return ctx;
}

/** The common case: `const t = useT();` then `t("Save")`. */
export function useT() {
  return useI18n().t;
}
