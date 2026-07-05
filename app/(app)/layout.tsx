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
        <aside className="no-print flex w-16 shrink-0 flex-col items-center gap-2 rounded-r-3xl bg-indigo-600 py-5 md:w-20">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-orange-500">
            <UserIcon />
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
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                  active
                    ? "bg-white text-indigo-600 shadow-md"
                    : "text-indigo-200 hover:bg-indigo-500 hover:text-white"
                }`}
              >
                <Icon />
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
            className="flex h-11 w-11 items-center justify-center rounded-xl text-indigo-200 hover:bg-indigo-500 hover:text-white"
          >
            <LogoutIcon />
          </button>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
