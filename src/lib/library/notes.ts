/** Client-safe note helpers (no database access). */
import { parseDuration } from "@/lib/place/estimate";

export const MAX_NOTE_LENGTH = 2000;
export const MAX_CHAPTER = 1000;
export const MAX_QUOTE_LENGTH = 300;

export type Note = {
  id: string;
  chapter: number | null;
  body: string;
  created_at: string;
  // Optional anchors (VISION §5.7). Optional in the type too, so a note being created
  // in the browser doesn't need them.
  page?: number | null;
  audio_minutes?: number | null;
  quote?: string | null;
};
export type ChapterGroup = { chapter: number | null; notes: Note[] };

/**
 * Groups notes by chapter for the book page: chapters in order, notes without a chapter
 * last. Within a chapter, notes go in page order like margin notes; notes without a
 * page follow, oldest first.
 */
export function groupByChapter(notes: Note[]): ChapterGroup[] {
  const groups = new Map<number | null, Note[]>();
  for (const note of notes) {
    const group = groups.get(note.chapter) ?? [];
    group.push(note);
    groups.set(note.chapter, group);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a - b))
    .map(([chapter, group]) => ({ chapter, notes: sortInChapter(group) }));
}

/** Page order first (like margin notes), then notes without a page, oldest first. */
export function sortInChapter(notes: Note[]): Note[] {
  return [...notes].sort((x, y) => {
    const px = x.page ?? Infinity;
    const py = y.page ?? Infinity;
    return px - py || x.created_at.localeCompare(y.created_at);
  });
}

export type Anchors = { page: number | null; audio_minutes: number | null; quote: string | null };
export type AnchorResult = { ok: true; anchors: Anchors } | { ok: false; error: string };

/**
 * Reads a note's optional anchors from form input: page ("212"), audiobook time
 * ("3h 42m", "3:42") and a quote snippet. Blank fields are fine; bad ones get a message.
 */
export function parseAnchors(input: { page?: string; time?: string; quote?: string }): AnchorResult {
  const pageText = (input.page ?? "").trim();
  const timeText = (input.time ?? "").trim();
  const quote = (input.quote ?? "").replace(/\s+/g, " ").trim().replace(/^["“”']+|["“”']+$/g, "").trim();

  let page: number | null = null;
  if (pageText) {
    page = Number(pageText);
    if (!Number.isInteger(page) || page < 1 || page > 20000) return { ok: false, error: "Page should be a whole number." };
  }

  let audio_minutes: number | null = null;
  if (timeText) {
    audio_minutes = parseDuration(timeText);
    if (audio_minutes === null) return { ok: false, error: "Try a time like 3h 42m or 3:42." };
  }

  if (quote.length > MAX_QUOTE_LENGTH) {
    return { ok: false, error: `Quotes can be up to ${MAX_QUOTE_LENGTH} characters. A few words is enough to find the spot.` };
  }
  return { ok: true, anchors: { page, audio_minutes, quote: quote || null } };
}

/** "", "  " → null; "12" → 12; anything else → undefined (invalid). */
export function parseChapter(input: string): number | null | undefined {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const chapter = Number(trimmed);
  return chapter >= 1 && chapter <= MAX_CHAPTER ? chapter : undefined;
}
