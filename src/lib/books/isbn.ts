/**
 * ISBNs end in a check digit computed from the others, so most typos (one wrong digit,
 * two swapped digits) can be caught before we ask Open Library anything.
 */

/** Strips spaces and hyphens. Returns the bare ISBN if it's a valid ISBN-10 or ISBN-13, else null. */
export function normalizeIsbn(input: string): string | null {
  const isbn = stripIsbn(input);
  if (/^\d{9}[\dX]$/.test(isbn)) return isValidIsbn10(isbn) ? isbn : null;
  if (/^\d{13}$/.test(isbn)) return isValidIsbn13(isbn) ? isbn : null;
  return null;
}

/** True if the input is shaped like an ISBN, valid or not, so we can say "check that ISBN". */
export function looksLikeIsbn(input: string): boolean {
  return /^(\d{9}[\dX]|\d{13})$/.test(stripIsbn(input));
}

function stripIsbn(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

// ISBN-10: weights 10 down to 1; the total must divide by 11. "X" stands for 10.
function isValidIsbn10(isbn: string): boolean {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const digit = isbn[i] === "X" ? 10 : Number(isbn[i]);
    sum += digit * (10 - i);
  }
  return sum % 11 === 0;
}

// ISBN-13: alternating weights 1 and 3; the total must divide by 10.
function isValidIsbn13(isbn: string): boolean {
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  return sum % 10 === 0;
}
