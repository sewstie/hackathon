import * as React from "react";
import { cn } from "@/lib/utils";

export interface AriShellProps {
  /** The one-line message Ari shows. */
  message?: React.ReactNode;
  /** Optional body (history line, quick fixes) wired by Track C. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Ari shell — purely PRESENTATIONAL. A small assistant card with an avatar and
 * a message slot. All behavior (history lines, quick fixes, emergency takeover)
 * is wired by feature tracks; this is just the consistent frame.
 */
export function AriShell({ message, children, className }: AriShellProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[--radius] border border-border bg-muted/50 p-3",
        className,
      )}
    >
      <AriAvatar />
      <div className="min-w-0 flex-1">
        {message ? <p className="text-sm font-medium">{message}</p> : null}
        {children}
      </div>
    </div>
  );
}

function AriAvatar() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
    >
      Ari
    </span>
  );
}
