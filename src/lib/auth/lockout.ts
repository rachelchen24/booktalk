/**
 * Lockout policy. Five wrong PINs locks the account for 15 minutes, which caps an
 * attacker at 480 guesses a day — about 21 days to try all 10,000 four-digit PINs,
 * and over 5 years for six digits. The owner can skip the wait at any time with an
 * emailed unlock link (any email link unlocks — see /auth/confirm).
 *
 * These constants are passed to the `record_failed_login` database function, so the
 * policy lives in one place.
 */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

/**
 * Whole minutes left on a lock (rounded up), or 0 if the account isn't locked.
 * Capped at LOCKOUT_MINUTES: the lock time comes from the database's clock, which can
 * run slightly ahead of the app server's, and "16 minutes" would look like a bug.
 */
export function lockMinutesRemaining(lockedUntil: string | null, now: Date = new Date()): number {
  if (!lockedUntil) return 0;
  const msLeft = new Date(lockedUntil).getTime() - now.getTime();
  return msLeft > 0 ? Math.min(LOCKOUT_MINUTES, Math.ceil(msLeft / 60_000)) : 0;
}

export function lockedMessage(minutes: number): string {
  const unit = minutes === 1 ? "minute" : "minutes";
  return `Too many wrong PINs. Try again in ${minutes} ${unit}, or unlock now with a link sent to your email.`;
}
