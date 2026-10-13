import { describe, expect, it } from "vitest";
import { chapterName, finishedAtAfterSpot, numberedChapters, parseChapters, percentThrough, resolveChapters } from "./list";
import { tocToChapters } from "./open-library-toc";

describe("parseChapters", () => {
  it("numbers chapters 1…N itself, ignoring numbers in the input", () => {
    const result = parseChapters([{ number: 7, title: "A" }, { number: 7, title: "B" }, "C"]);
    expect(result).toEqual({
      ok: true,
      chapters: [
        { number: 1, title: "A" },
        { number: 2, title: "B" },
        { number: 3, title: "C" },
      ],
    });
  });

  it("tidies whitespace and allows untitled chapters", () => {
    const result = parseChapters([{ title: "  The   Wizard " }, { title: "" }, {}]);
    expect(result.ok && result.chapters.map((c) => c.title)).toEqual(["The Wizard", "", ""]);
  });

  it("rejects empty, oversized, and malformed input", () => {
    expect(parseChapters([]).ok).toBe(false);
    expect(parseChapters("chapters").ok).toBe(false);
    expect(parseChapters(new Array(1001).fill("x")).ok).toBe(false);
    expect(parseChapters([{ title: "x".repeat(201) }]).ok).toBe(false);
    expect(parseChapters([{ title: 42 }]).ok).toBe(false);
  });
});

describe("numberedChapters / chapterName", () => {
  it("makes an untitled list that still reads well", () => {
    const chapters = numberedChapters(3);
    expect(chapters.map(chapterName)).toEqual(["Chapter 1", "Chapter 2", "Chapter 3"]);
    expect(chapterName({ number: 4, title: "Munchkinlanders" })).toBe("Munchkinlanders");
  });
});

describe("resolveChapters", () => {
  const suggestion = { chapters: [{ title: "Shared" }] };
  it("prefers the reader's own copy over the suggestion", () => {
    expect(resolveChapters([{ title: "Mine" }], suggestion)?.[0].title).toBe("Mine");
  });
  it("falls back to the picked suggestion, then to none", () => {
    expect(resolveChapters(null, suggestion)?.[0].title).toBe("Shared");
    expect(resolveChapters(null, null)).toBeNull();
  });
  it("ignores a corrupt stored list rather than crashing", () => {
    expect(resolveChapters("garbage", suggestion)?.[0].title).toBe("Shared");
  });
});

describe("percentThrough", () => {
  it("is the share of chapters finished", () => {
    expect(percentThrough(12, 30)).toBe(40);
    expect(percentThrough(1, 3)).toBe(33.3);
    expect(percentThrough(30, 30)).toBe(100);
  });
  it("clamps nonsense instead of going past 100% or below 0%", () => {
    expect(percentThrough(40, 30)).toBe(100);
    expect(percentThrough(-1, 30)).toBe(0);
    expect(percentThrough(3, 0)).toBe(0);
  });
});

describe("tocToChapters", () => {
  it("accepts a clean table of contents", () => {
    const chapters = tocToChapters([
      { title: "Contents" },
      { label: "Chapter 1", title: "The Boy Who Lived" },
      { title: "Chapter 2: The Vanishing Glass" },
      { title: "The Letters from No One." },
      { title: "Acknowledgments" },
    ]);
    expect(chapters).toEqual([
      { number: 1, title: "The Boy Who Lived" },
      { number: 2, title: "The Vanishing Glass" },
      { number: 3, title: "The Letters from No One" },
    ]);
  });

  it("keeps untitled 'Chapter N' entries so later numbers don't shift", () => {
    const chapters = tocToChapters([{ title: "Chapter 1" }, { title: "Chapter 2" }, { title: "Chapter 3: Home" }]);
    expect(chapters?.map((c) => c.title)).toEqual(["", "", "Home"]);
  });

  // Real junk from Open Library's Wicked editions.
  it("rejects volume labels and catalog codes", () => {
    expect(
      tocToChapters([
        { title: "880-04 -- v.1." },
        { title: "Elpabawa kŭllinta -- -- v.2." },
        { title: "Sŏtchok manyŏ iyaki." },
      ]),
    ).toBeNull();
  });

  // Real Greek-language Harry Potter edition.
  it("rejects tables in another script", () => {
    expect(
      tocToChapters([
        { label: "Το αγόρι που σώθηκε" },
        { label: "Το τζάμι που εξαφανίστηκε" },
        { label: "Ο κλειδοκράτορας" },
      ]),
    ).toBeNull();
  });

  it("allows accented Latin titles", () => {
    expect(tocToChapters([{ title: "Café" }, { title: "Señor" }, { title: "Naïve" }])).not.toBeNull();
  });

  it("rejects tables too short to be chapters", () => {
    expect(tocToChapters([{ title: "Part One" }, { title: "Part Two" }])).toBeNull();
    expect(tocToChapters(undefined)).toBeNull();
  });
});

describe("finishedAtAfterSpot", () => {
  const now = new Date("2026-10-13T12:00:00Z");
  it("finishes the book at 100%", () => {
    expect(finishedAtAfterSpot(100, null, now)).toBe("2026-10-13T12:00:00.000Z");
  });
  it("keeps the original finish date if you reach the end again", () => {
    expect(finishedAtAfterSpot(100, "2026-03-01T00:00:00.000Z", now)).toBe("2026-03-01T00:00:00.000Z");
  });
  it("doesn't finish a book you're partway through the last chapter of", () => {
    expect(finishedAtAfterSpot(98.5, null, now)).toBeNull();
  });
  it("un-finishes the book if you move your spot back", () => {
    expect(finishedAtAfterSpot(96.7, "2026-03-01T00:00:00.000Z", now)).toBeNull();
    expect(finishedAtAfterSpot(null, "2026-03-01T00:00:00.000Z", now)).toBeNull();
  });
});
