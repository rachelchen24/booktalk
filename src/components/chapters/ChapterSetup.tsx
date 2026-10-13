import Link from "next/link";
import { chooseSuggestion } from "@/app/books/chapter-actions";
import { chapterName } from "@/lib/chapters/list";
import type { Suggestion } from "@/lib/chapters/suggestions";
import { AiSuggestButton } from "./AiSuggestButton";
import { ChapterEditor } from "./ChapterEditor";

const SOURCE_LABEL: Record<Suggestion["source"], string> = {
  open_library: "From Open Library's table of contents",
  // Plain about where it came from (VISION principle 6), and that it needs checking.
  ai: "Suggested by BookTalk. Check it against your copy",
};

/** Shown on the book page until the reader has a chapter list. */
export function ChapterSetup({ entryId, suggestions, aiAvailable }: {
  entryId: string;
  suggestions: Suggestion[];
  aiAvailable: boolean;
}) {
  const hasAi = suggestions.some((s) => s.source === "ai");

  return (
    <div className="space-y-6 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div>
        <h3 className="font-medium">Set up your chapters</h3>
        <p className="mt-0.5 text-sm text-muted">
          Then you can mark your spot with one tap and keep notes chapter by chapter.
        </p>
      </div>

      {suggestions.map((suggestion) => (
        <div key={suggestion.id} className="rounded-lg border border-border bg-background p-4">
          <p className="text-sm text-muted">{SOURCE_LABEL[suggestion.source]}</p>
          <p className="mt-1 font-medium">{suggestion.chapters.length} chapters</p>
          <ol className="mt-2 space-y-0.5 text-sm text-muted">
            {suggestion.chapters.slice(0, 4).map((chapter) => (
              <li key={chapter.number}>
                {chapter.number}. {chapterName(chapter)}
              </li>
            ))}
            {suggestion.chapters.length > 4 && <li>…</li>}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <form action={chooseSuggestion}>
              <input type="hidden" name="entryId" value={entryId} />
              <input type="hidden" name="suggestionId" value={suggestion.id} />
              <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90">
                Use these chapters
              </button>
            </form>
            <Link
              href={`/books/${entryId}/chapters?from=${suggestion.id}`}
              className="text-sm text-muted underline-offset-4 hover:underline"
            >
              Edit them first
            </Link>
          </div>
        </div>
      ))}

      {aiAvailable && !hasAi && <AiSuggestButton entryId={entryId} />}

      <div>
        <p className="mb-2 text-sm font-medium">
          {suggestions.length > 0 ? "Or set them up yourself" : "How many chapters does your book have?"}
        </p>
        <ChapterEditor entryId={entryId} initial={[]} />
      </div>
    </div>
  );
}
