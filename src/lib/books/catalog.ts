import "server-only";
import { cacheLife } from "next/cache";
import type { Chapter } from "@/lib/chapters/list";
import { tocToChapters, type TocItem } from "@/lib/chapters/open-library-toc";
import { normalizeIsbn } from "./isbn";
import {
  OPEN_LIBRARY,
  editionUrl,
  isWorkKey,
  searchUrl,
  toBookResults,
  toEdition,
  type BookResult,
  type Edition,
  type EditionJson,
} from "./open-library";

/** Open Library asks apps to identify themselves. */
const USER_AGENT = "BookTalk/0.1 (portfolio project)";

export class OpenLibraryError extends Error {}

/**
 * Searches by title/author, or by ISBN if the query is one.
 *
 * "use cache" keeps results for a day, keyed by the query. Book data barely changes,
 * so this makes repeat searches instant and keeps our traffic to Open Library low.
 * Failures throw instead of returning [], so an outage is never cached as "no results".
 */
export async function searchBooks(query: string): Promise<BookResult[]> {
  "use cache";
  cacheLife("days");

  const isbn = normalizeIsbn(query);
  return toBookResults(await getJson(searchUrl(isbn ? { isbn } : { query })));
}

export async function getBook(workKey: string): Promise<BookResult | null> {
  "use cache";
  cacheLife("days");

  if (!isWorkKey(workKey)) return null;
  const [book] = toBookResults(await getJson(searchUrl({ workKey }, 1)));
  return book ?? null;
}

/** A specific printing, by ISBN. Null if Open Library doesn't know it. */
export async function getEdition(isbn: string): Promise<Edition | null> {
  "use cache";
  cacheLife("weeks");

  const json = await getJson(editionUrl(isbn), { allowMissing: true });
  return json ? toEdition(json as EditionJson) : null;
}

/**
 * A usable chapter list from any of the work's editions' tables of contents, or null.
 * Usable ones are rare (2 of 54 Wicked editions had any, both junk), so this mostly
 * returns null; tocToChapters does the strict filtering. English editions go first.
 */
export async function getTocChapters(workKey: string): Promise<Chapter[] | null> {
  "use cache";
  cacheLife("weeks");

  if (!isWorkKey(workKey)) return null;
  const json = (await getJson(`${OPEN_LIBRARY}/works/${workKey}/editions.json?limit=100`)) as {
    entries?: (EditionJson & { table_of_contents?: TocItem[]; languages?: { key: string }[] })[];
  };
  const editions = [...(json.entries ?? [])].sort(
    (a, b) => Number(isEnglish(b)) - Number(isEnglish(a)),
  );
  for (const edition of editions) {
    const chapters = tocToChapters(edition.table_of_contents);
    if (chapters) return chapters;
  }
  return null;
}

function isEnglish(edition: { languages?: { key: string }[] }): boolean {
  return edition.languages?.some((language) => language.key === "/languages/eng") ?? false;
}

async function getJson(url: string, { allowMissing = false } = {}): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch (cause) {
    throw new OpenLibraryError(`Open Library request failed: ${url}`, { cause });
  }

  if (res.ok) {
    try {
      return await res.json();
    } catch {
      // Unknown ISBNs redirect to an HTML page rather than returning a 404.
      if (allowMissing) return null;
      throw new OpenLibraryError(`Open Library sent something that isn't JSON: ${url}`);
    }
  }
  if (res.status === 404 && allowMissing) return null;
  throw new OpenLibraryError(`Open Library returned ${res.status}: ${url}`);
}
