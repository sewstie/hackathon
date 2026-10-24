// The keyword fallback (AI off) must pick the right team and a sensible tier.
import { describe, expect, it } from "vitest";
import { classify } from "@/modules/ai";

const noModel = { model: undefined };
async function run(text: string) {
  const prev = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    return await classify({ text }, noModel);
  } finally {
    if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
  }
}

describe("keyword fallback — category", () => {
  const cases: Array<[string, string]> = [
    ["the printer on the 2nd floor of Hayden Library is jammed", "IT"],
    ["wifi keeps dropping in the library", "IT"],
    ["the ice cream machine in the dining hall is broken again", "Dining"],
    ["vending machine ate my money", "Dining"],
    ["heater in my dorm room doesn't work", "Housing"],
    ["no heat in the whole dorm", "Housing"],
    ["wifi is down in my dorm", "IT"],
    ["there are mice in our dorm kitchen", "Housing"],
    ["the washing machine in the basement is leaking", "Housing"],
    ["trash is overflowing on the quad", "Grounds"],
    ["the walkway wasn't plowed after the snow", "Grounds"],
    ["the elevator in building 10 is out", "Facilities"],
    ["ceiling tile is leaking water in the lecture hall", "Facilities"],
    ["the railing on the stairs is loose", "Safety"],
    ["there's a pothole on mass ave", "City"],
  ];
  for (const [text, team] of cases) {
    it(`${text} → ${team}`, async () => {
      expect((await run(text)).category).toBe(team);
    });
  }
});

describe("keyword fallback — severity", () => {
  it("Urgent for an emergency", async () => {
    expect((await run("somebody got stabbed outside the dorm")).tier).toBe("Urgent");
  });
  it("High for no heat / flooding / hazards", async () => {
    expect((await run("no heat in the whole dorm")).tier).toBe("High");
    expect((await run("the bathroom is flooding")).tier).toBe("High");
    expect((await run("exposed wiring in the hallway")).tier).toBe("High");
  });
  it("Low for cosmetic issues", async () => {
    expect((await run("there's graffiti on the bench")).tier).toBe("Low");
    expect((await run("the chair is a bit squeaky")).tier).toBe("Low");
  });
  it("Medium otherwise", async () => {
    expect((await run("the printer is jammed")).tier).toBe("Medium");
  });
});

describe("keyword fallback — not a report", () => {
  const junk = [
    "I won a million dollars", "you won a free iphone, click the link", "hello", "test", "asdfghjkl",
    "lol", "i love pizza", "who wants to party tonight", "buy my textbooks cheap", "aaaaaaaa",
    "what is the meaning of life",
  ];
  for (const text of junk) {
    it(`rejects: ${text}`, async () => {
      const r = await run(text);
      expect(r.rejected).toBe(true);
      expect(r.rejectionReason).toBeTruthy();
    });
  }
  const real = [
    "the printer is jammed", "vending machine ate my money", "wifi keeps dropping", "toilet is clogged on 3F",
    "somebody got stabbed", "there's no hot water", "the light in room 4-270 is out",
  ];
  for (const text of real) {
    it(`keeps: ${text}`, async () => {
      expect((await run(text)).rejected).toBe(false);
    });
  }
});
