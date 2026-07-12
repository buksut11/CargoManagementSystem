"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { OrgRole } from "@/lib/types";

// The organization the signed-in user is currently acting in, plus their role
// in it. Populated by the app layout after resolving the user's memberships.
export type OrgContextValue = {
  orgId: string;
  orgName: string;
  logoUrl: string | null;
  role: OrgRole;
  // Enabled product modules for the active org ('cargo' | 'flights').
  modules: string[];
};

const OrgContext = createContext<OrgContextValue | null>(null);

// Lets descendants (e.g. Settings) push updates to org fields that also live in
// the app chrome — currently the sidebar logo — so a change is reflected
// immediately without waiting for a full page reload.
type OrgActions = { setLogoUrl: (url: string | null) => void };
const OrgActionsContext = createContext<OrgActions | null>(null);

export function OrgProvider({
  value,
  actions,
  children,
}: {
  value: OrgContextValue;
  actions?: OrgActions;
  children: ReactNode;
}) {
  return (
    <OrgContext.Provider value={value}>
      <OrgActionsContext.Provider value={actions ?? null}>
        {children}
      </OrgActionsContext.Provider>
    </OrgContext.Provider>
  );
}

// Returns the active organization, or null when used outside a resolved
// session (e.g. a database that predates the multi-tenant migrations).
export function useOrg(): OrgContextValue | null {
  return useContext(OrgContext);
}

// Updates the active org's logo in the shared context. No-op when used outside
// a provider that wired the action.
export function useSetOrgLogo(): (url: string | null) => void {
  const actions = useContext(OrgActionsContext);
  return actions?.setLogoUrl ?? (() => {});
}
