/** Chapter lists: validation, defaults, and spot math. Pure, so it's safe anywhere and easy to test. */

export const MAX_CHAPTERS = 1000;
export const MAX_TITLE_LENGTH = 200;

export type Chapter = { number: number; title: string };

/** "Munchkinlanders" or, for an untitled chapter, "Chapter 3". */
export function chapterName(chapter: Chapter): string {
  return chapter.title || `Chapter ${chapter.number}`;
}

/** "My book has 30 chapters" → Chapter 1…30, untitled. */
export function numberedChapters(count: number): Chapter[] {
  return Array.from({ length: count }, (_, i) => ({ number: i + 1, title: "" }));
}

export type ParseResult = { ok: true; chapters: Chapter[] } | { ok: false; error: string };

/**
 * Turns untrusted input (a form, an AI reply, stored JSON) into a clean list:
 * titles trimmed, numbered 1…N in order. Numbering is always ours, so a gap or a
 * duplicate can't sneak in and confuse page/percent math later.
 */
export function parseChapters(input: unknown): ParseResult {
  if (!Array.isArray(input)) return { ok: false, error: "Chapters must be a list." };
  if (input.length === 0) return { ok: false, error: "Add at least one chapter." };
  if (input.length > MAX_CHAPTERS) return { ok: false, error: `A book can have up to ${MAX_CHAPTERS} chapters.` };

  const chapters: Chapter[] = [];
  for (const item of input) {
    const raw = typeof item === "string" ? item : (item as { title?: unknown } | null)?.title;
    if (raw != null && typeof raw !== "string") return { ok: false, error: "Chapter titles must be text." };
    const title = (raw ?? "").replace(/\s+/g, " ").trim();
    if (title.length > MAX_TITLE_LENGTH) {
      return { ok: false, error: `Chapter titles can be up to ${MAX_TITLE_LENGTH} characters.` };
    }
    chapters.push({ number: chapters.length + 1, title });
  }
  return { ok: true, chapters };
}

/**
 * The chapter list that applies to a reader: their own copy if they have one, else the
 * shared suggestion they picked, else none. Stored JSON is re-validated on the way out.
 */
export function resolveChapters(own: unknown, suggestion: { chapters: unknown } | null): Chapter[] | null {
  for (const candidate of [own, suggestion?.chapters]) {
    if (candidate == null) continue;
    const parsed = parseChapters(candidate);
    if (parsed.ok) return parsed.chapters;
  }
  return null;
}

/** How far through the book you are after finishing `chapter` (one decimal place). */
export function percentThrough(chapter: number, totalChapters: number): number {
  if (totalChapters < 1) return 0;
  const clamped = Math.min(Math.max(chapter, 0), totalChapters);
  return Math.round((clamped / totalChapters) * 1000) / 10;
}

/**
 * When a book counts as finished after the reader moves their spot: reaching 100%
 * finishes it (keeping the original date if it was already finished), and moving back
 * un-finishes it. Percent, not "on the last chapter", because a spot found by page or
 * time can be partway through the last chapter.
 */
export function finishedAtAfterSpot(
  percent: number | null,
  previous: string | null,
  now: Date = new Date(),
): string | null {
  if (percent === null || percent < 100) return null;
  return previous ?? now.toISOString();
}
