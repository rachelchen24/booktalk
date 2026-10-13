import "server-only";
import { getTocChapters } from "@/lib/books/catalog";
import type { Book } from "@/lib/library/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { suggestChaptersWithAi } from "./ai";
import { parseChapters, type Chapter } from "./list";

export type SuggestionSource = "open_library" | "ai";
export type Suggestion = { id: string; source: SuggestionSource; chapters: Chapter[] };

/**
 * Shared chapter-list suggestions for a book (VISION §5.4: suggestions shared, edits
 * private). Each source is asked at most once per book; the result is stored and
 * offered to every reader after that.
 */
export async function getSuggestions(bookId: string): Promise<Suggestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chapter_suggestions")
    .select("id, source, chapters")
    .eq("book_id", bookId);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const parsed = parseChapters(row.chapters);
    return parsed.ok ? [{ id: row.id, source: row.source as SuggestionSource, chapters: parsed.chapters }] : [];
  });
}

/** Looks for a usable Open Library table of contents (free), storing it if found. */
export async function ensureOpenLibrarySuggestion(book: Book): Promise<void> {
  let chapters: Chapter[] | null;
  try {
    chapters = await getTocChapters(book.ol_work_key);
  } catch (error) {
    console.error("Open Library table-of-contents lookup failed", error);
    return;
  }
  if (chapters) await store(book.id, "open_library", chapters);
}

/** Asks the AI (costs money, so only when a reader clicks). True if a list was stored. */
export async function requestAiSuggestion(book: Book): Promise<boolean> {
  const chapters = await suggestChaptersWithAi({
    title: book.title,
    authors: book.authors,
    firstPublishYear: book.first_publish_year,
  });
  return chapters ? store(book.id, "ai", chapters) : false;
}

// Written with the service-role key: readers can't write shared suggestions themselves.
// ignoreDuplicates: if two readers trigger the same lookup at once, the first one wins.
async function store(bookId: string, source: SuggestionSource, chapters: Chapter[]): Promise<boolean> {
  const { error } = await createAdminClient()
    .from("chapter_suggestions")
    .upsert({ book_id: bookId, source, chapters }, { onConflict: "book_id,source", ignoreDuplicates: true });
  if (error) {
    console.error("Storing chapter suggestion failed", error);
    return false;
  }
  return true;
}
