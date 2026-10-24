import { expect, it } from "vitest";
import { detectEmergency, detectSafetyHazard } from "@/modules/emergency";
const yes = ["somebody died in the dorm","someone is dead in the hallway","my roommate is not moving","there's a guy with a gun","he got shot","someone was stabbed","somebody got stabbed","someone got stabed","I want to kill myself","there's a fight outside the library","a student was hit by a car","help me please","an intruder broke in","there's blood everywhere","she's having an allergic reaction"];
const no = ["my laptop died","the wifi is dead","emergency exit sign is broken","printer jammed","I got my flu shot and the clinic was closed","the light is dead","smoke detector chirping","handrail is loose"];
it("flags", () => { for (const t of yes) expect(detectEmergency(t).isEmergency, t).toBe(true); });
it("passes", () => { for (const t of no) expect(detectEmergency(t).isEmergency, t).toBe(false); });
it("hazard still", () => { expect(detectSafetyHazard("handrail is loose").isHazard).toBe(true); });

const moreYes = [
  "my friend fainted in the library", "he's having chest pain", "someone has alcohol poisoning", "I think my drink was spiked",
  "two people are trapped in the elevator", "it smells like gas in the hallway", "there's a power line down on the path",
  "someone is stalking me", "a man is following me", "there's a bomb threat", "my roommate has been missing since friday",
  "a car crash outside the dorm", "she hit her head and is bleeding", "he had a seizure", "someone collapsed", "fell off the balcony",
];
const moreNo = ["the elevator is broken", "smoke detector chirping", "my phone died", "the lab smells weird", "printer is jammed"];
it("flags more emergencies", () => { for (const t of moreYes) expect(detectEmergency(t).isEmergency, t).toBe(true); });
it("still passes ordinary reports", () => { for (const t of moreNo) expect(detectEmergency(t).isEmergency, t).toBe(false); });
