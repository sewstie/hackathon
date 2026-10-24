"use client";

import * as React from "react";
import { Select } from "@/components/ui";
import { useActiveUser } from "./active-user";

/**
 * "Viewing as: Ana (student)" — the demo role switcher. Selecting a user sets
 * the active seeded identity; the rest of the app re-reads that user's context
 * (notifications, office-scoped access) from the switch.
 */
export function RoleSwitcher() {
  const { users, activeUser, setActiveUserId, loading } = useActiveUser();
  const selectId = React.useId();

  const students = users.filter((u) => u.role === "student");
  const staff = users.filter((u) => u.role === "responder");

  if (loading) {
    return <span className="text-sm text-muted-foreground">Loading…</span>;
  }

  const roleLabel = activeUser
    ? activeUser.role === "student"
      ? "student"
      : activeUser.privateOffice ?? activeUser.publicTeam ?? "staff"
    : "";

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="hidden text-sm text-muted-foreground sm:inline">
        Viewing as:
      </label>
      <Select
        id={selectId}
        aria-label="Viewing as"
        value={activeUser?.id ?? ""}
        onChange={(e) => setActiveUserId(e.target.value)}
        className="h-9 w-auto min-w-44"
      >
        <optgroup label="Students">
          {/* Keep the scripted trio first, then background students. */}
          {students
            .filter((u) => !u.id.startsWith("bg-"))
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} (student)
              </option>
            ))}
        </optgroup>
        <optgroup label="Staff">
          {staff.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </optgroup>
      </Select>
      {activeUser ? (
        <span className="sr-only" aria-live="polite">
          Viewing as {activeUser.name} ({roleLabel})
        </span>
      ) : null}
    </div>
  );
}
