"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Accessible dialog title; wired to aria-labelledby. */
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  /**
   * Ref to the element that should receive focus on open (e.g. Call 911).
   * Falls back to the first focusable element, then the dialog itself.
   */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Optional full-bleed block rendered above the title (e.g. an illustration). */
  hero?: React.ReactNode;
  /** Extra classes for the title and the body wrapper (layout tweaks). */
  titleClassName?: string;
  bodyClassName?: string;
}

/**
 * An accessible modal dialog: role="dialog" aria-modal, focus moves in on open
 * and is TRAPPED (Tab cycles within), Escape closes, and focus is restored to
 * the previously-focused element on close.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  initialFocusRef,
  hero,
  titleClassName,
  bodyClassName,
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  const previouslyFocused = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Move focus into the dialog.
    const focusInitial = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panelRef.current)?.focus();
    };
    focusInitial();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose, initialFocusRef]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-hidden={false}
    >
      {/* Backdrop — clicking it closes the dialog. */}
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "cx-pop relative z-10 w-full max-w-md rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-[var(--shadow-lg)] sm:p-7",
          className,
        )}
      >
        {hero}
        <h2 id={titleId} className={cn("text-lg font-semibold", titleClassName)}>
          {title}
        </h2>
        {description ? (
          <p id={descId} className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        <div className={cn("mt-4", bodyClassName)}>{children}</div>
      </div>
    </div>
  );
}
