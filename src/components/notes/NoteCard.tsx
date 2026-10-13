"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { editNote, type NoteState } from "@/app/books/actions";
import { MAX_NOTE_LENGTH, type Note } from "@/lib/library/notes";
import { formatDuration } from "@/lib/place/estimate";
import { AnchorFields } from "./AnchorFields";
import { DeleteNoteButton } from "./DeleteNoteButton";
import { submitOnShiftEnter } from "./keyboard";
import { NoteAnchors, NoteText } from "./NoteText";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** One note card, editable in place. Used everywhere notes are shown. */
export function NoteCard({ note, pending = false }: { note: Note; pending?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(editNote, {} as NoteState);
  // Show the edited text right away; the real value arrives when the page refreshes.
  const [body, setOptimisticBody] = useOptimistic(note.body);
  const [, startTransition] = useTransition();

  function save(formData: FormData) {
    const next = String(formData.get("body") ?? "").trim();
    if (!next) return; // keep editing; empty notes aren't allowed
    setEditing(false);
    startTransition(() => {
      setOptimisticBody(next);
      action(formData);
    });
  }

  if (editing) {
    return (
      <form action={save} className="space-y-2 rounded-lg border border-accent bg-background px-3 py-2">
        <input type="hidden" name="noteId" value={note.id} />
        <textarea
          name="body"
          defaultValue={body}
          required
          autoFocus
          rows={Math.min(8, Math.max(2, body.split("\n").length))}
          maxLength={MAX_NOTE_LENGTH}
          aria-label="Edit note"
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditing(false);
            else submitOnShiftEnter(event);
          }}
          className="w-full resize-y bg-transparent text-sm leading-relaxed outline-none"
        />
        <AnchorFields
          page={note.page ? String(note.page) : undefined}
          time={note.audio_minutes != null ? formatDuration(note.audio_minutes) : undefined}
          quote={note.quote ?? undefined}
        />
        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:opacity-90">
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted hover:underline">
            Cancel
          </button>
          <span className="text-xs text-muted">Shift + Enter to save · Esc to cancel</span>
        </div>
      </form>
    );
  }

  return (
    <div className={`rounded-lg border border-border bg-background px-3 py-2 ${pending ? "opacity-60" : ""}`}>
      <NoteText body={body} />
      <NoteAnchors note={note} />
      <div className="mt-1 flex items-center justify-between gap-3">
        <time dateTime={note.created_at} className="text-xs text-muted">
          {pending ? "Saving…" : dateFormat.format(new Date(note.created_at))}
        </time>
        {/* A note that's still being created has no real id to edit or delete yet. */}
        {!pending && (
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline">
              Edit
            </button>
            <DeleteNoteButton noteId={note.id} />
          </div>
        )}
      </div>
      {state.error && <p role="alert" className="mt-1 text-xs text-danger">{state.error}</p>}
    </div>
  );
}
