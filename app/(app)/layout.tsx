"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  BoxIcon,
  CoinsIcon,
  HomeIcon,
  InvoiceIcon,
  LogoutIcon,
  PinIcon,
  UserIcon,
} from "@/components/icons";

const NAV = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/shipments", label: "Shipments", icon: BoxIcon },
  { href: "/invoices", label: "Invoices", icon: InvoiceIcon },
  { href: "/payments", label: "Payments", icon: CoinsIcon },
  { href: "/destinations", label: "Destinations", icon: PinIcon },
];

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        setReady(true);
      } else {
        router.replace("/login");
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-indigo-900/50">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-1 p-3 md:p-6">
      <div className="mx-auto flex w-full max-w-6xl overflow-hidden rounded-[2rem] bg-[#f4f5fc] shadow-2xl shadow-indigo-900/20">
        <aside className="no-print flex w-16 shrink-0 flex-col gap-1.5 rounded-r-3xl bg-orange-500 px-2.5 py-5 md:w-56 md:px-4">
          <div className="mb-5 flex items-center gap-3 md:px-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-orange-500">
              <UserIcon />
            </div>
            <span className="hidden text-base font-bold text-white md:inline">
              CargoBook
            </span>
          </div>
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={`flex items-center justify-center gap-3 rounded-xl px-0 py-2.5 text-sm font-medium transition-colors md:justify-start md:px-3.5 ${
                  active
                    ? "bg-white text-orange-600 shadow-md"
                    : "text-orange-50 hover:bg-orange-400 hover:text-white"
                }`}
              >
                <span className="shrink-0">
                  <Icon />
                </span>
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
          <div className="flex-1" />
          <button
            title="Sign out"
            aria-label="Sign out"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/login");
            }}
            className="flex items-center justify-center gap-3 rounded-xl px-0 py-2.5 text-sm font-medium text-orange-50 hover:bg-orange-400 hover:text-white md:justify-start md:px-3.5"
          >
            <span className="shrink-0">
              <LogoutIcon />
            </span>
            <span className="hidden md:inline">Sign out</span>
          </button>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
