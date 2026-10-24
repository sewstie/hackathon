// Records the UniFix walkthrough video with headless Chrome (CDP screencast)
// and writes a caption timeline used to build the narration script.
// Usage: APP_URL=http://localhost:3100 node tools/record-demo.mjs <outDir>
// Run it against an IN-MEMORY dev server (no Supabase keys) so the recording
// never writes to the live database. Frames + timeline land in <outDir>.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.APP_URL || "http://localhost:3000";
const OUT = process.argv[2];
fs.mkdirSync(path.join(OUT, "frames"), { recursive: true });
const C = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = 1440, H = 900;
const chrome = spawn(C, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
  "--remote-debugging-port=9340", `--user-data-dir=${path.join(OUT, "profile")}`,
  `--window-size=${W},${H}`, "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(2500);
const tabs = await (await fetch("http://127.0.0.1:9340/json")).json();
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const frames = [];
ws.onmessage = async (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result); pending.delete(d.id); return; }
  if (d.method === "Page.screencastFrame") {
    const { data, metadata, sessionId } = d.params;
    const n = frames.length;
    const file = path.join(OUT, "frames", `f${String(n).padStart(6, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, t: metadata.timestamp });
    ws.send(JSON.stringify({ id: ++id, method: "Page.screencastFrameAck", params: { sessionId } }));
  }
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.value;

// Captions + title cards live in the page; re-installed on every navigation.
const OVERLAY = `
(() => {
  const css = document.createElement('style');
  css.textContent = 'nextjs-portal{display:none!important}' +
    '#rec-cap{position:fixed;left:50%;bottom:34px;transform:translateX(-50%);z-index:2147483646;max-width:1000px;padding:14px 26px;border-radius:999px;background:rgba(17,17,24,.86);color:#fff;font:600 22px/1.3 Manrope,system-ui,sans-serif;text-align:center;box-shadow:0 20px 60px -20px rgba(0,0,0,.6);transition:opacity .35s;opacity:0;pointer-events:none}' +
    '#rec-card{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:60px;background:radial-gradient(60% 70% at 80% 0%,rgba(67,56,202,.55),transparent 70%),radial-gradient(50% 60% at 0% 100%,rgba(103,232,249,.35),transparent 70%),#0e0f17;color:#fff;font-family:Manrope,system-ui,sans-serif;transition:opacity .5s;opacity:0;pointer-events:none}' +
    '#rec-card h1{font-size:64px;line-height:1.05;font-weight:800;letter-spacing:-.03em;margin:0;max-width:1100px}' +
    '#rec-card p{font-size:26px;opacity:.85;margin:0;max-width:1000px}' +
    '#rec-card .pill{font-size:16px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:8px 18px;border:1px solid rgba(255,255,255,.35);border-radius:999px;opacity:.9}';
  const add = () => { if (!document.head) return setTimeout(add, 20); document.head.appendChild(css);
    const cap = document.createElement('div'); cap.id = 'rec-cap'; document.body.appendChild(cap);
    const card = document.createElement('div'); card.id = 'rec-card'; document.body.appendChild(card); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
  window.__cap = (t) => { const c = document.getElementById('rec-cap'); if (!c) return; if (!t) { c.style.opacity = 0; return; } c.textContent = t; c.style.opacity = 1; };
  window.__card = (html) => { const c = document.getElementById('rec-card'); if (!c) return; if (!html) { c.style.opacity = 0; return; } c.innerHTML = html; c.style.opacity = 1; };
})();`;

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send("Page.addScriptToEvaluateOnNewDocument", { source: OVERLAY });

const t0 = { v: 0 };
const timeline = [];
const now = () => (Date.now() - t0.v) / 1000;
async function cap(text) {
  await ev(`window.__cap && window.__cap(${JSON.stringify(text)})`);
  if (text) timeline.push({ at: now(), kind: "caption", text });
}
async function card(html, label) {
  await ev(`window.__card && window.__card(${JSON.stringify(html)})`);
  if (html) timeline.push({ at: now(), kind: "card", text: label });
}
async function waitFor(js, ms = 12000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await ev(js)) return true; await sleep(150); }
  console.error("timeout waiting for", js); return false;
}
const byText = (sel, re) => `[...document.querySelectorAll(${JSON.stringify(sel)})].find(e => ${re}.test(e.textContent) && e.getBoundingClientRect().width > 0)`;
async function clickEl(js) {
  const box = await ev(`(() => { const e = ${js}; if (!e) return null; e.scrollIntoView({block:'center'}); const r = e.getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2}; })()`);
  if (!box) { console.error("no element", js); return false; }
  await sleep(350);
  const b2 = await ev(`(() => { const e = ${js}; const r = e.getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2}; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: b2.x, y: b2.y });
  await sleep(150);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: b2.x, y: b2.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: b2.x, y: b2.y, button: "left", clickCount: 1 });
  return true;
}
async function type(selector, text, cps = 22) {
  await ev(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); e.scrollIntoView({block:'center'}); e.focus(); })()`);
  for (const ch of text) { await send("Input.insertText", { text: ch }); await sleep(1000 / cps); }
}
async function clearField(selector) {
  await ev(`(() => { const t = document.querySelector(${JSON.stringify(selector)}); const s = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; s.call(t, ''); t.dispatchEvent(new Event('input', {bubbles:true})); })()`);
}
async function smoothScroll(y, ms = 1600) {
  await ev(`(async () => { const s = scrollY, d = ${y} - s, n = ${Math.round(ms / 16)}; for (let i = 1; i <= n; i++) { scrollTo(0, s + d * (1 - Math.cos(Math.PI * i / n)) / 2); await new Promise(r => setTimeout(r, 16)); } })()`);
}
async function go(url) { await send("Page.navigate", { url: BASE + url }); await sleep(800); await waitFor(`document.readyState === 'complete'`); await sleep(1200); }

// Warm up the routes so the recording isn't waiting on dev compiles.
for (const u of ["/", "/campus/mit", "/report", "/staff", "/report-detail?id=rep-wifi"]) { await go(u); }

await go("/");
await send("Page.startScreencast", { format: "jpeg", quality: 82, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
t0.v = Date.now();

// ── 1. Title ───────────────────────────────────────────────────────────────
await card(`<span class="pill">Hackachusetts 2026 · Civic Action · Challenge V4</span><h1>UniFix</h1><p>Report what's broken on campus — and watch it get fixed.</p>`, "Title");
await sleep(6000);
await card("");
await sleep(600);
await cap("Students hit broken things every day — reporting them shouldn't be a maze.");
await sleep(4500);
await smoothScroll(900, 2200);
await sleep(1800);
await cap("UniFix: one place to report, in plain words, routed to the team that fixes it.");
await smoothScroll(1800, 2200);
await sleep(2200);
await cap("");

// ── 2. Student view ────────────────────────────────────────────────────────
await go("/campus/mit");
await waitFor(`/You're in the student view/.test(document.body.innerText)`);
await cap("Judges land in the student view — a quick pop-up explains where they are.");
await sleep(4500);
await clickEl(byText("button", /Keep exploring/));
await sleep(900);
await cap("A live campus feed: what's open, what's urgent, what's fixed.");
await sleep(3500);
await ev(`document.querySelector('#map').scrollIntoView({block:'center'})`);
await sleep(1200);
await cap("The map shows where problems cluster, colored by severity.");
await sleep(2500);
const marker = `[...document.querySelectorAll('.leaflet-marker-icon')].filter(e=>{const r=e.getBoundingClientRect();return r.y>80&&r.y<820}).sort((a,b)=>(+b.textContent)-(+a.textContent))[0]`;
await clickEl(marker);
await sleep(700);
await cap("Click a bubble to see every report inside it.");
await sleep(4200);
await cap("");

// ── 3. Junk and emergencies (before any AI) ────────────────────────────────
await clickEl(`document.querySelector('nav a[href="/report"]')`);
await waitFor(`!!document.querySelector('#report-text')`);
await sleep(600);
await cap("Junk stays out: spam, jokes and prize claims are rejected.");
await type("#report-text", "I won a million dollars");
await sleep(400);
await clickEl(`document.querySelector('[data-tour=report-submit]')`);
await waitFor(`!!document.querySelector('[role=alert]')`);
await sleep(3600);
await clearField("#report-text");
await sleep(300);
await cap("Safety beats everything. Ari reads as you type…");
await type("#report-text", "somebody collapsed in the hallway and isn't moving", 20);
await waitFor(`/This may be an emergency/.test(document.body.innerText)`);
await cap("…and shows Call 911 and Campus Police instantly — before any AI runs.");
await sleep(5200);
await cap("");

// ── 4. A real report, end to end ───────────────────────────────────────────
await go("/report");
await waitFor(`/You're in the student view/.test(document.body.innerText)`);
await clickEl(byText("button", /Keep exploring/));
await sleep(500);
await cap("A real report: just say what's wrong.");
await type("#report-text", "my wifi is not working in the library", 18);
await sleep(500);
await clickEl(`document.querySelector('[data-tour=report-submit]')`);
await waitFor(`/No specific place/.test(document.body.innerText)`);
await cap("AI picks the team and severity, then asks only what's missing.");
await sleep(3200);
await cap("Wi-Fi isn't in one spot — so: No specific place.");
await sleep(1500);
await clickEl(byText("button", /No specific place/));
await waitFor(`/Still broken/.test(document.body.innerText)`);
await cap("Ari checks the past: 9 similar reports, usually fixed in ~3 days — plus quick fixes.");
await sleep(5500);
await clickEl(byText("button", /Still broken/));
await waitFor(`/Skip for now/.test(document.body.innerText)`);
await cap("Add a photo if you like…");
await sleep(1800);
await clickEl(byText("button", /Skip for now/));
await waitFor(`!!document.querySelector('[data-tour=post]')`);
await cap("…check the card, and post.");
await sleep(2600);
await clickEl(`document.querySelector('[data-tour=post]')`);
await waitFor(`/Your report is in/.test(document.body.innerText)`);
await cap("Rated Medium, sent to the IT team — and only IT staff see it.");
await sleep(4500);
await cap("");

// ── 5. Staff side ──────────────────────────────────────────────────────────
await clickEl(byText("a", /See it in the IT staff queue/));
await waitFor(`/You're in the staff view/.test(document.body.innerText)`);
await cap("The staff view: each team sees only its own area, ranked by severity × reach.");
await sleep(4200);
await clickEl(byText("button", /^Got it$/));
await sleep(1200);
await smoothScroll(0, 600);
await sleep(1800);
await clickEl(byText("button", /My wifi is not working in the library/));
await waitFor(`!!document.querySelector('#conversation')`);
await sleep(800);
await cap("Staff can ask the reporter a question directly…");
await clickEl(byText("button[role=tab]", /Message the reporter/));
await sleep(500);
await type("#conversation textarea", "Thanks! Which building were you in when it dropped?", 24);
await sleep(300);
await clickEl(byText("#conversation button", /Send message/));
await sleep(1600);
await cap("…post public updates, and mark it solved — everyone is notified.");
await clickEl(byText("button", /Mark solved/));
await sleep(3000);
await cap("");

// ── 6. Back to the student: notification → chat ────────────────────────────
await clickEl(byText("header a", /Switch to student view/));
await waitFor(`/You're in the student view/.test(document.body.innerText)`);
await sleep(800);
await clickEl(byText("button", /Keep exploring/));
await sleep(800);
await cap("The student gets notified — one click opens the conversation.");
await clickEl(`document.querySelector('button[aria-label^="Notifications"]')`);
await sleep(1800);
await clickEl(byText("[role=menu] a", /sent you a message/));
await waitFor(`!!document.querySelector('#conversation textarea')`);
await sleep(1500);
await type("#conversation textarea", "Hayden Library, 2nd floor, near the stairs.", 24);
await sleep(300);
await clickEl(byText("#conversation button", /Send message/));
await sleep(2200);
await cap("A misunderstanding becomes a two-minute chat, not a lost ticket.");
await sleep(3500);
await cap("");

// ── 7. Outro ───────────────────────────────────────────────────────────────
await card(`<span class="pill">Built with Kiro</span><h1>Specs · Steering · Hooks · Skills · Crew</h1><p>300+ tests, including property-based safety tests. Works for any Massachusetts campus.</p>`, "Built with Kiro");
await sleep(6500);
await card(`<span class="pill">Try it — no login</span><h1>UniFix</h1><p>hackathon-pi-ebon.vercel.app/campus/mit</p>`, "Outro");
await sleep(5500);

await send("Page.stopScreencast");
await sleep(500);
fs.writeFileSync(path.join(OUT, "frames.json"), JSON.stringify(frames.map((f) => ({ file: f.file, t: f.t }))));
fs.writeFileSync(path.join(OUT, "timeline.json"), JSON.stringify({ duration: now(), firstFrameT: frames[0]?.t, startWall: t0.v, timeline }, null, 2));
console.log("frames:", frames.length, "duration:", now().toFixed(1));
ws.close();
chrome.kill();
