import * as React from "react";
import { cn } from "@/lib/utils";
import { AriAvatar, ARI_NAME } from "./ari-avatar";

export interface AriShellProps {
  /** The one-line message Ari shows. */
  message?: React.ReactNode;
  /** Optional body (history line, quick fixes) wired by Track C. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Ari shell — purely PRESENTATIONAL. A small assistant card with Ari's
 * consistent friendly avatar, its name, and a warm chat-style message slot.
 * All behavior (history lines, quick fixes, emergency takeover) is wired by
 * feature tracks; this is just the consistent frame and identity.
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
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">
          {ARI_NAME}
        </p>
        {message ? (
          <p className="mt-0.5 text-sm font-medium">{message}</p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
