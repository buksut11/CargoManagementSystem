import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CargoBook — personal cargo tracker",
  description:
    "Track your shipments (kg, destination), invoices and payments, with printable invoices.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#b6bdf2] text-slate-900">
        {children}
      </body>
    </html>
  );
}
