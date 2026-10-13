/** Client-safe note helpers (no database access). */

export const MAX_NOTE_LENGTH = 2000;
export const MAX_CHAPTER = 1000;

export type Note = { id: string; chapter: number | null; body: string; created_at: string };
export type ChapterGroup = { chapter: number | null; notes: Note[] };

/**
 * Groups notes by chapter for the book page: chapters in order, oldest note first
 * within each (like margin notes), and notes without a chapter last.
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
    .map(([chapter, group]) => ({
      chapter,
      notes: group.sort((x, y) => x.created_at.localeCompare(y.created_at)),
    }));
}

/** "", "  " → null; "12" → 12; anything else → undefined (invalid). */
export function parseChapter(input: string): number | null | undefined {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const chapter = Number(trimmed);
  return chapter >= 1 && chapter <= MAX_CHAPTER ? chapter : undefined;
}
