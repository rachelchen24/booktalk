import { createHmac } from "node:crypto";

/** Readers pick a 4-digit PIN (easy) or a 6-digit PIN (more secure). */
export const PIN_LENGTHS = [4, 6] as const;

export function isValidPin(pin: string): boolean {
  return /^\d+$/.test(pin) && (PIN_LENGTHS as readonly number[]).includes(pin.length);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Turns a short PIN into the password we actually give Supabase.
 *
 * Supabase requires 6+ character passwords, so we can't hand it a 4-digit PIN.
 * Instead we compute HMAC-SHA256(pepper, email + PIN) and send the hex digest.
 *
 * Why an HMAC with a server-only secret ("pepper") rather than, say, padding the PIN:
 * there are only 10,000 four-digit PINs. If the derivation were public, anyone could
 * call Supabase's auth API directly with each candidate and skip our lockout. Because
 * the pepper never leaves the server, the only way to test a PIN is through our login
 * action, which enforces the 5-attempt limit.
 *
 * The email is mixed in so two readers with the same PIN still get different passwords.
 */
export function pinToPassword(email: string, pin: string, pepper: string): string {
  if (!pepper || pepper.length < 32) {
    throw new Error("PIN_PEPPER must be set to a random string of at least 32 characters");
  }
  if (!isValidPin(pin)) {
    throw new Error("PIN must be 4 or 6 digits");
  }
  return createHmac("sha256", pepper)
    .update(`${normalizeEmail(email)}:${pin}`)
    .digest("hex");
}
