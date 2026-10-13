"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getBook, getEdition } from "@/lib/books/catalog";
import { normalizeIsbn } from "@/lib/books/isbn";
import { isWorkKey } from "@/lib/books/open-library";
import { MAX_FINAL_THOUGHTS } from "@/lib/library/format";
import { MAX_CHAPTER, MAX_NOTE_LENGTH, parseChapter } from "@/lib/library/notes";
import { isUuid } from "@/lib/library/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; message?: string };


/**
 * Adds a book to the reader's library and opens it.
 *
 * The form only sends an Open Library work key (and maybe an ISBN). We look the book
 * up ourselves rather than trusting a title from the browser, because the `books`
 * table is shared — a tampered form must not be able to rename a book for everyone.
 */
export async function addBook(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await getCurrentUser();
  const workKey = String(formData.get("workKey") ?? "");
  const isbn = normalizeIsbn(String(formData.get("isbn") ?? ""));
  if (!isWorkKey(workKey)) return { error: "That doesn't look like a book we can add." };

  let book, edition;
  try {
    [book, edition] = await Promise.all([getBook(workKey), isbn ? getEdition(isbn) : null]);
  } catch (error) {
    console.error("Open Library lookup failed", error);
    return { error: "Open Library isn't responding. Please try again in a moment." };
  }
  if (!book) return { error: "We couldn't find that book on Open Library anymore." };

  // The shared catalog is written with the service-role key (readers have no write access).
  const { data: bookRow, error: bookError } = await createAdminClient()
    .from("books")
    .upsert(
      {
        ol_work_key: book.workKey,
        title: book.title,
        authors: book.authors,
        cover_id: book.coverId,
        first_publish_year: book.firstPublishYear,
      },
      { onConflict: "ol_work_key" },
    )
    .select("id")
    .single();
  if (bookError) {
    console.error("Saving book failed", bookError);
    return { error: "Something went wrong adding that book. Please try again." };
  }

  // The reader's own shelf is written as the reader, so row-level security applies.
  // Upsert: adding a book you already have just reopens it.
  const supabase = await createClient();
  const { data: entry, error: entryError } = await supabase
    .from("library_entries")
    .upsert(
      {
        book_id: bookRow.id,
        last_opened_at: new Date().toISOString(),
        ...(isbn && { isbn, edition_cover_id: edition?.coverId ?? null }),
      },
      { onConflict: "user_id,book_id" },
    )
    .select("id")
    .single();
  if (entryError) {
    console.error("Saving library entry failed", entryError);
    return { error: "Something went wrong adding that book. Please try again." };
  }

  redirect(`/books/${entry.id}`);
}

/**
 * Bumps the book to the top of the library. Called from the browser once the book
 * page is actually showing — not while rendering it — because Next.js prefetches
 * pages for links on screen, and a prefetch shouldn't count as opening the book.
 */
export async function markOpened(entryId: string): Promise<void> {
  if (!isUuid(entryId)) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("library_entries")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", entryId);
  if (error) console.error("markOpened failed", error);
}

export async function saveReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const entryId = String(formData.get("entryId") ?? "");
  const ratingInput = String(formData.get("rating") ?? "");
  const rating = ratingInput === "" ? null : Number(ratingInput);
  const finalThoughts = String(formData.get("finalThoughts") ?? "").trim();

  if (!isUuid(entryId)) return { error: "Something went wrong. Please reload the page." };
  if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) {
    return { error: "Pick between 1 and 5 stars." };
  }
  if (finalThoughts.length > MAX_FINAL_THOUGHTS) {
    return { error: `Final thoughts can be up to ${MAX_FINAL_THOUGHTS.toLocaleString()} characters.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("library_entries")
    .update({ rating, final_thoughts: finalThoughts || null })
    .eq("id", entryId);
  if (error) {
    console.error("saveReview failed", error);
    return { error: "We couldn't save that. Please try again." };
  }
  return { message: "Saved." };
}

export type NoteState = ActionState & { body?: string; chapter?: string };

export async function addNote(_prev: NoteState, formData: FormData): Promise<NoteState> {
  const entryId = String(formData.get("entryId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const chapterInput = String(formData.get("chapter") ?? "");
  const chapter = parseChapter(chapterInput);
  // Echo the input back on errors, because React clears the form after every submit.
  const keep = { body, chapter: chapterInput };

  if (!isUuid(entryId)) return { error: "Something went wrong. Please reload the page." };
  if (!body) return { error: "Write something first.", ...keep };
  if (body.length > MAX_NOTE_LENGTH) {
    return { error: `Notes can be up to ${MAX_NOTE_LENGTH.toLocaleString()} characters.`, ...keep };
  }
  if (chapter === undefined) return { error: `Chapter should be a number from 1 to ${MAX_CHAPTER}.`, ...keep };

  const supabase = await createClient();
  const { error } = await supabase.from("notes").insert({ entry_id: entryId, chapter, body });
  if (error) {
    console.error("addNote failed", error);
    return { error: "We couldn't save that note. Please try again.", ...keep };
  }

  refresh();
  // Keep the chapter filled in: the next note is usually from the same chapter.
  return { message: "Note saved.", chapter: chapterInput };
}

export async function editNote(_prev: NoteState, formData: FormData): Promise<NoteState> {
  const noteId = String(formData.get("noteId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!isUuid(noteId)) return { error: "Something went wrong. Please reload the page." };
  if (!body) return { error: "A note can't be empty. Delete it instead?", body };
  if (body.length > MAX_NOTE_LENGTH) {
    return { error: `Notes can be up to ${MAX_NOTE_LENGTH.toLocaleString()} characters.`, body };
  }

  // Row-level security limits this to the reader's own notes.
  const supabase = await createClient();
  const { error } = await supabase.from("notes").update({ body }).eq("id", noteId);
  if (error) {
    console.error("editNote failed", error);
    return { error: "We couldn't save that. Please try again.", body };
  }
  refresh();
  return { message: "Saved." };
}

export async function deleteNote(formData: FormData): Promise<void> {
  const noteId = String(formData.get("noteId") ?? "");
  if (!isUuid(noteId)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) console.error("deleteNote failed", error);
  refresh();
}

export async function removeBook(formData: FormData): Promise<void> {
  const entryId = String(formData.get("entryId") ?? "");
  if (isUuid(entryId)) {
    const supabase = await createClient();
    const { error } = await supabase.from("library_entries").delete().eq("id", entryId);
    if (error) console.error("removeBook failed", error);
  }
  redirect("/");
}
