"use client";

import { useActionState } from "react";
import { addBook, type ActionState } from "@/app/books/actions";

/** Only the work key (and ISBN, if searched by one) is sent; the server looks up the rest. */
export function AddButton({ workKey, isbn }: { workKey: string; isbn: string | null }) {
  const [state, action, pending] = useActionState(addBook, {} as ActionState);

  return (
    <form action={action} className="flex shrink-0 flex-col items-end gap-1">
      <input type="hidden" name="workKey" value={workKey} />
      {isbn && <input type="hidden" name="isbn" value={isbn} />}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-success-surface disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      {state.error && <p role="alert" className="max-w-48 text-right text-xs text-danger">{state.error}</p>}
    </form>
  );
}
