import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string };

/**
 * The one place pages ask "who is logged in?". Uses getUser(), which checks the token
 * with Supabase, rather than trusting the cookie. Sends logged-out readers to /login.
 * Reads cookies, so callers must render inside a <Suspense> boundary. Wrapped in
 * React's cache() so several components on one page share a single lookup.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");
  return { id: user.id, email: user.email };
});
