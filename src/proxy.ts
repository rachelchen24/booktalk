import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Pages a logged-out reader can visit. Logged-in readers are sent home from these. */
const GUEST_ONLY = ["/login", "/signup", "/forgot-pin"];
/** Pages anyone can visit (email-link landing). */
const PUBLIC = ["/auth/confirm"];

/**
 * Runs before every page request. Two jobs:
 * 1. Refresh the Supabase session so cookies don't silently expire mid-visit.
 * 2. Redirect based on login state. This is a fast, optimistic check for nicer UX;
 *    pages and actions still verify the user themselves, and the database enforces
 *    row-level security regardless.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Write refreshed tokens to the request (for this render) and the response (for the browser).
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims() verifies the JWT signature, unlike getSession() which trusts the cookie.
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;

  if (PUBLIC.some((p) => path.startsWith(p))) return response;

  const isGuestPage = GUEST_ONLY.some((p) => path.startsWith(p));
  if (!loggedIn && !isGuestPage) return redirectKeepingCookies(request, response, "/login");
  if (loggedIn && isGuestPage) return redirectKeepingCookies(request, response, "/");

  return response;
}

function redirectKeepingCookies(request: NextRequest, response: NextResponse, to: string) {
  const redirect = NextResponse.redirect(new URL(to, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Skip static assets and images; run on everything else.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
