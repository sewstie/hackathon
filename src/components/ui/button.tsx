import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground shadow-[var(--shadow-sm)] hover:opacity-90",
  secondary: "border border-border bg-card text-foreground hover:border-primary/30 hover:bg-primary/5",
  ghost: "bg-transparent text-foreground hover:bg-muted",
  danger: "bg-danger text-danger-foreground shadow-[var(--shadow-sm)] hover:opacity-90",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3.5 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/** Accessible button. Native <button> so it is keyboard-operable by default. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,opacity,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
