"use client";

import { useActionState } from "react";
import { addNote, type NoteState } from "../actions";
import { submitOnShiftEnter } from "@/components/notes/keyboard";
import { MAX_CHAPTER, MAX_NOTE_LENGTH } from "@/lib/library/notes";

/**
 * A quick note box for the whole book, at the top of the book page. Rachel chose to
 * keep it alongside the per-chapter note boxes: it's the fastest way to jot something
 * down when you stop reading.
 */
export function QuickNoteBox({ entryId }: { entryId: string }) {
  const [state, action, pending] = useActionState(addNote, {} as NoteState);

  return (
    <form action={action} className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <input type="hidden" name="entryId" value={entryId} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Add a note</span>
        <textarea
          name="body"
          required
          maxLength={MAX_NOTE_LENGTH}
          rows={2}
          defaultValue={state.body}
          placeholder="What just happened? (Shift + Enter to save)"
          onKeyDown={submitOnShiftEnter}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Chapter <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            name="chapter"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_CHAPTER}
            defaultValue={state.chapter}
            className="w-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save note"}
        </button>
        {state.message && <p role="status" className="text-sm text-muted">{state.message}</p>}
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      </div>
    </form>
  );
}
