"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** The routing skeleton. Feature tracks own the destination pages. */
const LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/report", label: "Report" },
  { href: "/my-reports", label: "My reports" },
  { href: "/staff", label: "Staff" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-[--radius] px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
