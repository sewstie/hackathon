"use client";

import * as React from "react";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { Nav } from "./nav";
import { NotificationBell } from "./notification-bell";
import { RoleSwitcher } from "./role-switcher";

/** App header: logo, campus name, primary nav, notification bell, role switcher. */
export function Header() {
  const [campusName, setCampusName] = React.useState<string>("");

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

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo />
          <span>UniFix</span>
          {campusName ? (
            <span className="text-sm font-normal text-muted-foreground">· {campusName}</span>
          ) : null}
        </Link>
        <div className="hidden md:block">
          <Nav />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <RoleSwitcher />
        </div>
        <div className="w-full md:hidden">
          <Nav />
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
    >
      CF
    </span>
  );
}
