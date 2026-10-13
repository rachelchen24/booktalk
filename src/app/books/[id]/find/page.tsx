import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { FindMyPlace } from "@/components/place/FindMyPlace";
import { isAiConfigured } from "@/lib/ai/client";
import { resolveChapters } from "@/lib/chapters/list";
import { spotLabel } from "@/lib/library/format";
import { getEntry } from "@/lib/library/queries";

export default function FindMyPlacePage({ params }: PageProps<"/books/[id]/find">) {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-border/40" />}>
          <Finder params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function Finder({ params }: Pick<PageProps<"/books/[id]/find">, "params">) {
  const { id } = await params;
  const entry = await getEntry(id);
  if (!entry) notFound();
  const chapters = resolveChapters(entry.chapters, entry.suggestion);

  return (
    <>
      <Link href={`/books/${entry.id}`} className="text-sm text-muted underline-offset-4 hover:underline">
        ← {entry.book.title}
      </Link>
      <h1 className="mt-3 font-serif text-2xl font-semibold">Find my place</h1>
      <p className="mt-1 text-sm text-muted">Right now you&apos;re at: {spotLabel(entry)}</p>

      <div className="mt-6">
        {chapters ? (
          <FindMyPlace
            entryId={entry.id}
            chapters={chapters}
            currentChapter={entry.current_chapter}
            totalPages={entry.total_pages}
            calibration={
              entry.calibration_chapter && entry.calibration_page
                ? { chapter: entry.calibration_chapter, page: entry.calibration_page }
                : null
            }
            audiobookMinutes={entry.audiobook_minutes}
            aiAvailable={isAiConfigured()}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
            Every way of finding your place ends at a chapter, so set up your chapters first.{" "}
            <Link href={`/books/${entry.id}`} className="font-medium text-accent underline-offset-4 hover:underline">
              Set up chapters
            </Link>
          </p>
        )}
      </div>
    </>
  );
}
