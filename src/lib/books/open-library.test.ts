import { describe, expect, it } from "vitest";
import { coverUrl, isWorkKey, searchUrl, toBookResults, toEdition } from "./open-library";

// Trimmed from real responses (search "wicked gregory maguire", ISBN 9780060987107).
const searchResponse = {
  numFound: 24,
  docs: [
    { author_name: ["Gregory Maguire"], cover_i: 38706, first_publish_year: 1995, key: "/works/OL66218W", title: "Wicked" },
    { author_name: ["Gregory Maguire"], cover_i: 37265, first_publish_year: 2005, key: "/works/OL66214W", title: "Son of a Witch" },
  ],
};
const editionResponse = { publishers: ["Harper Paperbacks"], number_of_pages: 448, covers: [42792], title: "Wicked" };

describe("toBookResults", () => {
  it("maps Open Library search docs to our shape", () => {
    expect(toBookResults(searchResponse)[0]).toEqual({
      workKey: "OL66218W",
      title: "Wicked",
      authors: ["Gregory Maguire"],
      coverId: 38706,
      firstPublishYear: 1995,
    });
  });

  it("copes with missing authors, covers and years", () => {
    const [book] = toBookResults({ docs: [{ key: "/works/OL1W", title: "Untitled Draft" }] });
    expect(book).toMatchObject({ authors: [], coverId: null, firstPublishYear: null });
  });

  it("treats -1 / 0 cover ids as no cover", () => {
    const books = toBookResults({ docs: [{ key: "/works/OL1W", title: "A", cover_i: -1 }, { key: "/works/OL2W", title: "B", cover_i: 0 }] });
    expect(books.map((b) => b.coverId)).toEqual([null, null]);
  });

  it("drops docs without a usable key or title, and duplicates", () => {
    const books = toBookResults({
      docs: [
        { title: "No key" },
        { key: "/works/OL1W", title: "   " },
        { key: "/books/OL7286082M", title: "An edition, not a work" },
        { key: "/works/OL66218W", title: "Wicked" },
        { key: "/works/OL66218W", title: "Wicked (again)" },
      ],
    });
    expect(books.map((b) => b.title)).toEqual(["Wicked"]);
  });

  it("dedupes repeated author names", () => {
    const [book] = toBookResults({ docs: [{ key: "/works/OL1W", title: "A", author_name: ["Ann", "Ann", "Bo"] }] });
    expect(book.authors).toEqual(["Ann", "Bo"]);
  });

  it("returns nothing for a malformed response", () => {
    expect(toBookResults(null)).toEqual([]);
    expect(toBookResults({ error: "oops" })).toEqual([]);
  });
});

describe("toEdition", () => {
  it("picks out cover, page count and publisher", () => {
    expect(toEdition(editionResponse)).toEqual({ coverId: 42792, pages: 448, publishers: ["Harper Paperbacks"] });
  });

  it("handles an edition with nothing useful", () => {
    expect(toEdition({})).toEqual({ coverId: null, pages: null, publishers: [] });
  });
});

describe("isWorkKey", () => {
  it("only accepts Open Library work ids", () => {
    expect(isWorkKey("OL66218W")).toBe(true);
    for (const bad of ["OL7286082M", "/works/OL66218W", "OL66218W; drop table", ""]) expect(isWorkKey(bad)).toBe(false);
  });
});

describe("URLs", () => {
  it("builds search URLs for each kind of lookup", () => {
    expect(searchUrl({ query: "wicked maguire" })).toContain("q=wicked+maguire");
    expect(searchUrl({ isbn: "9780060987107" })).toContain("isbn=9780060987107");
    expect(searchUrl({ workKey: "OL66218W" })).toContain("q=key%3A%2Fworks%2FOL66218W");
  });

  it("builds cover URLs", () => {
    expect(coverUrl(38706)).toBe("https://covers.openlibrary.org/b/id/38706-M.jpg");
    expect(coverUrl(38706, "L")).toBe("https://covers.openlibrary.org/b/id/38706-L.jpg");
  });
});
