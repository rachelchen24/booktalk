import "server-only";
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
  book: Book;
};

const ENTRY_COLUMNS =
  "id, isbn, edition_cover_id, current_chapter, current_percent, rating, final_thoughts, last_opened_at, " +
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

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
