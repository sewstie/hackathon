"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { getStore } from "@/lib/store";
import { Nav } from "./nav";
import { NotificationBell } from "./notification-bell";
import { RoleSwitcher } from "./role-switcher";
import { UniversityName } from "./university-name";

/**
 * App header, composed of stable, independently-ownable slots:
 *   [logo] · [university-name slot] · [nav] · [notification-bell slot] · [role-switcher]
 *
 * The notification-bell slot is its own component (`NotificationBell`, owned by
 * Track B) and the university-name slot is a dedicated element Track B fills by
 * swapping in a `university-name.tsx` — both can change without re-editing this
 * file's layout. The campus name moved OUT of the logo link into the
 * university-name slot so it reads as its own element ("UniFix | MIT").
 */
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
        {/* logo slot */}
        <Link href="/" aria-label="UniFix home" className="flex items-center font-semibold">
          <Image
            src="/logo.png"
            alt=""
            width={86}
            height={48}
            priority
            className="h-8 w-auto"
          />
        </Link>
        {/* university-name slot — own element, divided from the logo (Track B) */}
        <UniversityName campusName={campusName} />
        {/* nav slot */}
        <div className="hidden md:block">
          <Nav />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* notification-bell slot (content owned by Track B) */}
          <NotificationBell />
          {/* role-switcher slot */}
          <RoleSwitcher />
        </div>
        <div className="w-full md:hidden">
          <Nav />
        </div>
      </div>
    </header>
  );
}
