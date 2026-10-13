"use client";

import { deleteNote } from "@/app/books/actions";

export function DeleteNoteButton({ noteId }: { noteId: string }) {
  return (
    <form
      action={deleteNote}
      onSubmit={(event) => {
        if (!confirm("Delete this note?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="noteId" value={noteId} />
      <button type="submit" className="text-xs text-muted underline-offset-4 hover:text-danger hover:underline">
        Delete
      </button>
    </form>
  );
}
