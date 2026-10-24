"use client";

import * as React from "react";
import { Select } from "@/components/ui";
import { useActiveUser } from "./active-user";

/**
 * "Viewing as" — the demo role switcher. In the student view it lists only
 * students; in the staff view it lists only staff, so each view's roster is its
 * own. Selecting a user sets the active seeded identity; the rest of the app
 * re-reads that user's context (notifications, office-scoped access).
 */
export function RoleSwitcher({ view = "student" }: { view?: "student" | "staff" }) {
  const { users, activeUser, setActiveUserId, loading } = useActiveUser();
  const selectId = React.useId();

  if (loading) {
    return <span className="text-sm text-muted-foreground">Loading…</span>;
  }

  const students = users.filter((u) => u.role === "student" && !u.id.startsWith("bg-"));
  const staff = users.filter((u) => u.role === "responder");
  const options = view === "staff" ? staff : students;

  const roleLabel = activeUser
    ? activeUser.role === "student"
      ? "student"
      : activeUser.privateOffice ?? activeUser.publicTeam ?? "staff"
    : "";

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="hidden text-sm text-muted-foreground sm:inline">
        {view === "staff" ? "Staff member:" : "Student:"}
      </label>
      <Select
        id={selectId}
        aria-label="Viewing as"
        value={activeUser?.id ?? ""}
        onChange={(e) => setActiveUserId(e.target.value)}
        className="h-9 w-auto min-w-44"
      >
        {options.map((u) => (
          <option key={u.id} value={u.id}>
            {view === "staff" ? u.name : `${u.name} (student)`}
          </option>
        ))}
      </Select>
      {activeUser ? (
        <span className="sr-only" aria-live="polite">
          Viewing as {activeUser.name} ({roleLabel})
        </span>
      ) : null}
    </div>
  );
}
