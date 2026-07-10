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
};

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({
  value,
  children,
}: {
  value: OrgContextValue;
  children: ReactNode;
}) {
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

// Returns the active organization, or null when used outside a resolved
// session (e.g. a database that predates the multi-tenant migrations).
export function useOrg(): OrgContextValue | null {
  return useContext(OrgContext);
}
