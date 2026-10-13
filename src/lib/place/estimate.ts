/**
 * "Find my place" (VISION §5.5): turn a page, an audiobook time, or a percentage into
 * a chapter. Every input becomes a position through the book, then a chapter.
 *
 * Chapters vary in length and we don't know their real lengths, so these are
 * estimates. That's why results include the chapters on either side for the reader
 * to choose from.
 */

export type Estimate = {
  /** The chapter the position falls in (1-based). */
  chapter: number;
  /** How far through the whole book, 0–100, one decimal place. */
  percent: number;
  /** The best guess plus its neighbours, for the reader to pick from. */
  candidates: number[];
};

export type Calibration = { chapter: number; page: number };

/** Position as a fraction of the book (0–1) → chapter, assuming equal-length chapters. */
export function estimateFromFraction(fraction: number, totalChapters: number): Estimate {
  const f = clamp(fraction, 0, 1);
  return fromPosition(f * totalChapters, totalChapters, f * 100);
}

export function estimateFromPercent(percent: number, totalChapters: number): Estimate {
  return estimateFromFraction(percent / 100, totalChapters);
}

/**
 * Page → chapter. Without a calibration point, page ÷ total pages. With one ("chapter
 * 12 starts on page 187"), the book is split there: chapters 1–11 are spread over
 * pages 1–186 and chapters 12–N over pages 187–end, which absorbs front matter and
 * uneven halves much better.
 */
export function estimateFromPage(
  page: number,
  totalPages: number,
  totalChapters: number,
  calibration?: Calibration | null,
): Estimate {
  const p = clamp(page, 1, totalPages);
  const percent = (p / totalPages) * 100;
  const usable =
    calibration &&
    calibration.chapter >= 1 &&
    calibration.chapter <= totalChapters &&
    calibration.page >= 1 &&
    calibration.page <= totalPages;

  if (!usable) return fromPosition((p / totalPages) * totalChapters, totalChapters, percent);

  const { chapter: c, page: start } = calibration;
  const position =
    p < start
      ? (c - 1) * ((p - 1) / Math.max(1, start - 1))
      : c - 1 + (totalChapters - c + 1) * ((p - start) / (totalPages - start + 1));
  return fromPosition(position, totalChapters, percent);
}

/** Audiobook time → chapter, from how far through the total length you are. */
export function estimateFromTime(minutes: number, totalMinutes: number, totalChapters: number): Estimate {
  return estimateFromFraction(minutes / totalMinutes, totalChapters);
}

/**
 * Reads audiobook times the way people type them: "3h 42m", "3h", "42m", "3:42",
 * "3:42:10", or plain minutes ("222"). Returns whole minutes, or null if unreadable.
 */
export function parseDuration(input: string): number | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  const clock = text.match(/^(\d+):([0-5]\d)(?::([0-5]\d))?$/);
  // "3:42" is hours:minutes; "3:42:10" adds seconds, which we drop.
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

  const units = text.match(/^(?:(\d+)\s*h(?:ours?|rs?)?)?\s*(?:(\d+)\s*m(?:in(?:utes?|s)?)?)?$/);
  if (units && (units[1] || units[2])) return Number(units[1] ?? 0) * 60 + Number(units[2] ?? 0);

  if (/^\d+$/.test(text)) return Number(text);
  return null;
}

/** 222 → "3h 42m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** `position` = chapters' worth of book read so far, e.g. 12.4 = 40% into chapter 13. */
function fromPosition(position: number, totalChapters: number, percent: number): Estimate {
  // The tiny nudge stops floating-point error (10 computed as 9.9999999) from putting
  // an exact chapter boundary in the previous chapter.
  const chapter = clamp(Math.floor(position + 1e-9) + 1, 1, totalChapters);
  const candidates = [chapter - 1, chapter, chapter + 1].filter((n) => n >= 1 && n <= totalChapters);
  return { chapter, percent: Math.round(clamp(percent, 0, 100) * 10) / 10, candidates };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
