"use client";

import * as React from "react";
import { getStore } from "@/lib/store";
import type { User } from "@/types";

interface ActiveUserContextValue {
  /** The full demo roster, grouped later by the switcher. */
  users: User[];
  /** The currently-selected seeded user ("Viewing as"). */
  activeUser: User | null;
  setActiveUserId: (id: string) => void;
  loading: boolean;
}

const ActiveUserContext = React.createContext<ActiveUserContextValue | null>(null);

/** The demo's identity: no real login, a header switcher picks a seeded user. */
export function ActiveUserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = React.useState<User[]>([]);
  const [activeUserId, setActiveUserId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    getStore()
      .listUsers()
      .then((roster) => {
        if (cancelled) return;
        setUsers(roster);
        // Default to Ana (the scripted default), else the first user.
        const ana = roster.find((u) => u.name === "Ana");
        setActiveUserId(ana?.id ?? roster[0]?.id ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeUser = React.useMemo(
    () => users.find((u) => u.id === activeUserId) ?? null,
    [users, activeUserId],
  );

  const value = React.useMemo<ActiveUserContextValue>(
    () => ({ users, activeUser, setActiveUserId, loading }),
    [users, activeUser, loading],
  );

  return <ActiveUserContext.Provider value={value}>{children}</ActiveUserContext.Provider>;
}

export function useActiveUser(): ActiveUserContextValue {
  const ctx = React.useContext(ActiveUserContext);
  if (!ctx) throw new Error("useActiveUser must be used within <ActiveUserProvider>");
  return ctx;
}
