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

/**
 * The demo remembers who you were "viewing as" in EACH view, so a refresh keeps
 * you on the same person (e.g. the Housing staff member) instead of resetting.
 */
const rememberKey = (role: User["role"]) => `unifix.viewAs.${role}`;

export function rememberedUserId(role: User["role"]): string | null {
  try {
    return window.localStorage.getItem(rememberKey(role));
  } catch {
    return null;
  }
}

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
        // The student you last viewed as, else Ana (the scripted default).
        const remembered = rememberedUserId("student");
        const student = roster.find((u) => u.id === remembered && u.role === "student");
        const ana = roster.find((u) => u.name === "Ana");
        setActiveUserId(student?.id ?? ana?.id ?? roster[0]?.id ?? null);
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

  // Switching who you view as also remembers it for that view (survives refresh).
  const chooseUser = React.useCallback(
    (id: string) => {
      const u = users.find((x) => x.id === id);
      if (u) {
        try {
          window.localStorage.setItem(rememberKey(u.role), u.id);
        } catch {
          // storage unavailable: still switch for this page
        }
      }
      setActiveUserId(id);
    },
    [users],
  );

  const value = React.useMemo<ActiveUserContextValue>(
    () => ({ users, activeUser, setActiveUserId: chooseUser, loading }),
    [users, activeUser, loading, chooseUser],
  );

  return <ActiveUserContext.Provider value={value}>{children}</ActiveUserContext.Provider>;
}

export function useActiveUser(): ActiveUserContextValue {
  const ctx = React.useContext(ActiveUserContext);
  if (!ctx) throw new Error("useActiveUser must be used within <ActiveUserProvider>");
  return ctx;
}
