import { expect, it } from "vitest";
import { detectEmergency, detectSafetyHazard } from "@/modules/emergency";
const yes = ["somebody died in the dorm","someone is dead in the hallway","my roommate is not moving","there's a guy with a gun","he got shot","someone was stabbed","somebody got stabbed","someone got stabed","I want to kill myself","there's a fight outside the library","a student was hit by a car","help me please","an intruder broke in","there's blood everywhere","she's having an allergic reaction"];
const no = ["my laptop died","the wifi is dead","emergency exit sign is broken","printer jammed","I got my flu shot and the clinic was closed","the light is dead","smoke detector chirping","handrail is loose"];
it("flags", () => { for (const t of yes) expect(detectEmergency(t).isEmergency, t).toBe(true); });
it("passes", () => { for (const t of no) expect(detectEmergency(t).isEmergency, t).toBe(false); });
it("hazard still", () => { expect(detectSafetyHazard("handrail is loose").isHazard).toBe(true); });
