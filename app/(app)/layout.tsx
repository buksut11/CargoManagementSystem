"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";
import { RoleProvider } from "@/components/role-context";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BoxIcon,
  ClockIcon,
  CloseIcon,
  CoinsIcon,
  HomeIcon,
  InvoiceIcon,
  LogoutIcon,
  MenuIcon,
  PinIcon,
  UserIcon,
  WalletIcon,
} from "@/components/icons";

const ADMIN_NAV = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/shipments", label: "Shipments", icon: BoxIcon },
  { href: "/invoices", label: "Invoices", icon: InvoiceIcon },
  { href: "/payments", label: "Payments", icon: CoinsIcon },
  { href: "/expenses", label: "Expenses", icon: WalletIcon },
  { href: "/destinations", label: "Destinations", icon: PinIcon },
  { href: "/audit", label: "Audit trail", icon: ClockIcon },
];

const AGENT_NAV = [{ href: "/shipments", label: "Shipments", icon: BoxIcon }];

// Agents may only see the shipment list and individual shipments.
function agentAllowed(path: string) {
  return path === "/shipments" || /^\/shipments\/\d+$/.test(path);
}

const itemBase =
  "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors";
const itemIdle =
  "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-white";

function SidebarContent({
  role,
  pathname,
  onNavigate,
  onSignOut,
}: {
  role: UserRole;
  pathname: string;
  onNavigate?: () => void;
  onSignOut: () => void;
}) {
  const nav = role === "admin" ? ADMIN_NAV : AGENT_NAV;
  return (
    <>
      <div className="mb-5 flex items-center gap-3 px-1">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
          <UserIcon />
        </div>
        <div className="min-w-0">
          <div className="text-base font-bold text-slate-900 dark:text-white">
            CargoBook
          </div>
          <div className="text-xs capitalize text-slate-500 dark:text-slate-400">
            {role}
          </div>
        </div>
      </div>
      {nav.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`${itemBase} ${
              active
                ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                : itemIdle
            }`}
          >
            <span className="shrink-0">
              <Icon />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
      <div className="flex-1" />
      <ThemeToggle className={`${itemBase} ${itemIdle}`} labelClass="inline" />
      <button onClick={onSignOut} className={`${itemBase} ${itemIdle}`}>
        <span className="shrink-0">
          <LogoutIcon />
        </span>
        <span>Sign out</span>
      </button>
    </>
  );
}

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data.session) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.session.user.id)
        .single();
      if (!active) return;
      // No profile row (migration not applied yet) → assume admin so the
      // original single-user setup keeps working. The database enforces the
      // real permissions either way.
      setRole(profile?.role === "agent" ? "agent" : "admin");
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  // Keep agents on the pages they are allowed to see.
  useEffect(() => {
    if (role === "agent" && !agentAllowed(pathname)) {
      router.replace("/shipments");
    }
  }, [role, pathname, router]);

  // Close the mobile drawer whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!role || (role === "agent" && !agentAllowed(pathname))) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <RoleProvider role={role}>
      <div className="flex min-h-dvh w-full">
        {/* Desktop sidebar */}
        <aside className="no-print sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1.5 border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-800/60 md:flex">
          <SidebarContent role={role} pathname={pathname} onSignOut={signOut} />
        </aside>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
            <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col gap-1.5 overflow-y-auto bg-white px-4 py-5 shadow-2xl dark:bg-slate-800">
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/60"
              >
                <CloseIcon />
              </button>
              <SidebarContent
                role={role}
                pathname={pathname}
                onNavigate={() => setMenuOpen(false)}
                onSignOut={signOut}
              />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar with hamburger */}
          <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-800/95 md:hidden">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60"
            >
              <MenuIcon />
            </button>
            <span className="text-base font-bold text-slate-900 dark:text-white">
              CargoBook
            </span>
          </header>

          <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </RoleProvider>
  );
}
