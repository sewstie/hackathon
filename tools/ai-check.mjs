#!/usr/bin/env node
// ai-check: is the real AI (Claude Opus 5.5) answering, or the keyword fallback?
//
// Sends three sample reports to the running app's /api/classify and prints what
// came back. No key is read or printed here — the app reads ANTHROPIC_API_KEY
// from .env.local on the server. Run `npm run dev` first, then `npm run ai:check`.

const BASE = process.env.APP_URL || "http://localhost:3000";
const SAMPLES = [
  "the printer on the 2nd floor of Hayden Library is jammed",
  "no heat in the whole dorm since last night",
  "I won a million dollars",
];

let aiCount = 0;
for (const text of SAMPLES) {
  let res;
  try {
    res = await fetch(`${BASE}/api/classify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    console.error(`Could not reach ${BASE}. Start the app with: npm run dev`);
    process.exit(1);
  }
  const c = await res.json();
  if (c.source === "ai") aiCount += 1;
  const verdict = c.rejected ? `REJECTED (${c.rejectionReason})` : `${c.category} · ${c.tier}`;
  console.log(`[${c.source}] "${text}" → ${verdict}`);
}

if (aiCount === SAMPLES.length) {
  console.log("\n✓ The AI is on (model from AI_MODEL, default claude-opus-5-5).");
} else {
  console.log(
    "\n✗ The AI is OFF — the keyword fallback answered.\n" +
      "  Add your key (hidden while you paste):  ./ship-keys add ANTHROPIC_API_KEY\n" +
      "  Then restart the app (Ctrl+C, npm run dev) and run: npm run ai:check",
  );
  process.exitCode = 1;
}
