/** Shared by the server (validation) and the browser (textarea limit). Matches the DB check. */
export const MAX_FINAL_THOUGHTS = 5000;

type Spot = { current_chapter: number | null; current_percent: number | null };

/** How a reader's spot reads on the shelf and book page, e.g. "Chapter 12 · 34%". */
export function spotLabel({ current_chapter, current_percent }: Spot): string {
  if (current_percent !== null && current_percent >= 100) return "Finished";
  const percent = current_percent === null ? null : `${Math.round(current_percent)}%`;
  if (current_chapter !== null) return percent ? `Chapter ${current_chapter} · ${percent}` : `Chapter ${current_chapter}`;
  return percent ?? "Not started";
}

/** "Gregory Maguire", "A and B", "A, B and C" — more than three becomes "A, B and others". */
export function authorsLabel(authors: string[]): string {
  if (authors.length === 0) return "Unknown author";
  if (authors.length > 3) return `${authors.slice(0, 2).join(", ")} and others`;
  if (authors.length === 1) return authors[0];
  return `${authors.slice(0, -1).join(", ")} and ${authors.at(-1)}`;
}

/** How many books were finished in the given calendar year (UTC). */
export function finishedInYear(entries: { finished_at: string | null }[], year: number): number {
  return entries.filter((entry) => entry.finished_at && new Date(entry.finished_at).getUTCFullYear() === year).length;
}
