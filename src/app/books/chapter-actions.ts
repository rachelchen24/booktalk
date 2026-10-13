"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { isAiConfigured } from "@/lib/ai/client";
import { finishedAtAfterSpot, parseChapters, percentThrough, resolveChapters } from "@/lib/chapters/list";
import { requestAiSuggestion } from "@/lib/chapters/suggestions";
import { parseChapter } from "@/lib/library/notes";
import { getEntry, isUuid, type EditionFormat } from "@/lib/library/queries";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./actions";

/** Start using a shared suggestion as-is (no private copy yet). */
export async function chooseSuggestion(formData: FormData): Promise<void> {
  const entryId = String(formData.get("entryId") ?? "");
  const suggestionId = String(formData.get("suggestionId") ?? "");
  if (!isUuid(entryId) || !isUuid(suggestionId)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("library_entries")
    .update({ chapter_suggestion_id: suggestionId, chapters: null })
    .eq("id", entryId);
  if (error) console.error("chooseSuggestion failed", error);
  refresh();
}

export async function suggestWithAi(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const entry = await getEntry(String(formData.get("entryId") ?? ""));
  if (!entry) return { error: "Something went wrong. Please reload the page." };
  if (!isAiConfigured()) return { error: "AI suggestions aren't set up." };

  const found = await requestAiSuggestion(entry.book);
  if (!found) {
    return { error: "BookTalk doesn't know this book's chapters well enough to suggest them. You can add them yourself." };
  }
  refresh();
  return {};
}

/**
 * Saves the reader's own chapter list. This is the "edits are private" half of
 * VISION §5.4: it's written to their own entry, never to the shared suggestion.
 */
export async function saveChapters(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const entryId = String(formData.get("entryId") ?? "");
  const entry = await getEntry(entryId);
  if (!entry) return { error: "Something went wrong. Please reload the page." };

  const parsed = parseChapters(formData.getAll("title").map(String));
  if (!parsed.ok) return { error: parsed.error };
  const total = parsed.chapters.length;

  // If the list got shorter than the reader's spot, keep the spot inside the book.
  const spot = entry.current_chapter === null ? null : Math.min(entry.current_chapter, total);

  const supabase = await createClient();
  const { error } = await supabase
    .from("library_entries")
    .update({
      chapters: parsed.chapters,
      chapter_suggestion_id: null,
      current_chapter: spot,
      current_percent: spot === null ? null : percentThrough(spot, total),
      finished_at: finishedAtAfterSpot(spot === null ? null : percentThrough(spot, total), entry.finished_at),
    })
    .eq("id", entry.id);
  if (error) {
    console.error("saveChapters failed", error);
    return { error: "We couldn't save your chapters. Please try again." };
  }
  redirect(`/books/${entry.id}`);
}

/** One tap: "I've read up to here." */
export async function markSpot(formData: FormData): Promise<void> {
  const entry = await getEntry(String(formData.get("entryId") ?? ""));
  const chapter = Number(formData.get("chapter"));
  if (!entry) return;

  // The chapter count comes from the server's copy of the list, not from the form.
  const chapters = resolveChapters(entry.chapters, entry.suggestion);
  if (!chapters || !Number.isInteger(chapter) || chapter < 1 || chapter > chapters.length) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("library_entries")
    .update({
      current_chapter: chapter,
      current_percent: percentThrough(chapter, chapters.length),
      finished_at: finishedAtAfterSpot(percentThrough(chapter, chapters.length), entry.finished_at),
      last_opened_at: new Date().toISOString(),
    })
    .eq("id", entry.id);
  if (error) console.error("markSpot failed", error);
  refresh();
}

/** Puts a note in a chapter (for notes saved before the book had a chapter list). */
export async function moveNote(formData: FormData): Promise<void> {
  const noteId = String(formData.get("noteId") ?? "");
  const chapter = parseChapter(String(formData.get("chapter") ?? ""));
  if (!isUuid(noteId) || chapter === undefined) return;

  const supabase = await createClient();
  const { error } = await supabase.from("notes").update({ chapter }).eq("id", noteId);
  if (error) console.error("moveNote failed", error);
  refresh();
}

const FORMATS: EditionFormat[] = ["hardcover", "paperback", "mass_market", "ebook", "audiobook", "other"];

export async function saveEdition(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const entryId = String(formData.get("entryId") ?? "");
  if (!isUuid(entryId)) return { error: "Something went wrong. Please reload the page." };

  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const whole = (name: string, max: number): number | null | undefined => {
    const value = text(name);
    if (value === "") return null;
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= max ? n : undefined;
  };

  const publisher = text("publisher").slice(0, 200) || null;
  const format = text("format") === "" ? null : (text("format") as EditionFormat);
  const totalPages = whole("totalPages", 20000);
  const calibrationChapter = whole("calibrationChapter", 1000);
  const calibrationPage = whole("calibrationPage", 20000);

  if (format !== null && !FORMATS.includes(format)) return { error: "Pick a format from the list." };
  if (totalPages === undefined) return { error: "Total pages should be a whole number." };
  if (calibrationChapter === undefined || calibrationPage === undefined) {
    return { error: "Chapter and page should be whole numbers." };
  }
  if ((calibrationChapter === null) !== (calibrationPage === null)) {
    return { error: "Fill in both the chapter and the page it starts on, or neither." };
  }
  if (totalPages !== null && calibrationPage !== null && calibrationPage > totalPages) {
    return { error: "That page is past the end of the book." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("library_entries")
    .update({
      publisher,
      format,
      total_pages: totalPages,
      calibration_chapter: calibrationChapter,
      calibration_page: calibrationPage,
    })
    .eq("id", entryId);
  if (error) {
    console.error("saveEdition failed", error);
    return { error: "We couldn't save that. Please try again." };
  }
  return { message: "Saved." };
}
