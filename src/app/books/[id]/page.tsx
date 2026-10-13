import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Cover } from "@/components/books/Cover";
import { authorsLabel, spotLabel } from "@/lib/library/format";
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
        <BigButton title="Recap to my spot" hint="What's happened so far" />
        <BigButton title="Find my place" hint="By chapter, page, time…" />
      </div>

      {/* 2. Notes by chapter, collapsed, with green dots. */}
      <section className="mt-10 space-y-4">
        <h2 className="font-serif text-lg font-semibold">Notes by chapter</h2>
        <QuickNoteBox entryId={entry.id} />
        <NotesByChapter notes={notes} />
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

function BigButton({ title, hint }: { title: string; hint: string }) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="rounded-2xl bg-accent px-4 py-5 text-left text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
    >
      <span className="block font-serif text-lg font-semibold leading-tight">{title}</span>
      <span className="mt-1 block text-sm opacity-90">{hint}</span>
    </button>
  );
}
