"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { getStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { rememberedUserId, useActiveUser } from "./active-user";
import { demoViewFor, DEMO_ENTRY, type DemoView } from "./demo-view";
import { Nav } from "./nav";
import { NotificationBell } from "./notification-bell";
import { RoleSwitcher } from "./role-switcher";
import { UniversityName } from "./university-name";

/**
 * App header. One app, three visibly different faces, picked from the URL:
 *  - the explainer site ("/"): logo + buttons into the two demos, no demo chrome;
 *  - the STUDENT demo: an indigo "Student view" banner, student nav + roster;
 *  - the STAFF demo: a teal "Staff view" banner, staff nav + roster.
 * Entering a view also switches "Viewing as" to someone who belongs in it.
 */
export function Header() {
  const view = demoViewFor(usePathname());
  if (view === "landing") return <LandingHeader />;
  return <DemoHeader view={view} />;
}

function Logo({ href }: { href: string }) {
  return (
    <Link href={href} aria-label="UniFix home" className="flex items-center font-semibold">
      <Image src="/logo-mark.png" alt="" width={658} height={248} priority className="h-10 w-auto sm:h-11" />
    </Link>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-2">
        <Logo href="/" />
        {/* The logo already reads "UniFix"; keep the name for screen readers. */}
        <span className="sr-only">UniFix</span>
        <nav aria-label="Demos" className="ml-auto flex flex-wrap items-center gap-2">
          {/* Staff is available but quiet; the student demo is the main door. */}
          <Link
            href={DEMO_ENTRY.staff}
            className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Staff demo
          </Link>
          <Link
            href={DEMO_ENTRY.student}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_10px_24px_-12px_var(--primary)] transition-transform hover:-translate-y-0.5"
          >
            Student demo <span aria-hidden>→</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** Keep the active identity inside the current view (a student in the student
 * view, a staff member in the staff view). Defaults: Ana / Rosa. */
function useViewIdentity(view: Exclude<DemoView, "landing">) {
  const { users, activeUser, setActiveUserId, loading } = useActiveUser();
  React.useEffect(() => {
    if (loading || users.length === 0) return;
    const wantRole = view === "staff" ? "responder" : "student";
    if (activeUser?.role === wantRole) return;
    // Whoever you last viewed as in this view, else the scripted default.
    const remembered = rememberedUserId(wantRole);
    const last = users.find((u) => u.id === remembered && u.role === wantRole);
    const pick =
      last ??
      (view === "staff"
        ? users.find((u) => u.id === "staff-facilities") ?? users.find((u) => u.role === "responder")
        : users.find((u) => u.name === "Ana") ?? users.find((u) => u.role === "student"));
    if (pick) setActiveUserId(pick.id);
  }, [view, users, activeUser, setActiveUserId, loading]);
}

function DemoHeader({ view }: { view: Exclude<DemoView, "landing"> }) {
  const [campusName, setCampusName] = React.useState<string>("");
  useViewIdentity(view);

  React.useEffect(() => {
    let cancelled = false;
    getStore()
      .listCampuses()
      .then((campuses) => {
        if (!cancelled) setCampusName(campuses[0]?.name ?? "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const staff = view === "staff";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      {/* The view banner: the obvious "which side am I on" signal. */}
      <div
        className={cn(
          "text-sm",
          staff ? "bg-staff text-staff-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5" data-spot="switch-view">
          <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
            Demo
          </span>
          <span className="font-semibold">{staff ? "Staff view" : "Student view"}</span>
          <span className="hidden opacity-90 sm:inline">
            {staff
              ? "what campus staff see when they fix reports"
              : "what a student sees when they report problems"}
          </span>
          <span className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("unifix:onboarding-open"))}
              className="underline-offset-2 opacity-90 hover:underline"
            >
              Demo guide
            </button>
            <Link href="/" className="underline-offset-2 opacity-90 hover:underline">
              About UniFix
            </Link>
            <Link
              href={staff ? DEMO_ENTRY.student : DEMO_ENTRY.staff}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-90",
                // In the staff view the way back is available but quiet.
                staff
                  ? "border border-staff-foreground/40 text-staff-foreground"
                  : "bg-background text-foreground",
              )}
            >
              {staff ? "Switch to student view →" : "Switch to staff view →"}
            </Link>
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-2">
        <Logo href={staff ? DEMO_ENTRY.staff : DEMO_ENTRY.student} />
        <UniversityName campusName={staff && campusName ? `${campusName} Staff` : campusName} />
        <div className="hidden md:block" data-spot="nav">
          <Nav view={view} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span data-spot="bell">
            <NotificationBell />
          </span>
          <span data-spot="role">
            <RoleSwitcher view={view} />
          </span>
        </div>
        <div className="w-full md:hidden">
          <Nav view={view} />
        </div>
      </div>
    </header>
  );
}
