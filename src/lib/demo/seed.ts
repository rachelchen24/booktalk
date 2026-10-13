import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { numberedChapters, percentThrough, type Chapter } from "@/lib/chapters/list";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * A ready-made library for "Try the demo", so a visitor (say, a recruiter) sees the app
 * in use straight away instead of an empty shelf. Both books are public domain, so
 * their chapter titles and the notes below spoil nothing still under copyright.
 *
 * - Alice's Adventures in Wonderland: being read, spot at the end of chapter 6, notes
 *   with @tags and page/quote anchors.
 * - The Wonderful Wizard of Oz: finished and rated, so "books read this year" and the
 *   final-thoughts section have something in them. Numbered chapters only, the way a
 *   reader sets them up with "Add 24 chapters".
 */

const ALICE_CHAPTERS: Chapter[] = [
  "Down the Rabbit-Hole",
  "The Pool of Tears",
  "A Caucus-Race and a Long Tale",
  "The Rabbit Sends in a Little Bill",
  "Advice from a Caterpillar",
  "Pig and Pepper",
  "A Mad Tea-Party",
  "The Queen's Croquet-Ground",
  "The Mock Turtle's Story",
  "The Lobster Quadrille",
  "Who Stole the Tarts?",
  "Alice's Evidence",
].map((title, i) => ({ number: i + 1, title }));

const ALICE_SPOT = 6;

const ALICE_NOTES = [
  { chapter: 1, page: 2, body: "@Alice follows the @White Rabbit down a hole and falls for ages. Lands in a hall full of tiny locked doors." },
  { chapter: 2, body: "Drink me = tiny, eat me = giant. She cries a whole pool of tears, then shrinks and nearly drowns in it." },
  { chapter: 3, body: "The Caucus-race: everyone runs in circles and everybody wins. The @Dodo is in charge, obviously." },
  { chapter: 4, body: "The @White Rabbit mistakes Alice for his housemaid. She grows so big she gets stuck inside his house." },
  { chapter: 5, body: "The @Caterpillar on a mushroom. One side makes you grow, the other makes you shrink.", quote: "Who are you?" },
  { chapter: 6, body: "The @Duchess's kitchen is pure chaos (pepper everywhere). The baby turns into a pig. Met the @Cheshire Cat." },
  { chapter: null, body: "First time reading this since I was a kid. Way funnier than I remembered." },
];

const BOOKS = [
  {
    ol_work_key: "OL138052W",
    title: "Alice's Adventures in Wonderland",
    authors: ["Lewis Carroll"],
    cover_id: 10527843,
    first_publish_year: 1865,
  },
  {
    ol_work_key: "OL18417W",
    title: "The Wonderful Wizard of Oz",
    authors: ["L. Frank Baum"],
    cover_id: 552443,
    first_publish_year: 1899,
  },
];

/**
 * Fills a brand-new demo account's library. `supabase` must be signed in as that
 * account, so everything is written as the reader and row-level security applies.
 * Only the shared catalog rows are written with the admin key (readers can't).
 */
export async function seedDemoLibrary(supabase: SupabaseClient): Promise<void> {
  const { data: books, error: booksError } = await createAdminClient()
    .from("books")
    .upsert(BOOKS, { onConflict: "ol_work_key" })
    .select("id, ol_work_key");
  if (booksError) throw booksError;
  const idFor = (key: string) => books.find((b) => b.ol_work_key === key)!.id;

  const now = Date.now();
  const { data: entries, error: entriesError } = await supabase
    .from("library_entries")
    .insert([
      {
        book_id: idFor("OL138052W"),
        chapters: ALICE_CHAPTERS,
        current_chapter: ALICE_SPOT,
        current_percent: percentThrough(ALICE_SPOT, ALICE_CHAPTERS.length),
        format: "paperback",
        total_pages: 96,
        last_opened_at: new Date(now).toISOString(),
      },
      {
        book_id: idFor("OL18417W"),
        chapters: numberedChapters(24),
        current_chapter: 24,
        current_percent: 100,
        finished_at: new Date(now - 3 * 86_400_000).toISOString(),
        rating: 5,
        final_thoughts: "So much stranger than the movie. The Tin Woodman's backstory is wild.",
        last_opened_at: new Date(now - 3 * 86_400_000).toISOString(),
      },
    ])
    .select("id, book_id");
  if (entriesError) throw entriesError;

  const aliceEntry = entries.find((e) => e.book_id === idFor("OL138052W"))!.id;
  const { error: notesError } = await supabase.from("notes").insert(
    ALICE_NOTES.map((note, i) => ({
      entry_id: aliceEntry,
      chapter: note.chapter,
      body: note.body,
      page: note.page ?? null,
      quote: note.quote ?? null,
      // Spread out over the past week, in reading order.
      created_at: new Date(now - (ALICE_NOTES.length - i) * 86_400_000).toISOString(),
    })),
  );
  if (notesError) throw notesError;
}
