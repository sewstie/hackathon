// Internal: the single Zod schema the AI call is validated against.
//
// One schema returns the whole classification at once (spec: "one server-side
// generateObject call against a single Zod schema"). It is intentionally
// permissive on strings (item/title are free text) and strict on the closed
// enums (category/tier/office) so the model cannot invent a value the rest of
// the app does not understand.
import { z } from "zod";

import { CATEGORIES, OFFICES, TIERS } from "@/types";

export const classificationSchema = z.object({
  /** The report's category; one of the closed Category set. */
  category: z.enum(CATEGORIES),
  /** The specific broken thing, e.g. "ice cream machine". Lowercased, short. */
  item: z.string(),
  /** A neutral, human-readable title for staff queues. */
  title: z.string(),
  /** Severity tier; one of the closed Tier set. */
  tier: z.enum(TIERS),
  /** Details still missing (e.g. "location", "floor"), to drive follow-ups. */
  missingDetails: z.array(z.string()),
  /** True when the text names or clearly identifies a specific person. */
  namesPerson: z.boolean(),
  /** True when the text is spam / abuse / off-topic and should be rejected. */
  rejected: z.boolean(),
  /** Friendly reason shown to the student when rejected; null otherwise. */
  rejectionReason: z.string().nullable(),
  /** Private-mode only: which office should receive this; null in public mode. */
  suggestedOffice: z.enum(OFFICES).nullable(),
});

export type ClassificationObject = z.infer<typeof classificationSchema>;
