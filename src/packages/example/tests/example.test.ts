import { describe, expect, it } from "vitest";
// Tests exercise the package through its ENTRY POINTS only — never lib/ internals.
import { greet } from "../index";

describe("example package", () => {
  it("greets a named person", () => {
    expect(greet("Ada")).toBe("Hello, Ada!");
  });

  it("falls back for an empty name", () => {
    expect(greet("   ")).toBe("Hello, stranger!");
  });
});
