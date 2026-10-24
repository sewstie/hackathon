// Internal: the public-team a category routes to, and the confirmation copy.
//
// Public reports land in a team's queue. The category-to-team mapping is the
// trivial 1:1 for the six real teams; "City" is an off-campus hand-off that is
// never a public report here (ticket 10 owns that card), so it falls back to
// Facilities defensively. Confirmation copy comes straight from the brief.
import type { Category, PublicTeam } from "@/types";

const CATEGORY_TEAM: Record<Category, PublicTeam> = {
  Facilities: "Facilities",
  Dining: "Dining",
  Housing: "Housing",
  IT: "IT",
  Grounds: "Grounds",
  Safety: "Safety",
  City: "Facilities",
};

/** Which staff team a report in `category` is sent to. */
export function teamForCategory(category: Category): PublicTeam {
  return CATEGORY_TEAM[category];
}

/** The exact post-filing confirmation line from the brief. */
export function confirmationFor(category: Category): string {
  return `Sent to ${teamForCategory(category)}. We'll let you know when it changes.`;
}
