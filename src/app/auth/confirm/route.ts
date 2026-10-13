import type { EmailOtpType, User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { normalizeEmail } from "@/lib/auth/pin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Where links in Supabase emails (sign-up confirmation, unlock link, PIN reset) land.
 * Exchanges the one-time token in the URL for a session cookie, lifts any PIN
 * lockout, then sends the reader on to `next`.
 *
 * Supports both link styles Supabase can send:
 * - `?code=` (default templates, PKCE) — only works in the browser that requested it.
 * - `?token_hash=&type=` (custom templates) — works even if the email is opened on another device.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const supabase = await createClient();

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  let user: User | null = null;
  if (tokenHash && type) {
    user = (await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).data.user;
  } else if (code) {
    user = (await supabase.auth.exchangeCodeForSession(code)).data.user;
  }

  if (!user) return NextResponse.redirect(new URL("/login?link=expired", origin));

  // Clicking a link sent to the inbox proves the reader owns the email, which is
  // all a lockout is protecting. So every email link also unlocks the account.
  if (user.email) {
    const { error } = await createAdminClient()
      .from("login_attempts")
      .delete()
      .eq("email", normalizeEmail(user.email));
    if (error) console.error("Clearing lockout failed", error);
  }

  return NextResponse.redirect(new URL(next, origin));
}

/** Only allow same-site paths, so the link can't be abused to bounce readers to another site. */
function safeNextPath(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
