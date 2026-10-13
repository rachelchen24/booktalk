"use client";

import { removeBook } from "../actions";

export function RemoveButton({ entryId, title }: { entryId: string; title: string }) {
  return (
    <form
      action={removeBook}
      onSubmit={(event) => {
        if (!confirm(`Remove "${title}" from your library? Your notes, rating and thoughts for it will be deleted.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="entryId" value={entryId} />
      <button type="submit" className="text-sm text-muted underline-offset-4 hover:text-danger hover:underline">
        Remove from library
      </button>
    </form>
  );
}
