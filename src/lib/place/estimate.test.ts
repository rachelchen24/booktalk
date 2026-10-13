import { describe, expect, it } from "vitest";
import {
  estimateFromFraction,
  estimateFromPage,
  estimateFromPercent,
  estimateFromTime,
  formatDuration,
  parseDuration,
} from "./estimate";

describe("estimateFromPercent", () => {
  it("maps a percentage to the chapter it falls in", () => {
    // 30 chapters, 40% → 12 chapters done → in chapter 13
    expect(estimateFromPercent(40, 30)).toEqual({ chapter: 13, percent: 40, candidates: [12, 13, 14] });
  });

  it("puts 0% in chapter 1 and 100% in the last chapter", () => {
    expect(estimateFromPercent(0, 30).chapter).toBe(1);
    expect(estimateFromPercent(100, 30).chapter).toBe(30);
  });

  it("only offers neighbours that exist", () => {
    expect(estimateFromPercent(0, 30).candidates).toEqual([1, 2]);
    expect(estimateFromPercent(100, 30).candidates).toEqual([29, 30]);
    expect(estimateFromPercent(50, 1).candidates).toEqual([1]);
  });

  it("clamps out-of-range input instead of inventing chapters", () => {
    expect(estimateFromPercent(150, 30)).toMatchObject({ chapter: 30, percent: 100 });
    expect(estimateFromPercent(-5, 30)).toMatchObject({ chapter: 1, percent: 0 });
  });
});

describe("estimateFromPage", () => {
  it("without calibration, uses page ÷ total pages", () => {
    // Wicked paperback: 448 pages. Page 224 = halfway → 30 chapters → chapter 16.
    expect(estimateFromPage(224, 448, 30)).toMatchObject({ chapter: 16, percent: 50 });
  });

  it("first and last pages land in the first and last chapters", () => {
    expect(estimateFromPage(1, 448, 30).chapter).toBe(1);
    expect(estimateFromPage(448, 448, 30).chapter).toBe(30);
  });

  it("uses a calibration point: the page a chapter starts on maps to that chapter", () => {
    const calibration = { chapter: 12, page: 187 };
    expect(estimateFromPage(187, 448, 30, calibration).chapter).toBe(12);
    expect(estimateFromPage(186, 448, 30, calibration).chapter).toBe(11);
  });

  it("calibration fixes skew from a long first half", () => {
    // Without calibration, page 187 of 448 looks like chapter 13. Told chapter 20 starts
    // there (short early chapters), we trust that instead.
    expect(estimateFromPage(187, 448, 30).chapter).toBe(13);
    expect(estimateFromPage(187, 448, 30, { chapter: 20, page: 187 }).chapter).toBe(20);
  });

  it("ignores a calibration point outside the book", () => {
    expect(estimateFromPage(224, 448, 30, { chapter: 40, page: 100 })).toEqual(estimateFromPage(224, 448, 30));
    expect(estimateFromPage(224, 448, 30, { chapter: 5, page: 900 })).toEqual(estimateFromPage(224, 448, 30));
  });

  it("handles a calibration point on page 1", () => {
    expect(estimateFromPage(1, 448, 30, { chapter: 1, page: 1 }).chapter).toBe(1);
    expect(estimateFromPage(448, 448, 30, { chapter: 1, page: 1 }).chapter).toBe(30);
  });

  it("clamps pages past the end", () => {
    expect(estimateFromPage(500, 448, 30)).toMatchObject({ chapter: 30, percent: 100 });
  });
});

describe("estimateFromTime", () => {
  it("maps audiobook time to a chapter by share of total length", () => {
    // 3h 42m of 11h 6m is a third of the way → 30 chapters → chapter 11
    expect(estimateFromTime(222, 666, 30)).toMatchObject({ chapter: 11, percent: 33.3 });
  });
});

describe("chapter boundaries", () => {
  it("lands exact boundaries in the next chapter despite floating-point error", () => {
    // In floating point, (15/22) * 22 is 14.999999999999998, not 15. Without the nudge,
    // finishing exactly 15 of 22 chapters would land you back in chapter 15.
    expect(estimateFromFraction(15 / 22, 22).chapter).toBe(16);
    expect(estimateFromFraction(31 / 39, 39).chapter).toBe(32);
    for (let n = 2; n <= 40; n++) {
      for (let k = 1; k < n; k++) expect(estimateFromFraction(k / n, n).chapter).toBe(k + 1);
    }
  });
});

describe("estimateFromFraction", () => {
  it("rounds percent to one decimal place", () => {
    expect(estimateFromFraction(1 / 3, 9).percent).toBe(33.3);
  });
});

describe("parseDuration", () => {
  it("reads the ways people type audiobook times", () => {
    expect(parseDuration("3h 42m")).toBe(222);
    expect(parseDuration("3h42m")).toBe(222);
    expect(parseDuration("3 hours 42 minutes")).toBe(222);
    expect(parseDuration("3h")).toBe(180);
    expect(parseDuration("42m")).toBe(42);
    expect(parseDuration("42 min")).toBe(42);
    expect(parseDuration("3:42")).toBe(222);
    expect(parseDuration("3:42:59")).toBe(222);
    expect(parseDuration("222")).toBe(222);
    expect(parseDuration(" 3H 42M ")).toBe(222);
  });

  it("rejects things that aren't times", () => {
    for (const bad of ["", "soon", "3:75", "h", "3.5h", "-2m"]) expect(parseDuration(bad)).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats minutes like an audiobook app", () => {
    expect(formatDuration(222)).toBe("3h 42m");
    expect(formatDuration(42)).toBe("42m");
    expect(formatDuration(180)).toBe("3h 0m");
  });
});
