"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireEnv } from "@/lib/env";
import { LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS, lockedMessage, lockMinutesRemaining } from "@/lib/auth/lockout";
import { isValidPin, normalizeEmail, pinToPassword } from "@/lib/auth/pin";
import { seedDemoLibrary } from "@/lib/demo/seed";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string; email?: string; locked?: boolean };

const derivePassword = (email: string, pin: string) =>
  pinToPassword(email, pin, requireEnv("PIN_PEPPER", process.env.PIN_PEPPER));

async function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? (await headers()).get("origin") ?? "http://localhost:3000";
}

function readEmail(formData: FormData) {
  return normalizeEmail(String(formData.get("email") ?? ""));
}

function checkNewPin(pin: string, confirm: string): string | null {
  if (!isValidPin(pin)) return "Your PIN must be 4 or 6 digits.";
  if (pin !== confirm) return "Those PINs don't match.";
  return null;
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = readEmail(formData);
  const pin = String(formData.get("pin") ?? "");
  const pinError = checkNewPin(pin, String(formData.get("confirmPin") ?? ""));
  if (!email) return { error: "Enter your email.", email };
  if (pinError) return { error: pinError, email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: derivePassword(email, pin),
    options: { emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/` },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { error: "There's already an account with that email. Try logging in.", email };
    }
    if (error.code === "over_email_send_rate_limit") {
      return { error: "We've sent a lot of emails just now. Please try again in a few minutes.", email };
    }
    console.error("signUp failed", error);
    return { error: "We couldn't create your account. Please try again.", email };
  }

  // With email confirmation on (Supabase's default) there's no session until they click the link.
  if (!data.session) {
    return { message: `Almost there! We sent a confirmation link to ${email}.` };
  }
  redirect("/");
}

export async function logIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = readEmail(formData);
  const pin = String(formData.get("pin") ?? "");
  if (!email || !isValidPin(pin)) {
    return { error: "Enter your email and your 4- or 6-digit PIN.", email };
  }

  const admin = createAdminClient();

  // 1. Refuse while locked, without even asking Supabase.
  const { data: attempt, error: readError } = await admin
    .from("login_attempts")
    .select("locked_until")
    .eq("email", email)
    .maybeSingle();
  if (readError) {
    // Fail closed: if we can't check the lock, don't allow a guess.
    console.error("Reading login_attempts failed", readError);
    return { error: "Something went wrong. Please try again.", email };
  }
  const minutesLeft = lockMinutesRemaining(attempt?.locked_until ?? null);
  if (minutesLeft > 0) return { error: lockedMessage(minutesLeft), email, locked: true };

  // 2. Try the PIN.
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: derivePassword(email, pin) });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email first — check your inbox for the link.", email };
    }
    if (error.code !== "invalid_credentials") {
      // Outages and rate limits aren't wrong guesses, so they don't count toward lockout.
      console.error("signInWithPassword failed", error);
      return { error: "Something went wrong. Please try again.", email };
    }

    // 3. Wrong PIN (or no such account — we deliberately don't say which).
    const { data: lockedUntil, error: rpcError } = await admin.rpc("record_failed_login", {
      p_email: email,
      p_max_attempts: MAX_FAILED_ATTEMPTS,
      p_lock_minutes: LOCKOUT_MINUTES,
    });
    if (rpcError) console.error("record_failed_login failed", rpcError);

    const nowLocked = lockMinutesRemaining(lockedUntil ?? null);
    if (nowLocked > 0) return { error: lockedMessage(nowLocked), email, locked: true };
    return { error: "That email and PIN don't match.", email };
  }

  // 4. Success clears the counter.
  await admin.from("login_attempts").delete().eq("email", email);
  redirect("/");
}

export async function requestPinReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = readEmail(formData);
  if (!email) return { error: "Enter your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/reset-pin`,
  });
  if (error?.code === "over_email_send_rate_limit") {
    return { error: "We've sent a lot of emails just now. Please try again in a few minutes.", email };
  }
  if (error) console.error("resetPasswordForEmail failed", error);

  // Same answer whether or not the account exists, so this can't be used to discover who has one.
  return { message: `If there's an account for ${email}, a reset link is on its way.` };
}

/**
 * Emails a one-time login link. Clicking it logs the reader in and lifts any lockout
 * (see /auth/confirm), so a locked-out reader never has to wait or change their PIN.
 */
export async function sendUnlockLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = readEmail(formData);
  if (!email) return { error: "Enter your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // Don't let this quietly create accounts for unknown emails.
    options: { shouldCreateUser: false, emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/` },
  });
  if (error?.code === "over_email_send_rate_limit") {
    return { error: "We've sent a lot of emails just now. Please try again in a few minutes." };
  }
  // Unknown emails also error here. We log it but tell the reader the same thing either way,
  // so the response doesn't reveal who has an account.
  if (error) console.error("signInWithOtp failed", error);

  return { message: `If there's an account for ${email}, an unlock link is on its way. It will log you straight in.` };
}

export async function resetPin(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const pin = String(formData.get("pin") ?? "");
  const pinError = checkNewPin(pin, String(formData.get("confirmPin") ?? ""));
  if (pinError) return { error: pinError };

  const { error } = await supabase.auth.updateUser({ password: derivePassword(user.email, pin) });
  if (error) {
    if (error.code === "same_password") {
      return { error: "That's already your PIN, so you're all set — or pick a different one." };
    }
    console.error("updateUser failed", error);
    return { error: "We couldn't update your PIN. Please try again." };
  }

  // No lockout clearing needed here: the reset link already lifted it in /auth/confirm.
  redirect("/");
}

/**
 * "Try the demo": a one-click private account with a sample library, so visitors (like
 * recruiters) can use the app without an email or PIN. It's a Supabase anonymous
 * account, so every visitor gets their own library and can't touch anyone else's, and
 * row-level security works exactly as for real readers. Demo accounts are deleted after
 * a week (see /api/cron/daily).
 */
export async function startDemo(): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error("signInAnonymously failed", error);
    return {
      error:
        error.code === "over_request_rate_limit"
          ? "Lots of people are trying the demo right now. Please try again in a few minutes."
          : "The demo isn't available right now. Please try again later.",
    };
  }

  try {
    // Same client, now signed in as the new demo account.
    await seedDemoLibrary(supabase);
  } catch (seedError) {
    // An empty library still works; it's just less to look at.
    console.error("Seeding the demo library failed", seedError);
  }
  redirect("/");
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
