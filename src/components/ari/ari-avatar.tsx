"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AriRobot } from "./ari-robot";

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
 * Ari's small avatar: the robot's head (glossy white shell, dark visor, glowing
 * eyes) from the Ari project, in a soft round badge. Inline SVG, no asset fetch,
 * so it renders identically offline and in tests. Every Ari surface reuses it.
 */
export function AriAvatar({ label, className }: AriAvatarProps) {
  const decorative = label === undefined;
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card",
        className,
      )}
    >
      <AriRobot variant="head" size={28} />
    </span>
  );
}
