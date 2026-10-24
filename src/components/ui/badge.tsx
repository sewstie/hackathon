import * as React from "react";
import { cn } from "@/lib/utils";
import type { Tier } from "@/types";

/** Inline style pairs for each tier: background + foreground, both >= 4.5:1. */
const TIER_STYLE: Record<Tier, React.CSSProperties> = {
  Low: { backgroundColor: "var(--tier-low-bg)", color: "var(--tier-low-fg)" },
  Medium: { backgroundColor: "var(--tier-medium-bg)", color: "var(--tier-medium-fg)" },
  High: { backgroundColor: "var(--tier-high-bg)", color: "var(--tier-high-fg)" },
  Urgent: { backgroundColor: "var(--tier-urgent-bg)", color: "var(--tier-urgent-fg)" },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** When set, renders a tier pill with the tier NAME as text plus its color. */
  tier?: Tier;
}

export function Badge({ className, tier, style, children, ...props }: BadgeProps) {
  const tierStyle = tier ? TIER_STYLE[tier] : undefined;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        !tier && "border border-border bg-muted text-muted-foreground",
        className,
      )}
      style={{ ...tierStyle, ...style }}
      {...props}
    >
      {/* Tier badges always carry the tier name as text, never color alone. */}
      {tier ? tier : children}
    </span>
  );
}
