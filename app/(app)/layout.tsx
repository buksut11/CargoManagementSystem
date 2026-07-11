"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cacheBranding } from "@/lib/branding";
import type { OrgRole, UserRole } from "@/lib/types";
import { RoleProvider } from "@/components/role-context";
import { OrgProvider, type OrgContextValue } from "@/components/org-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { PageTransition } from "@/components/page-transition";
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
  SettingsIcon,
  UsersIcon,
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
  { href: "/members", label: "Members", icon: UsersIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const AGENT_NAV = [{ href: "/shipments", label: "Shipments", icon: BoxIcon }];

// Managers get everything operational, minus member management and settings.
const MANAGER_NAV = ADMIN_NAV.filter(
  (item) => item.href !== "/members" && item.href !== "/settings",
);

// Remembers which organization the user last acted in (for multi-org accounts).
const ACTIVE_ORG_KEY = "cargobook:activeOrg";

function navForRole(role: OrgRole) {
  if (role === "agent") return AGENT_NAV;
  if (role === "manager") return MANAGER_NAV;
  return ADMIN_NAV;
}

// Which paths each role may visit (agents: shipments only; managers: everything
// except member management and settings).
function pathAllowed(role: OrgRole, path: string) {
  if (role === "agent") {
    return path === "/shipments" || /^\/shipments\/\d+$/.test(path);
  }
  if (role === "manager") {
    return path !== "/members" && path !== "/settings";
  }
  return true;
}

const itemBase =
  "flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors";
const itemIdle =
  "text-slate-600 hover:bg-white/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white";

function SidebarContent({
  orgRole,
  orgName,
  orgLogoUrl,
  pathname,
  onNavigate,
  onSignOut,
}: {
  orgRole: OrgRole;
  orgName: string;
  orgLogoUrl: string | null;
  pathname: string;
  onNavigate?: () => void;
  onSignOut: () => void;
}) {
  const nav = navForRole(orgRole);
  return (
    <>
      <div className="mb-5 flex items-center gap-2.5 px-1">
        <div
          className={`h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5 dark:ring-white/10 ${
            orgLogoUrl ? "" : "bg-white dark:bg-slate-700"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={orgLogoUrl || "/icc-logo.svg"}
            alt={orgLogoUrl ? `${orgName} logo` : "ICC"}
            width={40}
            height={40}
            className={`h-full w-full ${orgLogoUrl ? "object-contain" : "object-cover"}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="line-clamp-2 break-words text-[13px] font-bold leading-tight text-slate-900 dark:text-white"
            title={orgName}
          >
            {orgName}
          </div>
          <div className="truncate text-xs capitalize text-slate-500 dark:text-slate-400">
            CargoBook · {orgRole}
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
                ? "bg-white/60 text-blue-700 shadow-sm ring-1 ring-white/70 dark:bg-white/[0.12] dark:text-blue-300 dark:ring-white/10"
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
  const [resolved, setResolved] = useState<{
    uiRole: UserRole;
    org: OrgContextValue;
  } | null>(null);
  const [noOrg, setNoOrg] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const orgRole = resolved?.org.role ?? null;

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const session = data.session;
      if (!session) {
        router.replace("/login");
        return;
      }

      // Resolve the organizations this user belongs to, via their memberships.
      const { data: rows, error } = await supabase
        .from("memberships")
        .select("org_id, role, organizations(name, logo_url)")
        .order("created_at", { ascending: true });
      if (!active) return;

      if (error) {
        // Database predates the multi-tenant migrations — fall back to the
        // global profiles.role so the app still works.
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (!active) return;
        const uiRole: UserRole = profile?.role === "agent" ? "agent" : "admin";
        setResolved({
          uiRole,
          org: { orgId: "", orgName: "CargoBook", logoUrl: null, role: uiRole },
        });
        return;
      }

      if (!rows || rows.length === 0) {
        // Signed in but not a member of any organization (invite-only).
        setNoOrg(true);
        return;
      }

      const orgs = rows.map(
        (m: {
          org_id: string;
          role: OrgRole;
          organizations:
            | { name?: string; logo_url?: string | null }
            | { name?: string; logo_url?: string | null }[]
            | null;
        }) => {
          const rel = m.organizations;
          const org = Array.isArray(rel) ? rel[0] : rel;
          return {
            id: m.org_id,
            name: org?.name ?? "Organization",
            logoUrl: org?.logo_url ?? null,
            role: m.role,
          };
        },
      );

      let storedId: string | null = null;
      try {
        storedId = localStorage.getItem(ACTIVE_ORG_KEY);
      } catch {
        // localStorage unavailable — fall through to the first org.
      }
      const activeOrg = orgs.find((o) => o.id === storedId) ?? orgs[0];
      // Remember this org's branding so the login screen shows it on the
      // user's next visit (see lib/branding.ts).
      cacheBranding({ name: activeOrg.name, logoUrl: activeOrg.logoUrl });
      const uiRole: UserRole = activeOrg.role === "agent" ? "agent" : "admin";
      setResolved({
        uiRole,
        org: {
          orgId: activeOrg.id,
          orgName: activeOrg.name,
          logoUrl: activeOrg.logoUrl,
          role: activeOrg.role,
        },
      });
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

  // Keep each role on the pages they are allowed to see.
  useEffect(() => {
    if (orgRole && !pathAllowed(orgRole, pathname)) {
      router.replace(orgRole === "agent" ? "/shipments" : "/");
    }
  }, [orgRole, pathname, router]);

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

  // Let the Settings page reflect a logo change in the sidebar without a reload.
  const setLogoUrl = useCallback((url: string | null) => {
    setResolved((prev) => {
      if (!prev) return prev;
      cacheBranding({ name: prev.org.orgName, logoUrl: url });
      return { ...prev, org: { ...prev.org, logoUrl: url } };
    });
  }, []);
  const orgActions = useMemo(() => ({ setLogoUrl }), [setLogoUrl]);

  if (noOrg) {
    return <NoOrgScreen onSignOut={signOut} />;
  }

  if (!resolved || (orgRole && !pathAllowed(orgRole, pathname))) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <OrgProvider value={resolved.org} actions={orgActions}>
    <RoleProvider role={resolved.uiRole}>
      <div className="flex min-h-dvh w-full">
        {/* Desktop sidebar */}
        <aside className="no-print sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1.5 border-r border-white/50 bg-white/25 px-4 py-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/30 md:flex">
          <SidebarContent
            orgRole={resolved.org.role}
            orgName={resolved.org.orgName}
            orgLogoUrl={resolved.org.logoUrl}
            pathname={pathname}
            onSignOut={signOut}
          />
        </aside>

        {/* Mobile drawer — kept mounted so it can slide in and out. When closed
            it is pushed off-screen and made click-through. */}
        <div
          className={`fixed inset-0 z-40 md:hidden ${
            menuOpen ? "" : "pointer-events-none"
          }`}
          aria-hidden={!menuOpen}
        >
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out motion-reduce:transition-none ${
              menuOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <aside
            className={`no-scrollbar absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col gap-1.5 overflow-y-auto border-r border-white/50 bg-white/55 px-4 py-5 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-out motion-reduce:transition-none dark:border-white/10 dark:bg-slate-900/70 ${
              menuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 rounded-full p-1.5 text-slate-500 hover:bg-white/60 dark:text-slate-400 dark:hover:bg-white/10"
            >
              <CloseIcon />
            </button>
            <SidebarContent
              orgRole={resolved.org.role}
              orgName={resolved.org.orgName}
              orgLogoUrl={resolved.org.logoUrl}
              pathname={pathname}
              onNavigate={() => setMenuOpen(false)}
              onSignOut={signOut}
            />
          </aside>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar with hamburger */}
          <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-white/50 bg-white/35 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/50 md:hidden">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="rounded-full p-1.5 text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <MenuIcon />
            </button>
            <span className="text-base font-bold text-slate-900 dark:text-white">
              CargoBook
            </span>
          </header>

          <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-6xl">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
      </div>
    </RoleProvider>
    </OrgProvider>
  );
}

// Signed in, but the account has no organization membership (invite-only).
function NoOrgScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30">
        <BoxIcon />
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          No organization yet
        </h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Your account isn’t part of any organization. Ask an admin to invite
          you, then sign in again.
        </p>
      </div>
      <button
        onClick={onSignOut}
        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
      >
        Sign out
      </button>
    </div>
  );
}
