import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { WriteRecap } from "@/components/recap/WriteRecap";
import { isAiConfigured } from "@/lib/ai/client";
import { chapterName } from "@/lib/chapters/list";
import { groupByChapter } from "@/lib/library/notes";
import type { DetailRecap, ShortRecap } from "@/lib/recap/ai";
import { getSavedRecap, loadRecapContext, type RecapContext } from "@/lib/recap/service";

/**
 * "Previously on…" (VISION §5.6). Styled like the recap page of a novel, not a chat
 * (principle 6): book typography, no bubbles or typing effect, and one quiet line
 * saying where the recap came from.
 */
export default function RecapPage({ params }: PageProps<"/books/[id]/recap">) {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-border/40" />}>
          <Recap params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function Recap({ params }: Pick<PageProps<"/books/[id]/recap">, "params">) {
  const { id } = await params;
  const context = await loadRecapContext(id);
  if (!context) notFound();
  if (context === "no-chapters") return <NoChapters entryId={id} />;
  const { entry, chapters, scope } = context;
  const ai = isAiConfigured();
  const [short, detail] = ai && scope.through > 0
    ? await Promise.all([getSavedRecap(context, "short"), getSavedRecap(context, "detail")])
    : [null, null];

  return (
    <article>
      <Link href={`/books/${entry.id}`} className="text-sm text-muted underline-offset-4 hover:underline">
        ← Back to the book
      </Link>

      <header className="mt-6 border-b border-border pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Previously on</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight">{entry.book.title}</h1>
        {scope.through > 0 && (
          <p className="mt-2 text-sm text-muted">
            Up to the end of chapter {scope.through}: {chapterName(chapters[scope.through - 1])}
          </p>
        )}
        {scope.partwayInto && (
          <p className="mt-1 text-sm text-muted">
            You&apos;re partway into chapter {scope.partwayInto}, so it isn&apos;t included.
          </p>
        )}
      </header>

      {scope.through === 0 ? (
        <p className="mt-8 font-serif text-lg leading-relaxed text-muted">
          Nothing to recap yet. Once you&apos;ve finished a chapter (mark it on the book page), your recap will
          be here.
        </p>
      ) : ai ? (
        <AiRecap context={context} short={short} detail={detail} />
      ) : null}

      {scope.through > 0 && <NotesSoFar context={context} primary={!ai} />}
    </article>
  );
}

function AiRecap({ context, short, detail }: { context: RecapContext; short: ShortRecap | null; detail: DetailRecap | null }) {
  const entryId = context.entry.id;
  if (!short) {
    return (
      <section className="mt-8">
        <WriteRecap entryId={entryId} level="short" auto />
      </section>
    );
  }
  if (!short.knowsBook || short.bullets.length === 0) {
    return (
      <p className="mt-8 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
        BookTalk doesn&apos;t know this book well enough to recap it without making things up. Here&apos;s what
        you noted instead.
      </p>
    );
  }

  return (
    <section className="mt-8 space-y-8">
      {short.confidence === "low" && (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          BookTalk isn&apos;t confident about this book, so this recap may be inaccurate. Your own notes, further
          down, are the most reliable part.
        </p>
      )}

      <ul className="space-y-4 font-serif text-lg leading-relaxed">
        {short.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-3">
            <span aria-hidden className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      {short.characters.length > 0 && (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Characters so far</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {short.characters.map((character) => (
              <div key={character.name} className="text-sm">
                <dt className="inline font-medium">{character.name}</dt>
                {character.who && <dd className="inline text-muted"> · {character.who}</dd>}
              </div>
            ))}
          </dl>
        </div>
      )}

      <div>
        {detail?.paragraphs.length ? (
          <div className="space-y-4 border-t border-border pt-6 font-serif text-base leading-relaxed">
            <h2 className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">In more detail</h2>
            {detail.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <WriteRecap entryId={entryId} level="detail" />
        )}
      </div>

      {/* Honest about the source (principle 2), without looking like a chatbot (principle 6). */}
      <p className="text-xs text-muted">
        Based on BookTalk&apos;s knowledge of this book{context.notes.length > 0 ? " and your notes" : ""}.
      </p>
    </section>
  );
}

function NotesSoFar({ context, primary }: { context: RecapContext; primary: boolean }) {
  const groups = groupByChapter(context.notes);
  return (
    <section className={primary ? "mt-8" : "mt-12 border-t border-border pt-8"}>
      <h2 className={primary ? "font-serif text-xl font-semibold" : "text-xs font-medium uppercase tracking-[0.2em] text-muted"}>
        {primary ? "From your notes" : "Your notes so far"}
      </h2>
      {groups.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          You haven&apos;t left any notes up to here.{" "}
          {primary && "Notes you add as you read will show up here as your recap."}
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map(({ chapter, notes }) => (
            <div key={chapter}>
              <h3 className="text-sm font-medium">
                {chapter}. {chapterName(context.chapters[chapter! - 1])}
              </h3>
              <ul className="mt-1 space-y-1">
                {notes.map((note) => (
                  <li key={note.id} className="whitespace-pre-wrap font-serif leading-relaxed text-foreground/90">
                    {note.body}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function NoChapters({ entryId }: { entryId: string }) {
  return (
    <div className="space-y-4">
      <Link href={`/books/${entryId}`} className="text-sm text-muted underline-offset-4 hover:underline">
        ← Back to the book
      </Link>
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
        Recaps go chapter by chapter, so set up your chapters first.{" "}
        <Link href={`/books/${entryId}`} className="font-medium text-accent underline-offset-4 hover:underline">
          Set up chapters
        </Link>
      </p>
    </div>
  );
}
