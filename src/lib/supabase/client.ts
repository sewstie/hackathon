// Supabase client helpers.
//
// The anon key is a client key and safe to expose via NEXT_PUBLIC_*. The only
// true server secret is the AI key (owned by Track A), not read here. We lazily
// create a singleton so importing this module never throws when env is absent
// (e.g. during tests, which use the in-memory store instead).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

let cached: SupabaseClient<Database> | null = null;

/** The configured Supabase URL + anon key, or null when env is not set. */
export function supabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/**
 * Get the shared Supabase client. Throws only when actually called without
 * configured env — so the module is import-safe in environments (tests) that
 * never touch Supabase.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (cached) return cached;
  const env = supabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  cached = createClient<Database>(env.url, env.anonKey);
  return cached;
}
