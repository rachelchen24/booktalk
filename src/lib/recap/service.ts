import "server-only";
import { createHash } from "node:crypto";
import { AI_MODEL } from "@/lib/ai/client";
import { resolveChapters, type Chapter } from "@/lib/chapters/list";
import { getEntry, getNotes, type LibraryEntry } from "@/lib/library/queries";
import type { Note } from "@/lib/library/notes";
import { createClient } from "@/lib/supabase/server";
import { writeDetailRecap, writeShortRecap, type DetailRecap, type ShortRecap } from "./ai";
import { notesInScope, recapPromptInput, recapScope, type RecapScope } from "./scope";

export type RecapLevel = "short" | "detail";

export type RecapContext = {
  entry: LibraryEntry;
  chapters: Chapter[];
  scope: RecapScope;
  /** The reader's notes from the chapters being recapped (never later ones). */
  notes: Note[];
  /** Exactly what the AI would see. */
  promptInput: string;
};

/**
 * Everything a recap is based on. "no-chapters" if the book exists but has no chapter
 * list yet; null if there's no such book (or it's someone else's).
 */
export async function loadRecapContext(entryId: string): Promise<RecapContext | "no-chapters" | null> {
  const [entry, allNotes] = await Promise.all([getEntry(entryId), getNotes(entryId)]);
  if (!entry) return null;
  const chapters = resolveChapters(entry.chapters, entry.suggestion);
  if (!chapters) return "no-chapters";

  const scope = recapScope(entry.current_chapter, entry.current_percent, chapters.length);
  const notes = notesInScope(allNotes, scope.through);
  const promptInput = recapPromptInput({
    title: entry.book.title,
    authors: entry.book.authors,
    through: scope.through,
    totalChapters: chapters.length,
    chapters,
    notes: allNotes,
  });
  return { entry, chapters, scope, notes, promptInput };
}

/**
 * A saved recap is reused only if it was written from exactly the same input: same spot,
 * same notes, same chapter titles, same model. Hashing the AI's input captures all of that.
 */
export function fingerprint(level: RecapLevel, promptInput: string): string {
  return createHash("sha256").update(`${level}\n${AI_MODEL}\n${promptInput}`).digest("hex");
}

export async function getSavedRecap<L extends RecapLevel>(
  context: RecapContext,
  level: L,
): Promise<(L extends "short" ? ShortRecap : DetailRecap) | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recaps")
    .select("content, fingerprint")
    .eq("entry_id", context.entry.id)
    .eq("level", level)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.fingerprint !== fingerprint(level, context.promptInput)) return null;
  return data.content;
}

/** Writes a fresh recap with the AI and saves it. Returns false if it couldn't. */
export async function writeAndSaveRecap(context: RecapContext, level: RecapLevel): Promise<boolean> {
  if (context.scope.through < 1) return false;
  const content =
    level === "short" ? await writeShortRecap(context.promptInput) : await writeDetailRecap(context.promptInput);
  if (!content) return false;

  const supabase = await createClient();
  const { error } = await supabase.from("recaps").upsert(
    {
      entry_id: context.entry.id,
      level,
      through: context.scope.through,
      fingerprint: fingerprint(level, context.promptInput),
      content,
      created_at: new Date().toISOString(),
    },
    { onConflict: "entry_id,level" },
  );
  if (error) {
    console.error("Saving recap failed", error);
    return false;
  }
  return true;
}
