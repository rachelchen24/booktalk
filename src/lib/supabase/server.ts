import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Supabase client acting as the current reader, using their session cookies.
 * Row-level security applies, so it can only see that reader's data.
 * Create a new one per request; never share it.
 */
export async function createClient() {
  // Supabase checks session expiry against the current time. Next can prerender pages
  // in the background with the reader's cookies, where reading the clock isn't allowed,
  // so stop prerendering here: anything using this client needs a real request.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components can't set cookies. That's fine: proxy.ts refreshes the
          // session on every request, and Server Actions (where we log in) can set them.
        }
      },
    },
  });
}
