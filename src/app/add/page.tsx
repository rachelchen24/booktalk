import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Cover } from "@/components/books/Cover";
import { getCurrentUser } from "@/lib/auth/current-user";
import { OpenLibraryError, searchBooks } from "@/lib/books/catalog";
import { looksLikeIsbn, normalizeIsbn } from "@/lib/books/isbn";
import { authorsLabel } from "@/lib/library/format";
import { getShelvedWorkKeys } from "@/lib/library/queries";
import { AddButton } from "./AddButton";

export default function AddBookPage({ searchParams }: PageProps<"/add">) {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link href="/" className="text-sm text-muted underline-offset-4 hover:underline">
          ← Your library
        </Link>
        <h1 className="mt-3 font-serif text-2xl font-semibold">Add a book</h1>

        {/* The query lives in the URL (/add?q=…), so back/forward and refresh just work. */}
        <Form action="/add" className="mt-5 flex gap-2">
          <Suspense fallback={<SearchInput />}>
            <SearchInputWithQuery searchParams={searchParams} />
          </Suspense>
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground hover:opacity-90">
            Search
          </button>
        </Form>
        <p className="mt-2 text-sm text-muted">Paper book? Searching its ISBN (on the back or copyright page) finds your exact edition.</p>

        <Suspense fallback={<ResultsSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

function SearchInput({ defaultValue }: { defaultValue?: string }) {
  return (
    <input
      name="q"
      type="search"
      defaultValue={defaultValue}
      placeholder="Title, author, or ISBN"
      aria-label="Title, author, or ISBN"
      autoFocus
      className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
    />
  );
}

async function SearchInputWithQuery({ searchParams }: Pick<PageProps<"/add">, "searchParams">) {
  return <SearchInput defaultValue={readQuery(await searchParams)} />;
}

async function Results({ searchParams }: Pick<PageProps<"/add">, "searchParams">) {
  await getCurrentUser();
  const query = readQuery(await searchParams);
  if (!query) return null;

  const isbn = normalizeIsbn(query);
  if (!isbn && looksLikeIsbn(query)) {
    return <Notice>That ISBN doesn&apos;t look right. Check the digits and try again.</Notice>;
  }

  let results;
  try {
    results = await searchBooks(query);
  } catch (error) {
    if (!(error instanceof OpenLibraryError)) throw error;
    console.error(error);
    return <Notice>Open Library isn&apos;t responding right now. Please try again in a moment.</Notice>;
  }
  if (results.length === 0) {
    return (
      <Notice>
        No books found for &ldquo;{query}&rdquo;. {isbn ? "Try searching by title instead." : "Try fewer words, or the author's last name."}
      </Notice>
    );
  }

  const shelved = await getShelvedWorkKeys();
  return (
    <ul className="mt-6 divide-y divide-border">
      {results.map((book) => {
        const entryId = shelved.get(book.workKey);
        return (
          <li key={book.workKey} className="flex items-center gap-4 py-4">
            <Cover coverId={book.coverId} title={book.title} size="S" className="w-12 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-snug">{book.title}</p>
              <p className="text-sm text-muted">
                {authorsLabel(book.authors)}
                {book.firstPublishYear && ` · ${book.firstPublishYear}`}
              </p>
            </div>
            {entryId ? (
              <Link href={`/books/${entryId}`} className="shrink-0 text-sm text-accent underline-offset-4 hover:underline">
                On your shelf
              </Link>
            ) : (
              <AddButton workKey={book.workKey} isbn={isbn} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function readQuery(params: Record<string, string | string[] | undefined>): string {
  const q = params.q;
  return (Array.isArray(q) ? q[0] : q)?.trim().slice(0, 200) ?? "";
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 rounded-lg border border-border bg-surface px-4 py-3 text-sm">{children}</p>;
}

function ResultsSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-border/40" />
      ))}
    </div>
  );
}
