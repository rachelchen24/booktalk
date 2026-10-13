import { describe, expect, it } from "vitest";
import { keywords, matchNotes } from "./memory";

describe("keywords", () => {
  it("keeps the meaningful words, drops filler and punctuation", () => {
    expect(keywords("The last thing I remember: Elphaba ran away with @Fiyero!")).toEqual([
      "elphaba",
      "ran",
      "away",
      "fiyero",
    ]);
  });

  it("matches word forms", () => {
    expect(keywords("killed")).toEqual(keywords("kills"));
    expect(keywords("Galinda's")).toEqual(["galinda"]);
  });

  it("returns nothing for pure filler", () => {
    expect(keywords("and then the thing happened")).toEqual([]);
  });
});

describe("matchNotes", () => {
  const notes = [
    { chapter: 3, body: "Elphaba meets Galinda at Shiz" },
    { chapter: 8, body: "Doctor Dillamond is killed" },
    { chapter: 15, body: "Elphaba runs away with Fiyero to the Emerald City" },
    { chapter: null, body: "Elphaba and Fiyero, no chapter" },
  ];

  it("finds the chapter whose note best matches the memory", () => {
    const [top] = matchNotes("Elphaba ran away with Fiyero", notes, 30);
    expect(top.chapter).toBe(15);
  });

  it("ranks several possible chapters, best first", () => {
    expect(matchNotes("Elphaba", notes, 30).map((m) => m.chapter)).toEqual([15, 3]); // tie → later first
  });

  it("matches across word forms", () => {
    expect(matchNotes("when Dillamond got killed", notes, 30)[0].chapter).toBe(8);
  });

  it("ignores notes without a chapter, or past the end of the list", () => {
    const result = matchNotes("Fiyero", [...notes, { chapter: 99, body: "Fiyero" }], 30);
    expect(result.map((m) => m.chapter)).toEqual([15]);
  });

  it("returns nothing when no note matches", () => {
    expect(matchNotes("the Wizard's balloon", notes, 30)).toEqual([]);
    expect(matchNotes("and then", notes, 30)).toEqual([]);
  });
});
