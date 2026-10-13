import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string };

/**
 * The one place pages ask "who is logged in?". Sends logged-out readers to /login.
 * Reads cookies, so callers must render inside a <Suspense> boundary. Wrapped in
 * React's cache() so several components on one page share a single lookup.
 *
 * Uses getClaims(), which checks the login token's signature locally against the
 * project's public signing key, instead of getUser(), which asks Supabase's servers
 * every time. That saves a full network round trip on every page and every action.
 * Trade-off: a session revoked elsewhere stays usable until its token expires (about
 * an hour). Row-level security still checks the same signed token on every query.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || typeof claims.email !== "string") redirect("/login");
  return { id: claims.sub, email: claims.email };
});
