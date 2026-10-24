// Entry point (public). Import the example package only through root files like this one.
// It delegates to a hidden internal file in lib/, so the package is visibly DEEP:
// a small public surface in front of implementation you cannot reach from outside.
import { computeGreeting } from "./lib/impl";

/** Public interface: greet a name. Implementation is hidden in lib/. */
export function greet(name: string): string {
  return computeGreeting(name);
}
