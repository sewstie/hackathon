import * as React from "react";
import { cn } from "@/lib/utils";

/** The assistant's consistent name across the whole app. */
export const ARI_NAME = "Ari" as const;

export interface AriAvatarProps {
  /**
   * Accessible label. Defaults to a hidden decorative avatar (the name is
   * shown alongside it in text). Pass a label to make the avatar itself the
   * announced name when it stands alone.
   */
  label?: string;
  className?: string;
}

/**
 * Ari's small, friendly face — a warm rounded avatar with a simple smiling
 * expression. Purely presentational and self-contained (inline SVG, no asset
 * fetch) so it renders identically offline and in tests. This is the single
 * source of Ari's visual identity; every Ari surface reuses it.
 */
export function AriAvatar({ label, className }: AriAvatarProps) {
  const decorative = label === undefined;
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {/* friendly eyes */}
        <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
        {/* warm smile */}
        <path d="M8.5 14c1 1.2 2.1 1.8 3.5 1.8s2.5-.6 3.5-1.8" />
      </svg>
    </span>
  );
}
