import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CargoBook — personal cargo tracker",
  description:
    "Track your shipments (kg, destination), invoices and payments, with printable invoices.",
};

// Applies the saved theme before first paint so there is no flash.
const themeInit = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="app-bg min-h-full flex flex-col text-slate-900 dark:text-slate-100">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  );
}
