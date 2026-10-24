#!/usr/bin/env node
// ship-keys: move a project's keys into Vercel and Supabase without anyone seeing them.
//
// Values are read from the project's .env.local (or .env), handed to the official Vercel and
// Supabase command-line tools through a hidden channel (stdin or a private temp file), and never
// printed. Everything this tool prints goes through redact(), which blanks out every known value.
// Run `ship-keys help` for the commands.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';

const HOME_DIR = path.join(os.homedir(), '.ship-keys');
const TOOL_DIR = path.join(HOME_DIR, 'tools');
const TOOL_VERSIONS = { vercel: 'vercel@64.5.0', supabase: 'supabase@2.121.0' };
const CONFIG_FILE = '.ship-keys.json';

// Prefixes that frameworks bake into the browser bundle: these are public by design.
const PUBLIC_PREFIXES = ['VITE_', 'NEXT_PUBLIC_', 'PUBLIC_', 'EXPO_PUBLIC_', 'REACT_APP_', 'NUXT_PUBLIC_', 'GATSBY_'];
// Names the platform or framework sets on its own; never "missing".
const BUILTIN_NAMES = new Set(['NODE_ENV', 'MODE', 'DEV', 'PROD', 'SSR', 'BASE_URL', 'CI', 'PORT', 'HOST', 'TZ', 'PWD', 'HOME', 'PATH', 'K_SERVICE', 'NETLIFY', 'RENDER', 'FLY_APP_NAME', 'RAILWAY_ENVIRONMENT']);
const BUILTIN_PREFIXES = ['VERCEL', 'NEXT_RUNTIME', 'npm_', 'AWS_LAMBDA', 'NOW_', 'TURBO'];
const SCAN_SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.vercel', '.output', 'coverage', 'out', '.turbo', '.svelte-kit', '.claude', '.scratch', 'release']);
const SCAN_EXTS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.mts', '.cts', '.vue', '.svelte', '.astro']);
// Code that never runs on the live site: its settings aren't keys the deploy needs.
const TOOLING_DIRS = new Set(['tools', 'scripts', 'test', 'tests', '__tests__', 'e2e', 'cypress', 'playwright', 'fixtures', 'mocks', '__mocks__']);
const TOOLING_FILE = /\.(test|spec)\.[a-z]+$|(^|\/)[^/]+\.config\.[a-z]+$/;

// ---------- output, always redacted ----------

const secrets = new Set();
function remember(value) { if (value && value.length >= 6) secrets.add(value); }
function redact(text) {
  let out = String(text ?? '');
  for (const v of [...secrets].sort((a, b) => b.length - a.length)) out = out.split(v).join('••••');
  return out;
}
const say = (msg = '') => process.stdout.write(redact(msg) + '\n');
const warn = (msg) => process.stderr.write(redact(msg) + '\n');
function fail(msg) { warn(`\n✗ ${msg}`); process.exit(1); }

// ---------- arguments ----------

const argv = process.argv.slice(2);
const command = argv[0] && !argv[0].startsWith('-') ? argv[0] : 'help';
const positional = argv.slice(1).filter((a) => !a.startsWith('-'));
const flags = {};
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) continue;
  const [k, inline] = a.slice(2).split('=');
  if (inline !== undefined) flags[k] = inline;
  else if (argv[i + 1] && !argv[i + 1].startsWith('-') && ['ref', 'only', 'file', 'env-file', 'project', 'name', 'region', 'org'].includes(k)) flags[k] = argv[++i];
  else flags[k] = true;
}
const projectDir = path.resolve(flags.project ? String(flags.project) : process.cwd());

// ---------- env files ----------

function findEnvFile() {
  if (flags['env-file']) return path.resolve(projectDir, String(flags['env-file']));
  for (const name of ['.env.local', '.env']) {
    const p = path.join(projectDir, name);
    if (fs.existsSync(p)) return p;
  }
  return path.join(projectDir, '.env.local');
}

function parseEnv(text) {
  const out = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (/^".*"$/s.test(v)) v = v.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
    else if (/^'.*'$/s.test(v)) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '').trim();
    out.set(m[1], v);
  }
  return out;
}

function readEnv(file) {
  if (!fs.existsSync(file)) return new Map();
  const env = parseEnv(fs.readFileSync(file, 'utf8'));
  for (const v of env.values()) remember(v);
  return env;
}

function quoteEnvValue(v) {
  return /^[A-Za-z0-9_\-.:/@+=,]*$/.test(v) ? v : `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

function writeEnvValue(file, name, value) {
  remember(value);
  ensureGitIgnored(file);
  const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : [];
  const line = `${name}=${quoteEnvValue(value)}`;
  const idx = lines.findIndex((l) => new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`).test(l));
  if (idx >= 0) lines[idx] = line;
  else {
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    lines.push(line);
  }
  fs.writeFileSync(file, lines.join('\n') + '\n', { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

const isPublicName = (name) => PUBLIC_PREFIXES.some((p) => name.startsWith(p));
const isBuiltin = (name) => BUILTIN_NAMES.has(name) || BUILTIN_PREFIXES.some((p) => name.startsWith(p));

// ---------- git safety ----------

function git(args) {
  return spawnSync('git', args, { cwd: projectDir, encoding: 'utf8' });
}
const inGitRepo = () => git(['rev-parse', '--is-inside-work-tree']).status === 0;

function gitSafety(file) {
  if (!inGitRepo() || !fs.existsSync(file)) return { repo: inGitRepo(), tracked: false, ignored: true, inHistory: false };
  const rel = path.relative(projectDir, file);
  return {
    repo: true,
    tracked: git(['ls-files', '--error-unmatch', rel]).status === 0,
    ignored: git(['check-ignore', '-q', rel]).status === 0,
    inHistory: (git(['log', '--all', '--format=%h', '--', rel]).stdout || '').trim().length > 0,
  };
}

function ensureGitIgnored(file) {
  if (!inGitRepo()) return;
  const rel = path.relative(projectDir, file);
  if (git(['check-ignore', '-q', rel]).status === 0) return;
  const gi = path.join(projectDir, '.gitignore');
  const existing = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
  fs.writeFileSync(gi, existing + (existing && !existing.endsWith('\n') ? '\n' : '') + `\n# keys (added by ship-keys)\n.env\n.env.*\n!.env.example\n`);
  say(`  ✓ Added .env files to .gitignore so they can never be uploaded to GitHub.`);
}

function ensureVercelIgnore() {
  // The Vercel CLI uploads every local file except .vercelignore entries; it does not read .gitignore.
  const vi = path.join(projectDir, '.vercelignore');
  const existing = fs.existsSync(vi) ? fs.readFileSync(vi, 'utf8') : '';
  const lines = existing.split(/\r?\n/).map((l) => l.trim());
  if (lines.includes('.env') && (lines.includes('.env.*') || lines.includes('.env*'))) return;
  fs.writeFileSync(vi, existing + (existing && !existing.endsWith('\n') ? '\n' : '') + `# keys never get uploaded with the code (added by ship-keys)\n.env\n.env.*\n!.env.example\n.ship-keys-tmp*\n`);
  say(`  ✓ Added a .vercelignore so your .env files are never uploaded with the code.`);
}

// ---------- code scan: which keys does the code actually use? ----------

function scanCode() {
  // name -> { file, app: used by the live site, optional: every live-site use has a default }
  const found = new Map();
  const patterns = [
    /process\.env\.([A-Z][A-Z0-9_]*)/g,
    /process\.env\[\s*['"`]([A-Z][A-Z0-9_]*)['"`]\s*\]/g,
    /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g,
    /Deno\.env\.get\(\s*['"`]([A-Z][A-Z0-9_]*)['"`]\s*\)/g,
  ];
  const walk = (dir, depth, tooling) => {
    if (depth > 8) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!e.name.startsWith('.') && !SCAN_SKIP_DIRS.has(e.name)) walk(p, depth + 1, tooling || TOOLING_DIRS.has(e.name));
        continue;
      }
      if (!SCAN_EXTS.has(path.extname(e.name))) continue;
      let text;
      try { if (fs.statSync(p).size > 1_000_000) continue; text = fs.readFileSync(p, 'utf8'); } catch { continue; }
      const rel = path.relative(projectDir, p);
      const app = !tooling && !TOOLING_FILE.test(rel);
      for (const re of patterns) for (const m of text.matchAll(re)) {
        const name = m[1];
        if (isBuiltin(name)) continue;
        const hasDefault = /^\s*(\|\||\?\?)/.test(text.slice(m.index + m[0].length, m.index + m[0].length + 8));
        const entry = found.get(name);
        if (!entry) found.set(name, { file: rel, app, optional: app ? hasDefault : true });
        else if (app) {
          if (!entry.app) { entry.app = true; entry.file = rel; entry.optional = hasDefault; }
          else entry.optional = entry.optional && hasDefault;
        }
      }
    }
  };
  walk(projectDir, 0, false);
  return found;
}

// ---------- the official CLIs ----------

function onPath(bin) { return spawnSync('/bin/sh', ['-c', `command -v ${bin}`], { encoding: 'utf8' }).status === 0; }

function toolBin(name) {
  const override = process.env[`SHIP_KEYS_${name.toUpperCase()}`];
  if (override) return override;
  if (onPath(name)) return name;
  const local = path.join(TOOL_DIR, 'node_modules', '.bin', name);
  if (fs.existsSync(local)) return local;
  say(`  … Downloading the official ${name} tool (one time only, about a minute)…`);
  fs.mkdirSync(TOOL_DIR, { recursive: true });
  if (!fs.existsSync(path.join(TOOL_DIR, 'package.json'))) fs.writeFileSync(path.join(TOOL_DIR, 'package.json'), '{"private":true}\n');
  const r = spawnSync('npm', ['install', TOOL_VERSIONS.vercel, TOOL_VERSIONS.supabase, '--prefix', TOOL_DIR,
    '--cache', path.join(HOME_DIR, 'npm-cache'), '--no-fund', '--no-audit', '--loglevel=error'], { encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(local)) fail(`Couldn't download the ${name} tool.\n${r.stderr || ''}`);
  return local;
}

// Runs a CLI and captures everything. Nothing is printed unless show is true, and then only redacted.
function run(name, args, { input, show = false, interactive = false } = {}) {
  const bin = toolBin(name);
  const env = { ...process.env, VERCEL_TELEMETRY_DISABLED: '1', SUPABASE_TELEMETRY_DISABLED: '1', NO_UPDATE_NOTIFIER: '1' };
  if (interactive) return spawnSync(bin, args, { cwd: projectDir, stdio: 'inherit', env });
  const r = spawnSync(bin, args, { cwd: projectDir, input: input ?? '', encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
  if (show) { if (r.stdout) say(r.stdout.trimEnd()); if (r.stderr && r.status !== 0) warn(r.stderr.trimEnd()); }
  return r;
}

function parseJsonOut(text) {
  const t = String(text || '');
  for (let start = t.search(/[[{]/); start >= 0; ) {
    const end = t.lastIndexOf(t[start] === '[' ? ']' : '}');
    if (end > start) { try { return JSON.parse(t.slice(start, end + 1)); } catch { /* try the next bracket */ } }
    const next = t.slice(start + 1).search(/[[{]/);
    start = next < 0 ? -1 : start + 1 + next;
  }
  return null;
}

// ---------- config (not secret: project ids and choices only) ----------

function readConfig() {
  const p = path.join(projectDir, CONFIG_FILE);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}
function writeConfig(cfg) { fs.writeFileSync(path.join(projectDir, CONFIG_FILE), JSON.stringify(cfg, null, 2) + '\n'); }

// ---------- Vercel ----------

function vercelLinked() {
  try { return JSON.parse(fs.readFileSync(path.join(projectDir, '.vercel', 'project.json'), 'utf8')); } catch { return null; }
}
const vercelLoggedIn = () => run('vercel', ['whoami']).status === 0;

// name -> { targets: Set, readable: bool, sameAsLocal: bool|null }
function vercelRemote(localEnv) {
  const r = run('vercel', ['env', 'ls', '--json', '--non-interactive']);
  if (r.status !== 0) return null;
  const data = parseJsonOut(r.stdout);
  const list = Array.isArray(data) ? data : (data?.envs || data?.env || []);
  const out = new Map();
  for (const e of list) {
    if (!e || !e.key) continue;
    const entry = out.get(e.key) || { targets: new Set(), readable: false, sameAsLocal: null };
    for (const t of [].concat(e.target || [])) entry.targets.add(t);
    const value = typeof e.value === 'string' && e.type !== 'sensitive' && e.type !== 'secret' && e.type !== 'encrypted' ? e.value : null;
    if (value !== null && value !== '') {
      remember(value);
      entry.readable = true;
      if (localEnv.has(e.key)) entry.sameAsLocal = hash(value) === hash(localEnv.get(e.key));
    }
    out.set(e.key, entry);
  }
  return out;
}
const hash = (v) => crypto.createHash('sha256').update(v).digest('hex');

// Public keys go to every environment; private ones are locked (Vercel never shows them again).
const vercelAddArgs = (name) => isPublicName(name)
  ? ['env', 'add', name, 'production,preview,development', '--force', '--no-sensitive', '--yes', '--non-interactive']
  : ['env', 'add', name, 'production,preview', '--force', '--sensitive', '--yes', '--non-interactive'];

// ---------- Supabase ----------

const supabaseLoggedIn = () => run('supabase', ['projects', 'list', '-o', 'json']).status === 0;

function supabaseRef(localEnv) {
  if (flags.ref) return String(flags.ref);
  const cfg = readConfig();
  if (cfg.supabaseRef) return cfg.supabaseRef;
  for (const v of localEnv.values()) {
    const m = String(v).match(/https:\/\/([a-z0-9]{20})\.supabase\.co/);
    if (m) return m[1];
  }
  return null;
}

function supabaseKeys(ref) {
  const r = run('supabase', ['projects', 'api-keys', '--project-ref', ref, '--reveal', '-o', 'json']);
  if (r.status !== 0) fail(`Supabase didn't hand over the keys for project ${ref}.\n${r.stderr || ''}`);
  const data = parseJsonOut(r.stdout);
  const list = Array.isArray(data) ? data : (data?.keys || data?.api_keys || []);
  let pub = null, secret = null;
  for (const k of list) {
    const value = k.api_key || k.key || k.value;
    if (!value) continue;
    remember(value);
    const kind = `${k.type || ''} ${k.name || ''}`.toLowerCase();
    if (/publishable/.test(kind) || value.startsWith('sb_publishable_')) pub = value;
    else if (/\banon\b/.test(kind) && !pub) pub = value;
    else if (/secret/.test(kind) || value.startsWith('sb_secret_')) secret = value;
    else if (/service_role/.test(kind) && !secret) secret = value;
  }
  if (!pub && !secret) fail(`Couldn't read Supabase's answer. Nothing was changed.`);
  return { url: `https://${ref}.supabase.co`, pub, secret };
}

function frameworkPrefix(localEnv) {
  for (const name of localEnv.keys()) for (const p of PUBLIC_PREFIXES) if (name.startsWith(p)) return p;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.next) return 'NEXT_PUBLIC_';
    if (deps.vite) return 'VITE_';
    if (deps.expo) return 'EXPO_PUBLIC_';
    if (deps['react-scripts']) return 'REACT_APP_';
  } catch { /* no package.json */ }
  return 'NEXT_PUBLIC_';
}

// A project name both Vercel and Supabase accept: lowercase letters, digits and dashes.
function projectName() {
  const raw = String(flags.name || path.basename(projectDir));
  return raw.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'app';
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ---------- prompts ----------

async function confirm(question) {
  if (flags.yes) return true;
  if (!process.stdin.isTTY) fail(`This step needs a yes. Run it again with --yes, or run it in a terminal.`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((res) => rl.question(redact(`${question} [y/N] `), res));
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

// Reads a value without showing it on screen.
async function askHidden(question) {
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    return Buffer.concat(chunks).toString('utf8').trim();
  }
  process.stdout.write(question);
  return new Promise((resolve) => {
    let value = '';
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', onData);
          process.stdout.write(`  (${value.length} characters received)\n`);
          return resolve(value.trim());
        }
        if (ch === '\u0003') { process.stdout.write('\n'); process.exit(130); }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    process.stdin.on('data', onData);
  });
}

// ---------- commands ----------

async function cmdCheck() {
  const file = findEnvFile();
  const env = readEnv(file);
  const used = scanCode();
  const safety = gitSafety(file);
  const rel = path.relative(projectDir, file) || file;

  say(`\nship-keys check · ${path.basename(projectDir)}`);
  say(`Keys file: ${fs.existsSync(file) ? rel : `${rel} (doesn't exist yet)`}   (values are never shown)\n`);

  if (safety.tracked) say(`🚨 ${rel} is uploaded to GitHub. Everyone who can see the repo can see your keys.\n   Fix: git rm --cached ${rel}, then make NEW keys in each dashboard (the old ones are exposed).\n`);
  else if (safety.inHistory) say(`⚠️  ${rel} was committed to git in the past. Those old keys may be exposed; replace them.\n`);
  else if (safety.repo && fs.existsSync(file) && !safety.ignored) say(`⚠️  ${rel} isn't in .gitignore yet. ship-keys adds it the first time it writes a key.\n`);

  let remote = null, vercelNote = '';
  if (!flags.offline) {
    if (!vercelLinked()) vercelNote = 'not linked yet (run: ship-keys login)';
    else if (!vercelLoggedIn()) vercelNote = 'not logged in (run: ship-keys login)';
    else { remote = vercelRemote(env); if (!remote) vercelNote = `couldn't read it`; }
  } else vercelNote = 'skipped (--offline)';

  const hiddenTooling = [...used].filter(([n, u]) => !u.app && !env.has(n)).map(([n]) => n);
  const names = [...new Set([...env.keys(), ...[...used].filter(([n, u]) => u.app || flags.all).map(([n]) => n)])].sort();
  if (!names.length) { say('No keys found in the keys file or the code.'); return; }

  const rows = names.map((name) => {
    const u = used.get(name);
    const local = env.has(name) ? (env.get(name) ? '✓ set' : '○ empty') : '✗ missing';
    let vercel = '';
    if (remote) {
      const r = remote.get(name);
      if (!r) vercel = '✗ not there';
      else {
        const t = ['production', 'preview', 'development'].filter((x) => r.targets.has(x)).map((x) => ({ production: 'prod', preview: 'preview', development: 'dev' })[x]).join('+');
        vercel = `✓ ${t}${r.sameAsLocal === false ? ' ⚠ different' : r.sameAsLocal ? ' (same)' : r.readable ? '' : ' (locked)'}`;
      }
    }
    const usedIn = u ? `${u.file}${!u.app ? ' (tests/tools only)' : u.optional ? ' (optional: has a default)' : ''}` : 'not used in code';
    return { name, cells: [name, isPublicName(name) ? 'public' : 'private', local, vercel, usedIn], u, remoteHas: remote ? remote.has(name) : null };
  });
  const head = ['KEY', 'KIND', 'THIS COMPUTER', remote ? 'VERCEL' : `VERCEL: ${vercelNote}`, 'USED IN'];
  const width = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r.cells[i].length)));
  const fmt = (c) => c.map((x, i) => x.padEnd(width[i])).join('  ').trimEnd();
  say(fmt(head));
  for (const r of rows) say(fmt(r.cells));
  if (hiddenTooling.length && !flags.all) say(`\n(${hiddenTooling.length} settings used only by tests/tools are hidden; add --all to see them)`);

  const required = rows.filter((r) => r.u?.app && !r.u.optional);
  const notLocal = required.filter((r) => !env.get(r.name));
  const nowhere = remote ? notLocal.filter((r) => !r.remoteHas) : [];
  const notOnVercel = remote ? rows.filter((r) => env.get(r.name) && !r.remoteHas && r.u?.app).map((r) => r.name) : [];
  say('');
  if (remote) {
    if (nowhere.length) say(`🔴 The live site needs these and they're nowhere yet: ${nowhere.map((r) => r.name).join(', ')}\n  → Supabase ones: ship-keys supabase · others: ship-keys add NAME --vercel-only (you paste, it's hidden)`);
    if (notOnVercel.length) say(`🟡 On this computer but not on Vercel: ${notOnVercel.join(', ')}\n  → ship-keys push`);
    if (!nowhere.length && !notOnVercel.length) say('✓ Everything the live site needs is on Vercel.');
  } else if (notLocal.length) {
    say(`Probably needed by the live site but not on this computer: ${notLocal.map((r) => r.name).join(', ')}\n  They may already be on Vercel. To know for sure: ship-keys login, then ship-keys check`);
  } else say('✓ Every required key is on this computer.');
}

async function cmdAdd() {
  const name = positional[0];
  if (!name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) fail('Usage: ship-keys add KEY_NAME   (then paste the value; it stays hidden)');
  const file = findEnvFile();
  readEnv(file);
  const vercelOnly = Boolean(flags['vercel-only']);
  if (vercelOnly && (!vercelLinked() || !vercelLoggedIn())) fail('Vercel isn\'t logged in or linked here yet. Run: ship-keys login');
  const value = await askHidden(`Paste the value for ${name} and press Enter (it won't show): `);
  if (!value) fail('Nothing was pasted. Nothing changed.');
  remember(value);
  if (vercelOnly) {
    const r = run('vercel', vercelAddArgs(name), { input: value });
    if (r.status !== 0) fail(`Vercel said no: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-2).join(' ')}`);
    return say(`✓ ${name} is on Vercel only (never saved on this computer). Next: ship-keys deploy`);
  }
  writeEnvValue(file, name, value);
  say(`✓ Saved ${name} to ${path.basename(file)}. Next: ship-keys push (sends it to Vercel).`);
}

async function cmdSupabase() {
  const file = findEnvFile();
  const env = readEnv(file);
  if (!supabaseLoggedIn()) fail('Supabase isn\'t logged in on this computer. Run: ship-keys login');
  let ref = supabaseRef(env);
  if (!ref) {
    const r = run('supabase', ['projects', 'list', '-o', 'json']);
    const projects = (parseJsonOut(r.stdout) || []).map((p) => ({ ref: p.ref || p.id, name: p.name }));
    if (projects.length === 1) ref = projects[0].ref;
    else {
      say('Which Supabase project? Run again with --ref and one of these:');
      for (const p of projects) say(`  ship-keys supabase --ref ${p.ref}    (${p.name})`);
      return;
    }
  }
  const keys = supabaseKeys(ref);
  const used = scanCode();
  const prefix = frameworkPrefix(env);
  const pick = (patterns, fallback) => {
    for (const source of [env.keys(), used.keys()]) for (const n of source) if (patterns.some((re) => re.test(n))) return n;
    return fallback;
  };
  const urlName = pick([/SUPABASE_URL$/], `${prefix}SUPABASE_URL`);
  const pubName = pick([/SUPABASE_(ANON|PUBLISHABLE)(_KEY)?$/], `${prefix}SUPABASE_ANON_KEY`);
  const secretName = pick([/SUPABASE_(SERVICE_ROLE|SECRET)(_KEY)?$/], null);

  const plan = [[urlName, keys.url], [pubName, keys.pub]];
  if (keys.secret && (secretName || flags['with-secret'])) plan.push([secretName || 'SUPABASE_SERVICE_ROLE_KEY', keys.secret]);
  for (const [name, value] of plan) if (value) writeEnvValue(file, name, value);

  const cfg = readConfig();
  if (cfg.supabaseRef !== ref) writeConfig({ ...cfg, supabaseRef: ref });
  say(`✓ Supabase project ${ref}: saved ${plan.filter(([, v]) => v).map(([n]) => n).join(', ')} to ${path.basename(file)} (hidden).`);
  if (keys.secret && !secretName && !flags['with-secret']) say(`  (Skipped the Supabase secret key: the code doesn't use one. Add --with-secret if you need it.)`);
  say(`Next: ship-keys push`);
}

async function cmdPush() {
  const file = findEnvFile();
  const env = readEnv(file);
  if (!env.size) fail(`No keys in ${path.basename(file)} yet. Add some with: ship-keys add NAME  or  ship-keys supabase`);
  if (gitSafety(file).tracked) fail(`${path.basename(file)} is uploaded to GitHub. Fix that first (run: ship-keys check).`);

  const cfg = readConfig();
  const only = flags.only ? new Set(String(flags.only).split(',').map((s) => s.trim())) : null;
  const skip = new Set(cfg.skip || []);
  const keys = [...env.entries()].filter(([n, v]) => v && (!only || only.has(n)) && !skip.has(n));
  const empty = [...env.entries()].filter(([, v]) => !v).map(([n]) => n);
  const supaSecrets = new Set((cfg.supabaseSecrets || []).filter((n) => env.get(n)));

  say(`\nship-keys push · ${path.basename(projectDir)}  (values stay hidden)\n`);
  for (const [n] of keys) say(`  ${n.padEnd(34)} → Vercel ${isPublicName(n) ? 'production + preview + development (public)' : 'production + preview (locked secret)'}`);
  for (const n of supaSecrets) say(`  ${n.padEnd(34)} → Supabase function secrets`);
  if (empty.length) say(`  skipped (empty): ${empty.join(', ')}`);
  if (flags['dry-run']) { say('\n(dry run: nothing was sent)'); return; }

  if (!vercelLinked()) fail('This folder isn\'t linked to a Vercel project yet. Run: ship-keys login');
  if (!vercelLoggedIn()) fail('Vercel isn\'t logged in on this computer. Run: ship-keys login');
  if (!(await confirm(`\nSend ${keys.length} key${keys.length === 1 ? '' : 's'} to Vercel project "${vercelLinked().projectName || vercelLinked().projectId}"?`))) return say('Stopped. Nothing was sent.');

  let ok = 0;
  for (const [name, value] of keys) {
    const r = run('vercel', vercelAddArgs(name), { input: value });
    if (r.status === 0) { ok++; say(`  ✓ ${name}`); }
    else warn(`  ✗ ${name}: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-2).join(' ')}`);
  }

  if (supaSecrets.size) {
    const ref = supabaseRef(env);
    if (!ref) warn('  ✗ Supabase function secrets: no project yet (run: ship-keys supabase)');
    else {
      const tmp = path.join(os.tmpdir(), `.ship-keys-tmp-${crypto.randomUUID()}.env`);
      try {
        fs.writeFileSync(tmp, [...supaSecrets].map((n) => `${n}=${quoteEnvValue(env.get(n))}`).join('\n') + '\n', { mode: 0o600 });
        const r = run('supabase', ['secrets', 'set', '--project-ref', ref, '--env-file', tmp]);
        if (r.status === 0) say(`  ✓ Supabase function secrets: ${[...supaSecrets].join(', ')}`);
        else warn(`  ✗ Supabase function secrets: ${(r.stderr || '').trim().split('\n').slice(-2).join(' ')}`);
      } finally { fs.rmSync(tmp, { force: true }); }
    }
  }
  say(`\n${ok}/${keys.length} keys are on Vercel. The live site only picks them up after a new deploy: ship-keys deploy`);
}

async function cmdSchema() {
  const file = path.resolve(projectDir, String(flags.file || positional[0] || 'supabase/schema.sql'));
  if (!fs.existsSync(file)) fail(`No SQL file at ${path.relative(projectDir, file)}. Pass one: ship-keys schema path/to/file.sql`);
  const env = readEnv(findEnvFile());
  const ref = supabaseRef(env);
  if (!ref) fail('No Supabase project yet. Run: ship-keys supabase');
  if (!supabaseLoggedIn()) fail('Supabase isn\'t logged in on this computer. Run: ship-keys login');
  if (!(await confirm(`Run ${path.relative(projectDir, file)} on Supabase project ${ref}? This changes the real database.`))) return say('Stopped. Nothing ran.');
  const r = run('supabase', ['db', 'query', '--project-ref', ref, '-f', file], { show: true });
  if (r.status !== 0) fail('The database said no (see above). Nothing else was changed.');
  say(`✓ Ran ${path.basename(file)} on ${ref}.`);
}

async function cmdDeploy() {
  if (!vercelLinked()) fail('This folder isn\'t linked to a Vercel project yet. Run: ship-keys login');
  if (!vercelLoggedIn()) fail('Vercel isn\'t logged in on this computer. Run: ship-keys login');
  readEnv(findEnvFile());
  ensureVercelIgnore();
  if (!(await confirm(`Put the current code live on Vercel (production)?`))) return say('Stopped. Nothing was deployed.');
  say('  … Building on Vercel (usually 1–3 minutes)…');
  const r = run('vercel', ['deploy', '--prod', '--yes', '--non-interactive']);
  const url = (r.stdout.match(/https:\/\/[^\s]+\.vercel\.app/g) || []).pop();
  if (r.status !== 0) { warn(r.stderr.trim().split('\n').slice(-6).join('\n')); fail('The deploy failed (see above).'); }
  say(`✓ Live: ${url || '(see the Vercel dashboard)'}`);
  const ref = supabaseRef(readEnv(findEnvFile()));
  if (ref && url) say(`  If sign-in breaks on the live site, add it in Supabase → Auth → URL Configuration:\n  https://supabase.com/dashboard/project/${ref}/auth/url-configuration`);
}

async function cmdSetup() {
  for (const name of ['vercel', 'supabase']) {
    const r = run(name, ['--version']);
    const version = (r.stdout || r.stderr || '').match(/\d+\.\d+\.\d+/);
    say(r.status === 0 ? `✓ ${name} ${version ? version[0] : ''} ready` : `✗ ${name} didn't start`);
  }
}

async function cmdLogin() {
  await cmdSetup();
  say('This opens your browser to log in. You click "Allow" there; no password goes through here.\n');
  if (!flags['supabase-only']) {
    if (!vercelLoggedIn()) { say('→ Vercel'); run('vercel', ['login'], { interactive: true }); }
    else say('✓ Vercel already logged in');
    if (vercelLinked()) say(`✓ Linked to Vercel project "${vercelLinked().projectName || vercelLinked().projectId}"`);
  }
  if (!flags['vercel-only']) {
    if (!supabaseLoggedIn()) { say('\n→ Supabase'); run('supabase', ['login'], { interactive: true }); }
    else say('✓ Supabase already logged in');
  }
  say(`\nDone. Next: ship-keys create   (makes the Vercel + Supabase projects, or links ones that already exist)`);
}

async function createVercel(name) {
  if (vercelLinked()) return say(`✓ Vercel: this folder is already linked to "${vercelLinked().projectName || vercelLinked().projectId}"`);
  if (!vercelLoggedIn()) fail('Vercel isn\'t logged in on this computer. Run: ship-keys login');
  const exists = run('vercel', ['project', 'inspect', name, '--non-interactive']).status === 0;
  if (exists && !(await confirm(`A Vercel project called "${name}" already exists. Link this folder to it?`)))
    return say(`  Skipped Vercel. Pick another name with: ship-keys create --name <new-name>`);
  say(exists ? `→ Vercel: linking to "${name}"…` : `→ Vercel: creating project "${name}"…`);
  // vercel link --yes links the project with this name, or creates it with the framework auto-detected.
  const r = run('vercel', ['link', '--yes', '--project', name, '--non-interactive']);
  if (r.status !== 0 || !vercelLinked()) fail(`Vercel couldn't ${exists ? 'link' : 'create'} the project: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' ')}`);
  say(`✓ Vercel project "${vercelLinked().projectName || name}" ${exists ? 'linked' : 'created and linked'}.`);
}

async function createSupabase(name) {
  const file = findEnvFile();
  const env = readEnv(file);
  if (!supabaseLoggedIn()) fail('Supabase isn\'t logged in on this computer. Run: ship-keys login');
  const existingRef = supabaseRef(env);
  if (existingRef) return say(`✓ Supabase: already using project ${existingRef}`);

  const projects = (parseJsonOut(run('supabase', ['projects', 'list', '-o', 'json']).stdout) || []).map((p) => ({ ref: p.ref || p.id, name: p.name }));
  const same = projects.find((p) => p.name === name);
  let ref;
  if (same && await confirm(`A Supabase project called "${name}" already exists (${same.ref}). Use it?`)) ref = same.ref;
  else {
    if (same) fail(`Pick another name with: ship-keys create --name <new-name>`);
    let orgs = (parseJsonOut(run('supabase', ['orgs', 'list', '-o', 'json']).stdout) || []).map((o) => ({ id: o.id || o.slug, name: o.name }));
    let org = flags.org ? String(flags.org) : orgs.length === 1 ? orgs[0].id : null;
    if (!orgs.length && !flags.org) {
      say(`→ Supabase: your account has no organization yet, creating "${name}"…`);
      const r = run('supabase', ['orgs', 'create', name, '-o', 'json']);
      const made = parseJsonOut(r.stdout);
      orgs = (parseJsonOut(run('supabase', ['orgs', 'list', '-o', 'json']).stdout) || []).map((o) => ({ id: o.id || o.slug, name: o.name }));
      org = made?.id || made?.slug || (orgs.length === 1 ? orgs[0].id : null);
      if (r.status !== 0 || !org) fail(`Supabase couldn't create the organization: ${(r.stderr || '').trim().split('\n').slice(-2).join(' ')}`);
    }
    if (!org) {
      say('Which Supabase organization should the project go in? Run again with --org and one of these:');
      for (const o of orgs) say(`  ship-keys create --org ${o.id}    (${o.name})`);
      return;
    }
    const region = String(flags.region || 'us-east-1');
    if (!(await confirm(`Create Supabase project "${name}" in ${region}? (free plan: up to 2 active projects)`))) return say('Stopped. Nothing was created on Supabase.');

    // The database password is made here and saved to the keys file; it's never shown or sent to Vercel.
    const password = crypto.randomBytes(18).toString('base64url');
    remember(password);
    writeEnvValue(file, 'SUPABASE_DB_PASSWORD', password);
    const cfg = readConfig();
    writeConfig({ ...cfg, skip: [...new Set([...(cfg.skip || []), 'SUPABASE_DB_PASSWORD'])] });

    say(`→ Supabase: creating project "${name}"…`);
    const r = run('supabase', ['projects', 'create', name, '--org-id', org, '--db-password', password, '--region', region, '-o', 'json']);
    const made = parseJsonOut(r.stdout);
    ref = made?.ref || made?.id || (String(r.stdout).match(/\b[a-z]{20}\b/) || [])[0];
    if (r.status !== 0 || !ref) fail(`Supabase couldn't create the project: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' ')}`);
    say(`✓ Supabase project created: ${ref} (database password saved to ${path.basename(file)} as SUPABASE_DB_PASSWORD, hidden).`);
  }
  writeConfig({ ...readConfig(), supabaseRef: ref });

  // A new project takes a minute or two to start; its keys only exist once it's up.
  say('  … Waiting for the Supabase project to start (usually 1–2 minutes)…');
  for (let i = 0; i < 30; i++) {
    if (run('supabase', ['projects', 'api-keys', '--project-ref', ref, '-o', 'json']).status === 0) return cmdSupabase();
    await sleep(Number(process.env.SHIP_KEYS_POLL_MS || 10000));
  }
  say(`  Supabase is still starting. In a few minutes run: ship-keys supabase`);
}

async function cmdCreate() {
  const name = projectName();
  say(`\nship-keys create · ${name}\n`);
  if (!flags['supabase-only']) await createVercel(name);
  if (!flags['vercel-only']) await createSupabase(name);
  say(`\nNext: ship-keys check`);
}

async function cmdGo() {
  if (!vercelLinked()) await createVercel(projectName());
  const env = readEnv(findEnvFile());
  const used = scanCode();
  const needsSupabase = [...used.keys(), ...env.keys()].some((n) => /SUPABASE/.test(n));
  if (needsSupabase && supabaseLoggedIn()) {
    if (supabaseRef(env)) await cmdSupabase();
    else await createSupabase(projectName());
  }
  const now = readEnv(findEnvFile());
  const missing = [...used].filter(([n, u]) => u.app && !u.optional && !now.get(n)).map(([n]) => n);
  if (missing.length) say(`\n⚠️  Still missing (the site may not fully work): ${missing.join(', ')}\n   Add each with: ship-keys add NAME`);
  await cmdPush();
  await cmdDeploy();
}

function cmdHelp() {
  say(`ship-keys: move your keys into Vercel and Supabase without anyone seeing them.

  ship-keys setup            Download the official Vercel + Supabase tools (automatic, one time)
  ship-keys check            Which keys the code needs, and where each one is (names only)
  ship-keys login            One-time browser login to Vercel + Supabase
  ship-keys create           Make this app's Vercel project + Supabase project (or link existing ones)
                             --name <name> (default: folder name) · --region us-east-1 · --org <id>
  ship-keys add NAME         Paste a key from a dashboard (hidden) into .env.local
                             --vercel-only: straight to Vercel, never saved on this computer
  ship-keys supabase         Fetch this project's Supabase URL + keys into .env.local (hidden)
  ship-keys push             Send every key in .env.local to Vercel (and Supabase secrets)
  ship-keys schema [file]    Run supabase/schema.sql on the real Supabase database
  ship-keys deploy           Put the site live on Vercel
  ship-keys go               create Vercel project if needed → supabase → push → deploy

  Options: --dry-run (show the plan, send nothing) · --yes (no questions) · --only A,B · --all
           --ref <supabase-project-ref> · --env-file <file> · --project <folder> · --offline
  Settings (not secret) live in .ship-keys.json: "supabaseRef", "supabaseSecrets": [...], "skip": [...]`);
}

const commands = { setup: cmdSetup, create: cmdCreate, check: cmdCheck, add: cmdAdd, supabase: cmdSupabase, push: cmdPush, schema: cmdSchema, deploy: cmdDeploy, login: cmdLogin, go: cmdGo, help: cmdHelp };
if (!commands[command]) { cmdHelp(); process.exit(1); }
await commands[command]();
