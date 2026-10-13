/**
 * What a recap is allowed to cover (VISION §4.1 "Never spoil", §5.6). Pure functions,
 * so the spoiler rules are tested directly.
 */
import { chapterName, percentThrough, type Chapter } from "@/lib/chapters/list";
import type { Note } from "@/lib/library/notes";

export type RecapScope = {
  /** Recap chapters 1…through. 0 means nothing has been finished yet. */
  through: number;
  /** The chapter the reader is partway into, if any. Never summarized. */
  partwayInto: number | null;
};

/**
 * A spot at the end of a chapter (tapped in the list, or picked by chapter) recaps
 * through that chapter. A spot found by page, audiobook time or percentage is partway
 * through its chapter, so the recap covers only the chapters before it: we don't know
 * how much of that chapter they've read, so we say less.
 *
 * Tapping a chapter saves exactly percentThrough(chapter), so that's the "end of
 * chapter" signal. Page and time spots save the reader's real position
 * (current ÷ total), which almost never lands on that exact value. Comparing with
 * "≥ end of chapter" instead would be wrong: chapter lengths vary, so a real page
 * percentage can pass the equal-chapters boundary while the reader is still mid-chapter.
 */
export function recapScope(
  currentChapter: number | null,
  currentPercent: number | null,
  totalChapters: number,
): RecapScope {
  if (currentChapter === null || totalChapters < 1) return { through: 0, partwayInto: null };
  const chapter = Math.min(currentChapter, totalChapters);
  const endOfChapter = percentThrough(chapter, totalChapters);
  // A small tolerance for rounding: percentThrough rounds to one decimal place.
  const atEnd = currentPercent === null || currentPercent >= 100 || Math.abs(currentPercent - endOfChapter) < 0.05;
  return atEnd ? { through: chapter, partwayInto: null } : { through: chapter - 1, partwayInto: chapter };
}

/** Only notes from chapters the recap covers. Notes from later chapters are never used. */
export function notesInScope(notes: Note[], through: number): Note[] {
  return notes
    .filter((note) => note.chapter !== null && note.chapter >= 1 && note.chapter <= through)
    .sort((a, b) => (a.chapter! - b.chapter!) || a.created_at.localeCompare(b.created_at));
}

/** Only chapter titles the reader has reached. A later chapter's title can be a spoiler. */
export function chaptersInScope(chapters: Chapter[], through: number): Chapter[] {
  return chapters.slice(0, Math.max(0, through));
}

export type RecapInput = {
  title: string;
  authors: string[];
  through: number;
  totalChapters: number;
  chapters: Chapter[];
  notes: Note[];
};

/**
 * The text the AI sees: the book, the chapters read so far, and the reader's notes from
 * those chapters. Built here (not inline in the API call) so tests can check that
 * nothing past the reader's spot ever gets in.
 */
export function recapPromptInput(input: RecapInput): string {
  const chapters = chaptersInScope(input.chapters, input.through);
  const notes = notesInScope(input.notes, input.through);
  const lines = [
    `Book: ${input.title}${input.authors.length ? ` by ${input.authors.join(", ")}` : ""}`,
    `The reader has finished chapter ${input.through} of ${input.totalChapters}.`,
    "",
    "Chapters read so far:",
    ...chapters.map((c) => `${c.number}. ${chapterName(c)}`),
  ];
  if (notes.length > 0) {
    lines.push("", "The reader's own notes (treat these as true, even where they differ from what you know):");
    for (const note of notes) lines.push(`- Chapter ${note.chapter}: ${note.body}`);
  } else {
    lines.push("", "The reader hasn't left any notes.");
  }
  return lines.join("\n");
}
