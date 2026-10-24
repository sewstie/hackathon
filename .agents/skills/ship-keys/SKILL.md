---
name: ship-keys
description: Put the app live with its keys — move API keys and Supabase values from .env.local into Vercel (and Supabase function secrets), run the Supabase schema, and deploy, without the values ever being shown. Use when the user wants to deploy, ship, publish, go live, "set up the env vars", "connect Supabase and Vercel", fill in keys, or asks what keys the project is missing.
---

# ship-keys

`./ship-keys` (repo root; the code is `tools/ship-keys.mjs`, plain Node 20+, nothing to install) moves the app's keys into Vercel and Supabase through the official Vercel and Supabase CLIs. Values go through stdin or a private temp file (deleted right after) and every line it prints is redacted, so neither the screen nor this chat ever holds a key. The CLIs download themselves once into `~/.ship-keys/tools` (pinned `vercel@64.5.0`, `supabase@2.121.0`).

## Hard rules for the agent

- **Never read key values.** Don't `cat`, `grep`, `head` or open `.env`, `.env.local` or any `.env.*` file (except `.env.example`), and never run `vercel env ls --json` or `vercel env pull` yourself. Use `./ship-keys check`: it shows names and status only.
- **Never ask the user to paste a key into chat.** Keys go in with `./ship-keys add NAME` (hidden paste in the terminal).
- **You may run yourself:** `./ship-keys check`, `./ship-keys check --offline`, `./ship-keys check --all`, `./ship-keys push --dry-run`, `./ship-keys help`.
- **The user runs every step that moves a key or changes their accounts**, in their own terminal, one command at a time: `./ship-keys login`, `./ship-keys create`, `./ship-keys add NAME [--vercel-only]`, `./ship-keys supabase`, `./ship-keys push`, `./ship-keys schema`. Several of these open a browser or ask for a hidden paste, so they can't run headless.
- **`./ship-keys deploy` / `./ship-keys go` publish the site:** only after the user says yes to deploying this time.
- Logins happen in the user's browser (`./ship-keys login`); never type a password or token anywhere.

## The flow

Run from the repo root (or pass `--project <folder>`), on `main` after the tracks are merged:

1. `./ship-keys check` (you run it). Read the table and tell the user in plain words what's set, what's missing, and where each missing key comes from (which dashboard, which page). 🔴 = live site needs it and it's nowhere. 🟡 = on the laptop but not on Vercel. "optional: has a default" and "tests/tools only" are not blockers.
2. If Vercel or Supabase isn't logged in: the user runs `./ship-keys login` (one time per computer: a browser click for Vercel, one for Supabase).
3. If there's no Vercel project or Supabase project yet: the user runs `./ship-keys create`. It makes both (named after the folder; `--name x` for another name, `--region` defaults to us-east-1), or links/reuses one that already has that name. It generates the Supabase database password itself (saved hidden as `SUPABASE_DB_PASSWORD`, never pushed to Vercel), waits for the database to start, and fills in the Supabase URL + keys. If the account has several Supabase organizations it lists them: re-run with `--org <id>`. Free Supabase plan = 2 active projects; if creation fails for that, say so.
4. Supabase values (only if `create` didn't already fill them) (URL, anon/publishable key, service-role/secret key if the code uses one): `./ship-keys supabase` (add `--ref <project-ref>` if it lists several projects). It picks the right names (`NEXT_PUBLIC_` / `VITE_`) from the code.
5. Every other key (Anthropic, OpenAI, Stripe…): tell the user exactly where to copy it in that dashboard, then `./ship-keys add NAME`. Use `--vercel-only` for server secrets that should never sit in a local file (e.g. `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`).
6. `./ship-keys push --dry-run` (you) to show the plan, then the user runs `./ship-keys push`.
7. If the project has `supabase/schema.sql` and the database isn't set up yet: `./ship-keys schema`.
8. With their OK: `./ship-keys deploy`, then `./ship-keys check` again and open the live URL to confirm it works (watch the browser console for "not configured" errors). Public `NEXT_PUBLIC_` keys only reach the site after this new deploy.
9. If sign-in breaks on the live URL, the deploy output prints the Supabase Auth URL-configuration link: add the live address there (Site URL + `https://<live-domain>/**`).

## Settings (not secret)

`.ship-keys.json` in the repo root (safe to commit): `"supabaseRef"`, `"supabaseSecrets": ["NAME", …]` (also sent to Supabase Edge Function secrets on push), `"skip": ["NAME", …]` (never pushed).

## Safety it enforces on its own

- Adds `.env` / `.env.*` to `.gitignore` before writing any key; refuses to push if the keys file is tracked by git and says to rotate the keys if it ever was.
- Adds a `.vercelignore` before deploying: the Vercel CLI uploads every local file not listed there (it ignores `.gitignore`), so without it `.env.local` would be uploaded with the code.
- Private keys go to Vercel as locked "sensitive" values (production + preview); public ones to all three environments.

## Team

Only the person who owns the Vercel/Supabase accounts (PC #1) runs ship-keys, at the end (Step 5 in the README) or whenever a new key appears. The other PCs never need the real production keys: they run locally with their own `.env.local`, and the live site gets the keys from Vercel.

## When something fails

Errors are already redacted; read them and explain. Common ones: not linked (`./ship-keys login`), wrong Supabase project (`--ref`), Vercel says the variable exists with a different type (re-run `push`; it uses `--force`), deploy build failed (a code/build error — debug the build, not the keys). Delete `~/.ship-keys/tools` to force a fresh CLI download.
