import { groupByChapter, type Note } from "@/lib/library/notes";
import { NoteCard } from "@/components/notes/NoteCard";

/**
 * One collapsed row per chapter with notes, marked with a green dot (VISION §5.2a).
 * Uses the browser's own <details>/<summary>: collapsed by default, keyboard and
 * screen-reader friendly, and no JavaScript needed.
 */
export function NotesByChapter({ notes }: { notes: Note[] }) {
  const groups = groupByChapter(notes);
  if (groups.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
        No notes yet. Chapters you leave notes in get a green dot, so you can see where you&apos;ve been
        at a glance.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {groups.map(({ chapter, notes }) => (
        <li key={chapter ?? "none"}>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-background/60 [&::-webkit-details-marker]:hidden">
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-green-600" />
              <span className="flex-1 font-medium">{chapter === null ? "No chapter yet" : `Chapter ${chapter}`}</span>
              <span className="text-sm text-muted">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </span>
              <span aria-hidden className="text-muted transition-transform group-open:rotate-90">›</span>
            </summary>
            <ul className="space-y-3 px-4 pb-4 pl-9">
              {notes.map((note) => (
                <li key={note.id}>
                  <NoteCard note={note} />
                </li>
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  );
}
