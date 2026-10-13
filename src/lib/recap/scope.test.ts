import { describe, expect, it } from "vitest";
import { numberedChapters } from "@/lib/chapters/list";
import type { Note } from "@/lib/library/notes";
import { chaptersInScope, notesInScope, recapPromptInput, recapScope } from "./scope";

const note = (chapter: number | null, body: string, created_at = "2026-01-01T00:00:00Z"): Note => ({
  id: `${chapter}-${body}`,
  chapter,
  body,
  created_at,
});

describe("recapScope", () => {
  it("covers through the chapter when the spot is at its end (tapped in the list)", () => {
    expect(recapScope(12, 40, 30)).toEqual({ through: 12, partwayInto: null });
  });

  it("covers only earlier chapters when the spot is partway through one", () => {
    // Chapter 13 ends at 43.3%; at 40% the reader is partway into it.
    expect(recapScope(13, 40, 30)).toEqual({ through: 12, partwayInto: 13 });
  });

  it("treats a missing percent as the end of the chapter", () => {
    expect(recapScope(5, null, 30)).toEqual({ through: 5, partwayInto: null });
  });

  it("has nothing to recap before the first chapter is finished", () => {
    expect(recapScope(null, null, 30)).toEqual({ through: 0, partwayInto: null });
    expect(recapScope(1, 1, 30)).toEqual({ through: 0, partwayInto: 1 });
  });

  it("tolerates percent rounding at a chapter's end", () => {
    // percentThrough(1, 3) = 33.3, but a stored 33.29 still means "end of chapter 1".
    expect(recapScope(1, 33.29, 3)).toEqual({ through: 1, partwayInto: null });
  });

  it("treats a page- or time-based spot as partway, even past the equal-chapters boundary", () => {
    // Page 210 of 448 = 46.9%. The reader picked chapter 13. With equal-length chapters,
    // chapter 13 would end at 43.3%, but real chapters vary, so they may still be mid-chapter.
    expect(recapScope(13, 46.9, 30)).toEqual({ through: 12, partwayInto: 13 });
  });

  it("recaps the whole book at 100%, however it was found", () => {
    expect(recapScope(30, 100, 30)).toEqual({ through: 30, partwayInto: null });
  });

  it("never goes past the end of the list", () => {
    expect(recapScope(40, 100, 30)).toEqual({ through: 30, partwayInto: null });
  });
});

describe("notesInScope", () => {
  it("drops notes from later chapters and notes without a chapter", () => {
    const notes = [note(2, "early"), note(12, "at spot"), note(13, "LATER"), note(null, "no chapter")];
    expect(notesInScope(notes, 12).map((n) => n.body)).toEqual(["early", "at spot"]);
  });

  it("orders notes by chapter, then by when they were written", () => {
    const notes = [note(3, "b", "2026-01-02T00:00:00Z"), note(1, "a"), note(3, "a", "2026-01-01T00:00:00Z")];
    expect(notesInScope(notes, 5).map((n) => `${n.chapter}${n.body}`)).toEqual(["1a", "3a", "3b"]);
  });
});

describe("chaptersInScope", () => {
  it("only includes chapters the reader has reached", () => {
    expect(chaptersInScope(numberedChapters(30), 12)).toHaveLength(12);
    expect(chaptersInScope(numberedChapters(30), 0)).toHaveLength(0);
  });
});

describe("recapPromptInput", () => {
  const chapters = [
    { number: 1, title: "Munchkinlanders" },
    { number: 2, title: "The Shiz Years" },
    { number: 3, title: "SPOILER TITLE" },
  ];
  const input = {
    title: "Wicked",
    authors: ["Gregory Maguire"],
    through: 2,
    totalChapters: 3,
    chapters,
    notes: [note(1, "Elphaba is born green"), note(3, "SPOILER NOTE")],
  };

  it("includes the reader's notes and chapter titles up to their spot", () => {
    const text = recapPromptInput(input);
    expect(text).toContain("Elphaba is born green");
    expect(text).toContain("2. The Shiz Years");
    expect(text).toContain("finished chapter 2 of 3");
  });

  it("never includes anything past the reader's spot", () => {
    const text = recapPromptInput(input);
    expect(text).not.toContain("SPOILER");
  });

  it("says so when there are no notes", () => {
    expect(recapPromptInput({ ...input, notes: [] })).toContain("hasn't left any notes");
  });
});
