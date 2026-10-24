// Internal implementation, hidden in a subfolder. Reachable from the package's
// own root files (index.ts) but NOT from outside the package.
export function computeGreeting(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? `Hello, ${trimmed}!` : "Hello, stranger!";
}
