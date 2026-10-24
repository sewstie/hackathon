// Ticket 06 — names-a-person block, proven through the reporting module's
// PUBLIC INTERFACE only (checkNamesPerson). The guard must:
//   1. block when the AI flagged the text (`namesPerson: true` on the draft);
//   2. block via the pure keyword fallback even with the AI OFF
//      ("Professor Smith", "my roommate", accusation phrasing);
//   3. NOT block ordinary reports that mention no person;
//   4. carry the EXACT block copy (so the UI never restates it);
//   5. persist NOTHING — the check is a pure gate and writes to no store.
// Covers F8-block, case 5.
import { describe, expect, it } from "vitest";

import { InMemoryStore, MIT_CAMPUS_ID } from "@/lib/store";

import {
  checkNamesPerson,
  NAMES_PERSON_BLOCK_MESSAGE,
  type ReportDraft,
} from "../index";

/** A minimal public draft; `text` and `namesPerson` are what the guard reads. */
function draft(text: string, namesPerson = false): ReportDraft {
  return {
    text,
    category: "Facilities",
    item: "issue",
    title: "Reported issue",
    tier: "Medium",
    location: "",
    missingDetails: [],
    namesPerson,
    fromFallback: true,
  };
}

describe("reporting — checkNamesPerson blocks public person-naming reports", () => {
  it("blocks when the AI classifier flagged the text", () => {
    const result = checkNamesPerson(draft("he keeps bothering me", true));
    expect(result.blocked).toBe(true);
    expect(result.message).toBe(NAMES_PERSON_BLOCK_MESSAGE);
  });

  it("blocks via the keyword fallback even with the AI off (namesPerson: false)", () => {
    // AI flag is false (AI unavailable / missed it) — the honorific pattern
    // "Professor Smith" must still trip the block.
    const result = checkNamesPerson(draft("Professor Smith never fixes the lab", false));
    expect(result.blocked).toBe(true);
    expect(result.message).toBe(NAMES_PERSON_BLOCK_MESSAGE);
  });

  it("blocks relationship/accusation phrasing via the fallback", () => {
    expect(checkNamesPerson(draft("my roommate keeps unplugging the fridge")).blocked).toBe(true);
    expect(checkNamesPerson(draft("someone keeps leaving the door propped open")).blocked).toBe(true);
  });

  it("does NOT block an ordinary report that names no person", () => {
    const result = checkNamesPerson(draft("the ice cream machine in Lobdell is broken again"));
    expect(result.blocked).toBe(false);
  });

  it("persists nothing — it is a pure gate with no store access", async () => {
    const store = new InMemoryStore();
    const before = await store.listReports(MIT_CAMPUS_ID);
    const result = checkNamesPerson(draft("Dean Johnson ignored my request", false));
    expect(result.blocked).toBe(true);
    const after = await store.listReports(MIT_CAMPUS_ID);
    // No public row is created — hidden or otherwise.
    expect(after.length).toBe(before.length);
  });
});
