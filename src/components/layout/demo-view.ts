// Which side of the product a URL belongs to. The explainer site, the student
// demo and the staff demo share one app but are visibly separate: each gets its
// own header, nav, banner color, welcome pop-up and "Viewing as" roster.

export type DemoView = "landing" | "student" | "staff";

/** Staff-only routes. Everything under them is the staff demo. */
const STAFF_PREFIXES = ["/staff", "/staff-private"] as const;

/** Explainer (marketing) routes: not part of either demo. */
const LANDING_PATHS = ["/", "/about"] as const;

function underPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Classify a pathname into the explainer site, the student demo or the staff demo. */
export function demoViewFor(pathname: string | null | undefined): DemoView {
  const path = (pathname ?? "/").split(/[?#]/)[0] || "/";
  if ((LANDING_PATHS as readonly string[]).includes(path)) return "landing";
  if (STAFF_PREFIXES.some((p) => underPrefix(path, p))) return "staff";
  return "student";
}

/** Entry URLs for each demo (used by the landing page and the view toggles). */
export const DEMO_ENTRY = {
  student: "/campus/mit",
  staff: "/staff",
} as const;
