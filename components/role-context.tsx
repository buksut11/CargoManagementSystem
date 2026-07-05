"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { UserRole } from "@/lib/types";

const RoleContext = createContext<UserRole>("admin");

export function RoleProvider({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useRole(): UserRole {
  return useContext(RoleContext);
}
