"use server";

import { redirect } from "next/navigation";
import { finishedAtAfterSpot, percentThrough, resolveChapters } from "@/lib/chapters/list";
import { findChaptersByMemory } from "@/lib/place/ai-memory";
import { matchNotes } from "@/lib/place/memory";
import { getEntry, getNotes } from "@/lib/library/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * Saves the spot the reader picked in "Find my place". The chapter is checked against
 * the server's copy of their list; the percent is the estimate shown to them (page or
 * time based), falling back to the end of that chapter.
 */
export async function setSpot(formData: FormData): Promise<void> {
  const entry = await getEntry(String(formData.get("entryId") ?? ""));
  if (!entry) redirect("/");
  const chapters = resolveChapters(entry.chapters, entry.suggestion);
  const chapter = Number(formData.get("chapter"));
  if (!chapters || !Number.isInteger(chapter) || chapter < 1 || chapter > chapters.length) {
    redirect(`/books/${entry.id}`);
  }

  const percentInput = Number(formData.get("percent"));
  const percent = Number.isFinite(percentInput) && String(formData.get("percent") ?? "") !== ""
    ? Math.round(Math.min(100, Math.max(0, percentInput)) * 10) / 10
    : percentThrough(chapter, chapters.length);

  // Remember the book's length for next time, if the reader gave it.
  const totalPages = wholeNumber(formData.get("totalPages"), 20000);
  const audiobookMinutes = wholeNumber(formData.get("audiobookMinutes"), 60000);

  const supabase = await createClient();
  const { error } = await supabase
    .from("library_entries")
    .update({
      current_chapter: chapter,
      current_percent: percent,
      finished_at: finishedAtAfterSpot(percent, entry.finished_at),
      last_opened_at: new Date().toISOString(),
      ...(totalPages && { total_pages: totalPages }),
      ...(audiobookMinutes && { audiobook_minutes: audiobookMinutes }),
    })
    .eq("id", entry.id);
  if (error) console.error("setSpot failed", error);
  redirect(`/books/${entry.id}`);
}

export type MemoryState = {
  error?: string;
  /** Chapter numbers only (never event descriptions), best first. */
  chapters?: number[];
  source?: "notes" | "ai";
  memory?: string;
};

/** "Last thing I remember": the reader's notes first, then (if set up) the AI. */
export async function findByMemory(_prev: MemoryState, formData: FormData): Promise<MemoryState> {
  const memory = String(formData.get("memory") ?? "").trim().slice(0, 500);
  const entryId = String(formData.get("entryId") ?? "");
  if (!memory) return { error: "Type the last thing you remember." };

  const [entry, notes] = await Promise.all([getEntry(entryId), getNotes(entryId)]);
  if (!entry) return { error: "Something went wrong. Please reload the page.", memory };
  const chapters = resolveChapters(entry.chapters, entry.suggestion);
  if (!chapters) return { error: "Set up your chapters first.", memory };

  const fromNotes = matchNotes(memory, notes, chapters.length);
  if (fromNotes.length > 0) {
    return { chapters: fromNotes.map((match) => match.chapter), source: "notes", memory };
  }

  const fromAi = await findChaptersByMemory(entry.book, chapters, memory);
  if (fromAi.length > 0) return { chapters: fromAi, source: "ai", memory };

  return {
    error: "Couldn't find that in your notes. Try different words, or find your place another way.",
    memory,
  };
}

function wholeNumber(value: FormDataEntryValue | null, max: number): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
}
