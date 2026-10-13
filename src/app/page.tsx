import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Cover } from "@/components/books/Cover";
import { ProgressBar } from "@/components/books/ProgressBar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { authorsLabel, finishedInYear, spotLabel } from "@/lib/library/format";
import { getLibrary, type LibraryEntry } from "@/lib/library/queries";

export const metadata: Metadata = { title: "Your library" };

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-2xl font-semibold">Your library</h1>
          <Link
            href="/add"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            Add a book
          </Link>
        </div>
        <Suspense fallback={<div className="mt-8 h-48 animate-pulse rounded-2xl bg-border/40" />}>
          <Library />
        </Suspense>
      </main>
    </div>
  );
}

async function Library() {
  await getCurrentUser();
  const library = await getLibrary();
  const [current, ...rest] = library;
  const year = new Date().getUTCFullYear();
  const readThisYear = finishedInYear(library, year);

  if (!current) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
        <p className="font-serif text-lg">Your shelf is empty.</p>
        <p className="mt-1 text-muted">Add the book you&apos;re reading to get started.</p>
        <Link href="/add" className="mt-4 inline-block font-medium text-accent underline-offset-4 hover:underline">
          Find a book
        </Link>
      </div>
    );
  }

  return (
    <>
      <YearStat count={readThisYear} year={year} />

      {/* The core moment: open the app, tap the book you're in. */}
      <Link
        href={`/books/${current.id}`}
        className="mt-8 flex gap-5 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6"
      >
        <Cover coverId={current.edition_cover_id ?? current.book.cover_id} title={current.book.title} size="M" priority className="w-24 shrink-0 sm:w-32" />
        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-xs font-medium uppercase tracking-wider text-accent">Pick up where you left off</p>
          <h2 className="mt-1 font-serif text-xl font-semibold leading-tight sm:text-2xl">{current.book.title}</h2>
          <p className="mt-1 text-muted">{authorsLabel(current.book.authors)}</p>
          <p className="mt-3 text-sm">{spotLabel(current)}</p>
          <ProgressBar percent={current.current_percent} label={`${current.book.title}: ${spotLabel(current)}`} className="mt-2 max-w-xs" />
        </div>
      </Link>

      {rest.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted">Also on your shelf</h2>
          <ul className="mt-4 grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5">
            {rest.map((entry) => (
              <li key={entry.id}>
                <ShelfBook entry={entry} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ShelfBook({ entry }: { entry: LibraryEntry }) {
  return (
    <Link href={`/books/${entry.id}`} className="group block">
      <Cover coverId={entry.edition_cover_id ?? entry.book.cover_id} title={entry.book.title} className="transition-transform group-hover:-translate-y-0.5" />
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{entry.book.title}</p>
      <ProgressBar percent={entry.current_percent} label={`${entry.book.title}: ${spotLabel(entry)}`} className="mt-2" />
      <p className="mt-1 text-xs text-muted">{spotLabel(entry)}</p>
    </Link>
  );
}

/** "3 books read in 2026". The first library stat; more may join it later. */
function YearStat({ count, year }: { count: number; year: number }) {
  return (
    <p className="mt-6 text-sm text-muted">
      <span className="font-serif text-2xl font-semibold text-foreground">{count}</span>{" "}
      {count === 1 ? "book" : "books"} read in {year}
    </p>
  );
}
