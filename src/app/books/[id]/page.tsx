import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Cover } from "@/components/books/Cover";
import { authorsLabel, spotLabel } from "@/lib/library/format";
import { ChapterSection } from "@/components/chapters/ChapterSection";
import { ChapterSetup } from "@/components/chapters/ChapterSetup";
import { isAiConfigured } from "@/lib/ai/client";
import { resolveChapters } from "@/lib/chapters/list";
import { ensureOpenLibrarySuggestion, getSuggestions, type Suggestion } from "@/lib/chapters/suggestions";
import type { Note } from "@/lib/library/notes";
import { getEntry, getNotes } from "@/lib/library/queries";
import { MarkOpened } from "./MarkOpened";
import { NotesByChapter } from "./NotesByChapter";
import { QuickNoteBox } from "./QuickNoteBox";
import { RemoveButton } from "./RemoveButton";
import { ReviewForm } from "./ReviewForm";

export default function BookPage({ params }: PageProps<"/books/[id]">) {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link href="/" className="text-sm text-muted underline-offset-4 hover:underline">
          ← Your library
        </Link>
        <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-2xl bg-border/40" />}>
          <BookDetails params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function BookDetails({ params }: Pick<PageProps<"/books/[id]">, "params">) {
  const { id } = await params;
  // Row-level security means another reader's entry comes back as null, same as a missing one.
  const [entry, notes] = await Promise.all([getEntry(id), getNotes(id)]);
  if (!entry) notFound();
  const { book } = entry;

  const chapters = resolveChapters(entry.chapters, entry.suggestion);
  let suggestions: Suggestion[] = [];
  if (!chapters) {
    // The free source (Open Library) is checked automatically; AI only when the reader asks.
    await ensureOpenLibrarySuggestion(book);
    suggestions = await getSuggestions(book.id);
  }

  return (
    <>
      <MarkOpened entryId={entry.id} />

      <div className="mt-6 flex gap-5">
        <Cover
          coverId={entry.edition_cover_id ?? book.cover_id}
          title={book.title}
          size="L"
          priority
          className="w-28 shrink-0 sm:w-36"
        />
        <div className="flex min-w-0 flex-col justify-end">
          <h1 className="font-serif text-2xl font-semibold leading-tight sm:text-3xl">{book.title}</h1>
          <p className="mt-1 text-muted">{authorsLabel(book.authors)}</p>
          <p className="mt-3 text-sm">
            <span className="text-muted">You&apos;re at:</span> {spotLabel(entry)}
          </p>
        </div>
      </div>

      {/* 1. The two big buttons, in the spec's order. Wired up in steps 4–5. */}
      <div className="mt-8 grid grid-cols-2 gap-3">
        <BigButton title="Recap to my spot" hint="What's happened so far" href={`/books/${entry.id}/recap`} />
        <BigButton title="Find my place" hint="By chapter, page, time…" href={`/books/${entry.id}/find`} />
      </div>

      {/* 2. Chapters with their notes, collapsed, with green dots (or setup, if no chapters yet). */}
      <section className="mt-10 space-y-4">
        <h2 className="font-serif text-lg font-semibold">Chapters &amp; notes</h2>
        <QuickNoteBox entryId={entry.id} />
        {chapters ? (
          <ChapterSection
            entryId={entry.id}
            chapters={chapters}
            currentChapter={entry.current_chapter}
            {...placeNotes(notes, chapters.length)}
          />
        ) : (
          <>
            <ChapterSetup entryId={entry.id} suggestions={suggestions} aiAvailable={isAiConfigured()} />
            <NotesByChapter notes={notes} />
          </>
        )}
      </section>

      {/* 3. Final notes / rating, after the last chapter. */}
      <section className="mt-10 border-t border-border pt-8">
        <h2 className="font-serif text-lg font-semibold">When you finish</h2>
        <ReviewForm entryId={entry.id} rating={entry.rating} finalThoughts={entry.final_thoughts} />
      </section>

      <div className="mt-12 border-t border-border pt-6">
        <RemoveButton entryId={entry.id} title={book.title} />
      </div>
    </>
  );
}

/** Splits notes into their chapters, plus the ones whose chapter isn't in the list. */
function placeNotes(notes: Note[], totalChapters: number) {
  const notesByChapter: Record<number, Note[]> = {};
  const unplacedNotes: Note[] = [];
  for (const note of notes) {
    if (note.chapter !== null && note.chapter <= totalChapters) {
      (notesByChapter[note.chapter] ??= []).push(note);
    } else {
      unplacedNotes.push(note);
    }
  }
  return { notesByChapter, unplacedNotes };
}

/** One of the two big buttons. Without an href it's shown disabled ("coming soon"). */
function BigButton({ title, hint, href }: { title: string; hint: string; href?: string }) {
  const content = (
    <>
      <span className="block font-serif text-lg font-semibold leading-tight">{title}</span>
      <span className="mt-1 block text-sm opacity-90">{hint}</span>
    </>
  );
  const className = "rounded-2xl bg-accent px-4 py-5 text-left text-accent-foreground sm:px-5";

  if (href) {
    return (
      <Link href={href} className={`${className} transition-opacity hover:opacity-90`}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" disabled title="Coming soon" className={`${className} cursor-not-allowed opacity-50`}>
      {content}
    </button>
  );
}
