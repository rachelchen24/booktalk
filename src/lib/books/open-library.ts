/**
 * Open Library response shapes and how we map them into our own types.
 * Pure functions only (no network), so they can be tested against saved responses.
 * The fetching lives in catalog.ts.
 */

export const OPEN_LIBRARY = "https://openlibrary.org";

/** A book (Open Library "work") as BookTalk uses it. */
export type BookResult = {
  workKey: string; // "OL66218W"
  title: string;
  authors: string[];
  coverId: number | null;
  firstPublishYear: number | null;
};

/** The parts of a specific printing we care about (looked up by ISBN). */
export type Edition = {
  coverId: number | null;
  pages: number | null;
  publishers: string[];
};

// What Open Library actually sends. Every field is optional because real data is patchy.
export type SearchDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
};
export type EditionJson = { covers?: number[]; number_of_pages?: number; publishers?: string[] };

const SEARCH_FIELDS = "key,title,author_name,cover_i,first_publish_year";

/** Work keys go into URLs and the database, so only accept the exact Open Library format. */
export function isWorkKey(value: string): boolean {
  return /^OL\d+W$/.test(value);
}

export function searchUrl(by: { query: string } | { isbn: string } | { workKey: string }, limit = 12): string {
  const params = new URLSearchParams({ fields: SEARCH_FIELDS, limit: String(limit) });
  if ("isbn" in by) params.set("isbn", by.isbn);
  else if ("workKey" in by) params.set("q", `key:/works/${by.workKey}`);
  else params.set("q", by.query);
  return `${OPEN_LIBRARY}/search.json?${params}`;
}

export function editionUrl(isbn: string): string {
  return `${OPEN_LIBRARY}/isbn/${isbn}.json`;
}

/** S ≈ 40px wide, M ≈ 180px, L ≈ 500px. */
export function coverUrl(coverId: number, size: "S" | "M" | "L" = "M"): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

export function toBookResult(doc: SearchDoc): BookResult | null {
  const workKey = doc.key?.replace(/^\/works\//, "");
  const title = doc.title?.trim();
  if (!workKey || !isWorkKey(workKey) || !title) return null;
  return {
    workKey,
    title,
    authors: [...new Set(doc.author_name ?? [])],
    coverId: positiveInt(doc.cover_i),
    firstPublishYear: positiveInt(doc.first_publish_year),
  };
}

/** Maps a search response to results, dropping unusable entries and duplicates. */
export function toBookResults(json: unknown): BookResult[] {
  const docs = (json as { docs?: SearchDoc[] } | null)?.docs ?? [];
  const seen = new Set<string>();
  const results: BookResult[] = [];
  for (const doc of docs) {
    const book = toBookResult(doc);
    if (book && !seen.has(book.workKey)) {
      seen.add(book.workKey);
      results.push(book);
    }
  }
  return results;
}

export function toEdition(json: EditionJson): Edition {
  return {
    coverId: positiveInt(json.covers?.find((id) => id > 0)),
    pages: positiveInt(json.number_of_pages),
    publishers: json.publishers ?? [],
  };
}

// Open Library sometimes uses -1 or 0 for "no cover".
function positiveInt(value: number | undefined): number | null {
  return Number.isInteger(value) && value! > 0 ? value! : null;
}
