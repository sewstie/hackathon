// Store entry point.
//
// Import the data seam from here. `getStore()` returns the Supabase-backed
// store when env is configured, otherwise the deterministic in-memory store
// (so the app still runs offline and tests never touch the cloud).

import { supabaseEnv } from "@/lib/supabase/client";
import { InMemoryStore } from "./in-memory";
import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

export type {
  Store,
  NewReport,
  NewPrivateReport,
  PrivateAccess,
} from "./types";
export { InMemoryStore } from "./in-memory";
export { SupabaseStore } from "./supabase";
export { buildSeed, MIT_CAMPUS_ID, type Seed } from "./seed";

let cached: Store | null = null;

/** The active store: Supabase when configured, else in-memory. */
export function getStore(): Store {
  if (cached) return cached;
  cached = supabaseEnv() ? new SupabaseStore() : new InMemoryStore();
  return cached;
}
