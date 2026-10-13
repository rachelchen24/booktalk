import "server-only";
import type { Note } from "@/lib/library/notes";
import { createClient } from "@/lib/supabase/server";

export type Book = {
  id: string;
  ol_work_key: string;
  title: string;
  authors: string[];
  cover_id: number | null;
  first_publish_year: number | null;
};

export type LibraryEntry = {
  id: string;
  isbn: string | null;
  edition_cover_id: number | null;
  current_chapter: number | null;
  current_percent: number | null;
  rating: number | null;
  final_thoughts: string | null;
  last_opened_at: string;
  finished_at: string | null;
  // Chapter list: the reader's own copy, or a pointer to a shared suggestion (VISION §5.4).
  chapters: unknown;
  chapter_suggestion_id: string | null;
  suggestion: { chapters: unknown } | null;
  // Edition details (VISION §5.3).
  publisher: string | null;
  format: EditionFormat | null;
  total_pages: number | null;
  calibration_chapter: number | null;
  calibration_page: number | null;
  audiobook_minutes: number | null;
  book: Book;
};

export type EditionFormat = "hardcover" | "paperback" | "mass_market" | "ebook" | "audiobook" | "other";

const ENTRY_COLUMNS =
  "id, isbn, edition_cover_id, current_chapter, current_percent, rating, final_thoughts, last_opened_at, finished_at, " +
  "chapters, chapter_suggestion_id, publisher, format, total_pages, calibration_chapter, calibration_page, audiobook_minutes, " +
  "suggestion:chapter_suggestions (chapters), " +
  "book:books (id, ol_work_key, title, authors, cover_id, first_publish_year)";

// These run as the logged-in reader, so row-level security already limits them to
// that reader's rows — no "where user_id = …" needed (or trusted).

/** The reader's books, most recently opened first. */
export async function getLibrary(): Promise<LibraryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_entries")
    .select(ENTRY_COLUMNS)
    .order("last_opened_at", { ascending: false });
  if (error) throw error;
  return data as unknown as LibraryEntry[];
}

/** One of the reader's entries, or null if it doesn't exist or isn't theirs. */
export async function getEntry(id: string): Promise<LibraryEntry | null> {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("library_entries").select(ENTRY_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as LibraryEntry | null;
}

/** Open Library work key → entry id, for marking search results already on the shelf. */
export async function getShelvedWorkKeys(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("library_entries").select("id, book:books (ol_work_key)");
  if (error) throw error;
  const rows = data as unknown as { id: string; book: { ol_work_key: string } }[];
  return new Map(rows.map((row) => [row.book.ol_work_key, row.id]));
}

/** The reader's notes for one book. */
export async function getNotes(entryId: string): Promise<Note[]> {
  if (!isUuid(entryId)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, chapter, body, created_at")
    .eq("entry_id", entryId)
    .order("created_at");
  if (error) throw error;
  return data as Note[];
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
