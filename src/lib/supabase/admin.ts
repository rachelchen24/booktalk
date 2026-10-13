import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireEnv, supabaseUrl } from "@/lib/env";

/**
 * Supabase client with the service-role key. It bypasses row-level security, so it
 * is only used for the few things a reader must not do for themselves — like
 * reading and updating login-attempt counters. `server-only` makes the build fail
 * if this file is ever imported into code that runs in the browser.
 */
export function createAdminClient() {
  return createClient(
    supabaseUrl(),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
