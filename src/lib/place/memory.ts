/**
 * "Last thing I remember" → chapter, using the reader's own notes (VISION §5.5: notes
 * are searched first, and they're the most trustworthy source). Plain keyword overlap:
 * no AI, no network, and it works for any book.
 */

const STOP_WORDS = new Set(
  (
    "the and but for with that this then than they them their there was were are has had have " +
    "his her him she he its it's into onto from out off over just about after before when what " +
    "who whom which while where why how all any some one two not did does done got get gets going " +
    "went goes very really also only even still back again finally like you your i'm we our " +
    "chapter chapters remember think last thing happened happens"
  ).split(" "),
);

/** Meaningful words, lowercased: "Alice ran away with @Bob!" → ["alice", "ran", "away", "bob"]. */
export function keywords(text: string): string[] {
  const words = text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
  const kept = words
    .map((word) => word.replace(/^'+|'+$/g, "").replace(/'s$/, ""))
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
    .map(stem);
  return [...new Set(kept)];
}

// Just enough stemming that "kills" matches "killed" and "killing".
function stem(word: string): string {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export type NoteForSearch = { chapter: number | null; body: string };
export type MemoryMatch = { chapter: number; score: number };

/**
 * Chapters whose notes best match what the reader remembers, best first (at most
 * `limit`). Score = the share of the memory's keywords found in the chapter's best
 * note. On a tie the later chapter wins, since "the last thing I remember" is more
 * likely to be recent.
 */
export function matchNotes(memory: string, notes: NoteForSearch[], totalChapters: number, limit = 3): MemoryMatch[] {
  const wanted = keywords(memory);
  if (wanted.length === 0) return [];

  const best = new Map<number, number>();
  for (const note of notes) {
    if (note.chapter === null || note.chapter < 1 || note.chapter > totalChapters) continue;
    const have = new Set(keywords(note.body));
    const hits = wanted.filter((word) => have.has(word)).length;
    if (hits === 0) continue;
    const score = hits / wanted.length;
    best.set(note.chapter, Math.max(best.get(note.chapter) ?? 0, score));
  }

  return [...best.entries()]
    .map(([chapter, score]) => ({ chapter, score }))
    .sort((a, b) => b.score - a.score || b.chapter - a.chapter)
    .slice(0, limit);
}
