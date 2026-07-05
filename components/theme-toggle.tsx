"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";

export function ThemeToggle({ className = "" }: { className?: string }) {
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
      title="Switch light/dark mode"
      aria-label="Switch light/dark mode"
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
      <span className="hidden md:inline">
        {dark ? "Dark mode" : "Light mode"}
      </span>
    </button>
  );
}
