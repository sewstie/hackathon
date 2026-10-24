"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DEMO_ENTRY, type DemoView } from "./demo-view";

/** Each demo view has its own nav, so the two never blur together. */
const LINKS: Record<Exclude<DemoView, "landing">, Array<{ href: string; label: string }>> = {
  student: [
    { href: DEMO_ENTRY.student, label: "Campus feed" },
    { href: "/report", label: "Report" },
    { href: "/private", label: "Private report" },
    { href: "/my-reports", label: "My reports" },
  ],
  staff: [
    { href: DEMO_ENTRY.staff, label: "Team queue" },
    { href: "/staff-private", label: "Private inbox" },
  ],
};

export function Nav({ view = "student" }: { view?: Exclude<DemoView, "landing"> }) {
  const pathname = usePathname();
  return (
    <nav aria-label={view === "staff" ? "Staff" : "Student"} className="flex flex-wrap items-center gap-1">
      {LINKS[view].map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            data-spot={`nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? view === "staff"
                  ? "bg-staff-muted text-foreground"
                  : "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
