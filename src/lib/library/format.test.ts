import { describe, expect, it } from "vitest";
import { authorsLabel, finishedInYear, spotLabel } from "./format";

describe("spotLabel", () => {
  it("shows chapter and percent when both are known", () => {
    expect(spotLabel({ current_chapter: 12, current_percent: 34.4 })).toBe("Chapter 12 · 34%");
  });
  it("shows whichever one is known", () => {
    expect(spotLabel({ current_chapter: 3, current_percent: null })).toBe("Chapter 3");
    expect(spotLabel({ current_chapter: null, current_percent: 50 })).toBe("50%");
  });
  it("says not started when there's no spot yet", () => {
    expect(spotLabel({ current_chapter: null, current_percent: null })).toBe("Not started");
  });
  it("keeps 0% (a real spot) distinct from no spot", () => {
    expect(spotLabel({ current_chapter: null, current_percent: 0 })).toBe("0%");
  });
});

describe("authorsLabel", () => {
  it("joins names naturally", () => {
    expect(authorsLabel([])).toBe("Unknown author");
    expect(authorsLabel(["Gregory Maguire"])).toBe("Gregory Maguire");
    expect(authorsLabel(["Neil Gaiman", "Terry Pratchett"])).toBe("Neil Gaiman and Terry Pratchett");
    expect(authorsLabel(["A", "B", "C"])).toBe("A, B and C");
    expect(authorsLabel(["A", "B", "C", "D"])).toBe("A, B and others");
  });
});

describe("finishedInYear", () => {
  const entries = [
    { finished_at: "2026-01-01T00:00:00Z" },
    { finished_at: "2026-10-13T12:00:00Z" },
    { finished_at: "2025-12-31T23:59:59Z" },
    { finished_at: null },
  ];
  it("counts only books finished in that calendar year", () => {
    expect(finishedInYear(entries, 2026)).toBe(2);
    expect(finishedInYear(entries, 2025)).toBe(1);
    expect(finishedInYear([], 2026)).toBe(0);
  });
});

describe("spotLabel at the end", () => {
  it("says Finished at 100%", () => {
    expect(spotLabel({ current_chapter: 30, current_percent: 100 })).toBe("Finished");
  });
});
