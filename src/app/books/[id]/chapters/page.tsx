import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ChapterEditor } from "@/components/chapters/ChapterEditor";
import { EditionForm } from "@/components/chapters/EditionForm";
import { resolveChapters } from "@/lib/chapters/list";
import { getSuggestions } from "@/lib/chapters/suggestions";
import { getEntry, isUuid } from "@/lib/library/queries";

export default function EditChaptersPage({ params, searchParams }: PageProps<"/books/[id]/chapters">) {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-border/40" />}>
          <Editor params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function Editor({ params, searchParams }: PageProps<"/books/[id]/chapters">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const entry = await getEntry(id);
  if (!entry) notFound();

  // "Edit them first" from a suggestion starts the editor with that suggestion's list.
  const from = typeof query.from === "string" && isUuid(query.from) ? query.from : null;
  const suggestion = from ? (await getSuggestions(entry.book.id)).find((s) => s.id === from) : undefined;
  const initial = suggestion?.chapters ?? resolveChapters(entry.chapters, entry.suggestion) ?? [];

  return (
    <>
      <Link href={`/books/${entry.id}`} className="text-sm text-muted underline-offset-4 hover:underline">
        ← {entry.book.title}
      </Link>
      <h1 className="mt-3 font-serif text-2xl font-semibold">Chapters &amp; edition</h1>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold">Your chapters</h2>
        <p className="mt-1 text-sm text-muted">
          Changes here only affect your copy. Add chapters in bulk, give them titles if you like, or remove
          ones your edition doesn&apos;t have.
        </p>
        <div className="mt-4">
          <ChapterEditor entryId={entry.id} initial={initial} />
        </div>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="font-serif text-lg font-semibold">Your edition</h2>
        <p className="mt-1 text-sm text-muted">Optional. Mostly useful for paper books, where page numbers vary by printing.</p>
        <div className="mt-4">
          <EditionForm entryId={entry.id} values={entry} />
        </div>
      </section>
    </>
  );
}
