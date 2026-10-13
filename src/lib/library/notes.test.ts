import { describe, expect, it } from "vitest";
import { groupByChapter, parseAnchors, parseChapter, sortInChapter, type Note } from "./notes";

const note = (id: string, chapter: number | null, created_at: string): Note => ({ id, chapter, body: id, created_at });

describe("groupByChapter", () => {
  it("orders chapters numerically (not as text) with unassigned notes last", () => {
    const groups = groupByChapter([
      note("a", 10, "2026-01-01T00:00:00Z"),
      note("b", null, "2026-01-01T00:00:00Z"),
      note("c", 2, "2026-01-01T00:00:00Z"),
    ]);
    expect(groups.map((g) => g.chapter)).toEqual([2, 10, null]);
  });

  it("keeps notes within a chapter oldest first", () => {
    const [group] = groupByChapter([note("later", 3, "2026-01-02T00:00:00Z"), note("earlier", 3, "2026-01-01T00:00:00Z")]);
    expect(group.notes.map((n) => n.id)).toEqual(["earlier", "later"]);
  });

  it("returns nothing for no notes", () => {
    expect(groupByChapter([])).toEqual([]);
  });
});

describe("parseChapter", () => {
  it("treats blank as 'no chapter yet'", () => {
    expect(parseChapter("")).toBeNull();
    expect(parseChapter("   ")).toBeNull();
  });
  it("accepts whole chapter numbers", () => {
    expect(parseChapter("12")).toBe(12);
    expect(parseChapter(" 7 ")).toBe(7);
  });
  it("rejects anything else", () => {
    for (const bad of ["0", "-3", "2.5", "five", "1001", "1e3"]) expect(parseChapter(bad)).toBeUndefined();
  });
});

describe("sortInChapter", () => {
  const at = (id: string, page: number | null, created_at: string): Note => ({ id, chapter: 1, body: id, created_at, page });
  it("puts notes in page order, like margin notes, then page-less notes oldest first", () => {
    const sorted = sortInChapter([
      at("no-page-new", null, "2026-01-03T00:00:00Z"),
      at("p40", 40, "2026-01-01T00:00:00Z"),
      at("no-page-old", null, "2026-01-01T00:00:00Z"),
      at("p12", 12, "2026-01-02T00:00:00Z"),
    ]);
    expect(sorted.map((n) => n.id)).toEqual(["p12", "p40", "no-page-old", "no-page-new"]);
  });
});

describe("parseAnchors", () => {
  it("accepts all blank (anchors are optional)", () => {
    expect(parseAnchors({})).toEqual({ ok: true, anchors: { page: null, audio_minutes: null, quote: null } });
  });

  it("reads a page, an audiobook time and a quote", () => {
    expect(parseAnchors({ page: "212", time: "3h 42m", quote: '  "It was a dark   night"  ' })).toEqual({
      ok: true,
      anchors: { page: 212, audio_minutes: 222, quote: "It was a dark night" },
    });
  });

  it("explains bad input", () => {
    expect(parseAnchors({ page: "twelve" })).toMatchObject({ ok: false, error: expect.stringContaining("Page") });
    expect(parseAnchors({ page: "0" }).ok).toBe(false);
    expect(parseAnchors({ time: "soon" })).toMatchObject({ ok: false, error: expect.stringContaining("3h 42m") });
    expect(parseAnchors({ quote: "x".repeat(301) }).ok).toBe(false);
  });
});
