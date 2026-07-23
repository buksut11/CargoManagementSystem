import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "CargoBook — personal cargo tracker",
  description:
    "Track your shipments (kg, destination), invoices and payments, with printable invoices.",
};

// Applies the saved theme before first paint so there is no flash.
const themeInit = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

// Applies the saved language + writing direction before first paint, so RTL
// locales lay out correctly from the very first frame (the map mirrors
// LOCALE_META in lib/i18n.tsx — Somali and English are both LTR today).
const localeInit = `try{var d={en:"ltr",so:"ltr"};var l=localStorage.getItem("cargobook:locale");if(l&&d[l]){document.documentElement.lang=l;document.documentElement.dir=d[l]}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className="h-full antialiased" suppressHydrationWarning>
      <body className="app-bg min-h-full flex flex-col text-slate-900 dark:text-slate-100">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script dangerouslySetInnerHTML={{ __html: localeInit }} />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
