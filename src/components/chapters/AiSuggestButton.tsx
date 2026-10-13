"use client";

import { useActionState } from "react";
import { suggestWithAi } from "@/app/books/chapter-actions";
import type { ActionState } from "@/app/books/actions";

export function AiSuggestButton({ entryId }: { entryId: string }) {
  const [state, action, pending] = useActionState(suggestWithAi, {} as ActionState);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="entryId" value={entryId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-success-surface disabled:opacity-60"
      >
        {pending ? "Looking up chapters…" : "Suggest the chapters for me"}
      </button>
      {state.error && <p role="alert" className="text-sm text-muted">{state.error}</p>}
    </form>
  );
}
