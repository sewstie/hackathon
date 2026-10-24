import { describe, expect, it } from "vitest";
import { demoViewFor } from "./demo-view";

describe("demoViewFor", () => {
  it("treats the explainer pages as the landing site, not the demo", () => {
    expect(demoViewFor("/")).toBe("landing");
    expect(demoViewFor("/about")).toBe("landing");
    expect(demoViewFor(null)).toBe("landing");
  });

  it("puts staff routes in the staff demo", () => {
    expect(demoViewFor("/staff")).toBe("staff");
    expect(demoViewFor("/staff-private")).toBe("staff");
    expect(demoViewFor("/staff?tab=private")).toBe("staff");
  });

  it("puts every other page in the student demo", () => {
    expect(demoViewFor("/campus/mit")).toBe("student");
    expect(demoViewFor("/report")).toBe("student");
    expect(demoViewFor("/my-reports")).toBe("student");
    expect(demoViewFor("/private/thread/abc")).toBe("student");
    // A look-alike prefix is not a staff route.
    expect(demoViewFor("/staffing")).toBe("student");
  });
});
