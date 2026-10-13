import type { Chapter } from "./list";

/** One entry of an Open Library edition's `table_of_contents`. */
export type TocItem = { level?: number; label?: string; title?: string; pagenum?: string };

// Front and back matter: real parts of the book, but not chapters you'd mark as your spot.
const NOT_A_CHAPTER =
  /^(contents|table of contents|acknowledge?ments?|index|about the authors?|copyright|dedication|also by|praise for|title page|notes|bibliography|glossary|reading group guide)\b/i;

const CHAPTER_PREFIX =
  /^(chapter|ch\.)\s*(\d+|[ivxlc]+|one|two|three|four|five|six|seven|eight|nine|ten)\b\s*[.:—–-]*\s*/i;

/**
 * Turns an Open Library table of contents into a chapter list, or null if it isn't
 * trustworthy. Open Library data is crowd-sourced and often messy (volume labels
 * like "v.1.", tables in other languages), and a wrong chapter list is worse than
 * none, so we're strict.
 */
export function tocToChapters(toc: TocItem[] | undefined, minChapters = 3): Chapter[] | null {
  if (!Array.isArray(toc)) return null;

  const entries = toc
    .map((item) => tidy(item.title || item.label || ""))
    .filter((entry) => entry && !NOT_A_CHAPTER.test(entry));

  if (entries.length < minChapters) return null;
  if (entries.some(looksLikeJunk)) return null;
  // Our readers and recaps are English-first; a table in another script is likely a translation.
  const latin = entries.filter((entry) => /^[\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]+$/u.test(entry));
  if (latin.length / entries.length < 0.8) return null;

  // "Chapter 3: The Wizard" → "The Wizard"; a bare "Chapter 3" stays as an untitled chapter.
  return entries.map((entry, i) => ({ number: i + 1, title: entry.replace(CHAPTER_PREFIX, "") }));
}

function tidy(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "");
}

function looksLikeJunk(entry: string): boolean {
  return /^v\.\s*\d|^\d{3}-\d{2}\b|--/.test(entry) || entry.length > 200;
}
