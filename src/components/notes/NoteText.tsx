import { formatDuration } from "@/lib/place/estimate";
import { splitTags } from "@/lib/library/tags";
import type { Note } from "@/lib/library/notes";

/** A note's text with @tags highlighted. */
export function NoteText({ body }: { body: string }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {splitTags(body).map((part, i) =>
        part.tag ? (
          <span key={i} className="rounded bg-success-surface px-1 font-medium text-accent">
            {part.text}
          </span>
        ) : (
          part.text
        ),
      )}
    </p>
  );
}

/** "p. 212 · 3h 42m" and the quote snippet, if the note has them. */
export function NoteAnchors({ note }: { note: Pick<Note, "page" | "audio_minutes" | "quote"> }) {
  const where = [note.page ? `p. ${note.page}` : null, note.audio_minutes != null ? formatDuration(note.audio_minutes) : null]
    .filter(Boolean)
    .join(" · ");
  if (!where && !note.quote) return null;
  return (
    <p className="mt-1 text-xs text-muted">
      {where}
      {where && note.quote && " · "}
      {note.quote && <span className="italic">“{note.quote}…”</span>}
    </p>
  );
}
