import { describe, expect, it } from "vitest";
import { looksLikeIsbn, normalizeIsbn } from "./isbn";

describe("normalizeIsbn", () => {
  it("accepts valid ISBN-13 and ISBN-10 (Wicked, Harper paperback)", () => {
    expect(normalizeIsbn("9780060987107")).toBe("9780060987107");
    expect(normalizeIsbn("0060987103")).toBe("0060987103");
  });

  it("ignores hyphens and spaces, as printed on the copyright page", () => {
    expect(normalizeIsbn("978-0-06-098710-7")).toBe("9780060987107");
    expect(normalizeIsbn(" 0 06 098710 3 ")).toBe("0060987103");
  });

  it("accepts an X check digit in ISBN-10, either case", () => {
    expect(normalizeIsbn("080442957X")).toBe("080442957X");
    expect(normalizeIsbn("080442957x")).toBe("080442957X");
  });

  it("rejects a wrong check digit", () => {
    expect(normalizeIsbn("9780060987108")).toBeNull();
    expect(normalizeIsbn("0060987104")).toBeNull();
  });

  it("catches two swapped digits", () => {
    expect(normalizeIsbn("9780069087107")).toBeNull();
  });

  it("rejects things that aren't ISBNs", () => {
    for (const input of ["", "wicked", "12345", "97800609871071", "X060987103"]) {
      expect(normalizeIsbn(input)).toBeNull();
    }
  });
});

describe("looksLikeIsbn", () => {
  it("is true for ISBN-shaped input even with a bad check digit", () => {
    expect(looksLikeIsbn("978-0-06-098710-8")).toBe(true);
  });

  it("is false for titles and short numbers", () => {
    expect(looksLikeIsbn("wicked")).toBe(false);
    expect(looksLikeIsbn("1984")).toBe(false);
  });
});
