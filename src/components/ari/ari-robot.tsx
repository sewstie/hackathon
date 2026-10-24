"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Ari's look, matching the Ari project (github.com/NicolasNabhan/ari): a
 * little glossy white robot with a dark visor and glowing cyan eyes. It hovers,
 * blinks, and waves now and then (smiling with its eyes as it does). All colors
 * come from the `--ari-*` theme tokens in globals.css; animations are CSS-only
 * and honor prefers-reduced-motion.
 *
 * `variant="full"` is the whole floating robot (dialogs, landing page);
 * `variant="head"` is just the head, sized for small avatars.
 */
export interface AriRobotProps {
  variant?: "full" | "head";
  /** Rendered width in px (full robot is 1.2× taller than wide). */
  size?: number;
  /** Accessible name. Omit to make the robot decorative. */
  label?: string;
  className?: string;
}

/** SVG paint helpers: CSS variables via `style`, so no hex lives in markup. */
const v = (token: string) => `var(--ari-${token})`;

export function AriRobot({ variant = "full", size = 96, label, className }: AriRobotProps) {
  // Gradient ids must be unique per instance; useId can contain characters
  // that are awkward inside url(#…), so keep only safe ones.
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (name: string) => `ari-${name}-${uid}`;
  const url = (name: string) => `url(#${id(name)})`;
  const decorative = label === undefined;
  const a11y = {
    role: decorative ? undefined : "img",
    "aria-hidden": decorative ? true : undefined,
    "aria-label": decorative ? undefined : label,
  } as const;

  const defs = (
    <defs>
      <radialGradient id={id("shell")} cx="35%" cy="25%" r="85%">
        <stop offset="0%" style={{ stopColor: v("shell-hi") }} />
        <stop offset="50%" style={{ stopColor: v("shell-mid") }} />
        <stop offset="100%" style={{ stopColor: v("shell-lo") }} />
      </radialGradient>
      <linearGradient id={id("shade")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="55%" style={{ stopColor: v("shade"), stopOpacity: 0 }} />
        <stop offset="100%" style={{ stopColor: v("shade"), stopOpacity: 0.16 }} />
      </linearGradient>
      <linearGradient id={id("visor")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style={{ stopColor: v("visor-top") }} />
        <stop offset="100%" style={{ stopColor: v("visor-bottom") }} />
      </linearGradient>
      <linearGradient id={id("dark")} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" style={{ stopColor: v("dark-hi") }} />
        <stop offset="100%" style={{ stopColor: v("dark-lo") }} />
      </linearGradient>
      <filter id={id("glow")} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.2" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id={id("soft")} x="-100%" y="-300%" width="300%" height="700%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
    </defs>
  );

  const head = (
    <g>
      <rect x="97" y="6" width="6" height="16" rx="3" fill={url("dark")} />
      <circle cx="100" cy="6" r="5" style={{ fill: v("antenna") }} filter={url("glow")} className="robot-antenna" />
      <ellipse cx="30" cy="74" rx="7" ry="17" fill={url("dark")} />
      <ellipse cx="170" cy="74" rx="7" ry="17" fill={url("dark")} />
      <rect x="30" y="18" width="140" height="108" rx="54" fill={url("shell")} />
      <rect x="30" y="18" width="140" height="108" rx="54" fill={url("shade")} />
      <ellipse cx="66" cy="34" rx="22" ry="8" style={{ fill: v("shell-hi") }} opacity="0.8" transform="rotate(-14 66 34)" />
      <rect x="44" y="42" width="112" height="62" rx="31" fill={url("visor")} />
      <path d="M58 52 Q100 42 142 52" style={{ stroke: v("shell-hi") }} strokeOpacity="0.16" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* eyes: open (blinking) most of the time, happy while waving */}
      <g filter={url("glow")}>
        <g className="ra-eyes-open">
          <g className="robot-blink" style={{ transformOrigin: "100px 72px" }}>
            <rect x="69" y="59" width="18" height="26" rx="9" style={{ fill: v("eye") }} />
            <rect x="113" y="59" width="18" height="26" rx="9" style={{ fill: v("eye") }} />
          </g>
        </g>
        <g className="ra-eyes-happy" opacity={0}>
          <path d="M67 80 Q78 64 89 80" style={{ stroke: v("eye") }} strokeWidth="6.5" strokeLinecap="round" fill="none" />
          <path d="M111 80 Q122 64 133 80" style={{ stroke: v("eye") }} strokeWidth="6.5" strokeLinecap="round" fill="none" />
        </g>
      </g>
    </g>
  );

  if (variant === "head") {
    return (
      <svg
        viewBox="22 0 156 130"
        width={size}
        height={size * (130 / 156)}
        className={cn("robot-ari shrink-0 overflow-visible", className)}
        focusable="false"
        {...a11y}
      >
        {defs}
        {head}
      </svg>
    );
  }

  return (
    <span
      className={cn("robot-ari pointer-events-none inline-block select-none", className)}
      style={{ width: size, height: size * 1.2 }}
      {...a11y}
    >
      <span className="robot-hover block h-full w-full">
        <svg viewBox="0 0 200 240" className="h-full w-full overflow-visible" focusable="false" aria-hidden="true">
          {defs}
          {/* arms, behind the body; the right one waves */}
          <g className="ra-arm-l-up">
            <rect x="57" y="144" width="14" height="38" rx="7" fill={url("shell")} style={{ stroke: v("shell-lo") }} strokeWidth="1" />
            <g className="ra-arm-l-fore">
              <rect x="58" y="176" width="12" height="30" rx="6" fill={url("shell")} style={{ stroke: v("shell-lo") }} strokeWidth="1" />
              <ellipse cx="64" cy="208" rx="8.5" ry="8" fill={url("dark")} />
            </g>
          </g>
          <g className="ra-arm-r-up">
            <rect x="129" y="144" width="14" height="38" rx="7" fill={url("shell")} style={{ stroke: v("shell-lo") }} strokeWidth="1" />
            <g className="ra-arm-r-fore">
              <rect x="130" y="176" width="12" height="30" rx="6" fill={url("shell")} style={{ stroke: v("shell-lo") }} strokeWidth="1" />
              <ellipse cx="136" cy="208" rx="8.5" ry="8" fill={url("dark")} />
            </g>
          </g>
          {/* hover glow */}
          <ellipse className="ra-thruster" cx="100" cy="224" rx="16" ry="4" style={{ fill: v("glow") }} filter={url("soft")} />
          {/* body: a smooth bean */}
          <path d="M100 132 C140 132 147 166 137 191 C129 210 113 216 100 216 C87 216 71 210 63 191 C53 166 60 132 100 132 Z" fill={url("shell")} />
          <path d="M100 132 C140 132 147 166 137 191 C129 210 113 216 100 216 C87 216 71 210 63 191 C53 166 60 132 100 132 Z" fill={url("shade")} />
          <path d="M70 186 Q100 200 130 186" style={{ stroke: v("shell-line") }} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <ellipse cx="84" cy="150" rx="12" ry="7" style={{ fill: v("shell-hi") }} opacity="0.7" transform="rotate(-20 84 150)" />
          <circle cx="100" cy="170" r="3.4" style={{ fill: v("core") }} filter={url("glow")} className="robot-antenna" />
          {/* neck: the head floats just above the body */}
          <ellipse cx="100" cy="130" rx="22" ry="5" fill={url("dark")} />
          {head}
        </svg>
      </span>
      <span className="robot-shadow mx-auto -mt-2 block h-3 w-1/2 rounded-full bg-foreground/20 blur-sm" />
    </span>
  );
}
