"use client";

import { useState } from "react";
import { chapterName, type Chapter } from "@/lib/chapters/list";
import type { Note } from "@/lib/library/notes";
import { mentionsTag, summarizeTags, tagKey } from "@/lib/library/tags";
import { NoteAnchors, NoteText } from "./NoteText";

/**
 * "People & places": every @tag in the reader's notes, and the notes that mention it
 * (VISION §5.7). Built only from the reader's own notes, so it can't spoil anything.
 * The v1.5 character and place lookups will build on this.
 */
export function TagsPanel({ notes, chapters }: { notes: Note[]; chapters: Chapter[] | null }) {
  const tags = summarizeTags(notes);
  const [selected, setSelected] = useState<string | null>(null);
  if (tags.length === 0) return null;

  const matching = selected
    ? notes
        .filter((note) => mentionsTag(note.body, selected))
        .sort((a, b) => (a.chapter ?? Infinity) - (b.chapter ?? Infinity) || a.created_at.localeCompare(b.created_at))
    : [];

  return (
    <section className="mt-10">
      <h2 className="font-serif text-lg font-semibold">People &amp; places</h2>
      <p className="mt-0.5 text-sm text-muted">From the @tags in your notes.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map(({ tag, count }) => {
          const active = selected !== null && tagKey(selected) === tagKey(tag);
          return (
            <button
              key={tagKey(tag)}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(active ? null : tag)}
              className="rounded-full border border-border px-3 py-1 text-sm hover:border-accent aria-pressed:border-accent aria-pressed:bg-success-surface"
            >
              <span className="font-medium text-accent">@{tag}</span> <span className="text-muted">{count}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <ul className="mt-4 space-y-2">
          {matching.map((note) => (
            <li key={note.id} className="rounded-lg border border-border bg-surface px-3 py-2">
              <p className="mb-1 text-xs text-muted">
                {note.chapter === null
                  ? "General note"
                  : chapters?.[note.chapter - 1]
                    ? `${note.chapter}. ${chapterName(chapters[note.chapter - 1])}`
                    : `Chapter ${note.chapter}`}
              </p>
              <NoteText body={note.body} />
              <NoteAnchors note={note} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
