import { describe, expect, it } from "vitest";
import { isValidPin, normalizeEmail, pinToPassword } from "./pin";

const PEPPER = "test-pepper-0123456789-abcdefghijklmnop";

describe("isValidPin", () => {
  it("accepts 4- and 6-digit PINs", () => {
    expect(isValidPin("0000")).toBe(true);
    expect(isValidPin("123456")).toBe(true);
  });

  it("rejects other lengths", () => {
    for (const pin of ["", "123", "12345", "1234567"]) {
      expect(isValidPin(pin)).toBe(false);
    }
  });

  it("rejects non-digits", () => {
    for (const pin of ["12a4", "12 4", "-123", "١٢٣٤"]) {
      expect(isValidPin(pin)).toBe(false);
    }
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Reader@Example.COM ")).toBe("reader@example.com");
  });
});

describe("pinToPassword", () => {
  it("is deterministic, so the same PIN logs in every time", () => {
    expect(pinToPassword("a@b.com", "1234", PEPPER)).toBe(pinToPassword("a@b.com", "1234", PEPPER));
  });

  it("meets Supabase's minimum password length", () => {
    expect(pinToPassword("a@b.com", "1234", PEPPER).length).toBeGreaterThanOrEqual(6);
  });

  it("ignores email casing and whitespace", () => {
    expect(pinToPassword(" A@B.com", "1234", PEPPER)).toBe(pinToPassword("a@b.com", "1234", PEPPER));
  });

  it("gives different readers with the same PIN different passwords", () => {
    expect(pinToPassword("a@b.com", "1234", PEPPER)).not.toBe(pinToPassword("c@d.com", "1234", PEPPER));
  });

  it("depends on the pepper, so the derivation can't be reproduced without it", () => {
    const other = "another-pepper-0123456789-abcdefghijk";
    expect(pinToPassword("a@b.com", "1234", PEPPER)).not.toBe(pinToPassword("a@b.com", "1234", other));
  });

  it("never contains the PIN itself", () => {
    expect(pinToPassword("a@b.com", "987654", PEPPER)).not.toContain("987654");
  });

  it("refuses a missing or short pepper", () => {
    expect(() => pinToPassword("a@b.com", "1234", "")).toThrow(/PIN_PEPPER/);
    expect(() => pinToPassword("a@b.com", "1234", "short")).toThrow(/PIN_PEPPER/);
  });

  it("refuses an invalid PIN", () => {
    expect(() => pinToPassword("a@b.com", "12345", PEPPER)).toThrow(/4 or 6 digits/);
  });
});
