"use client";

import { useActionState, useState } from "react";
import { saveReview, type ActionState } from "../actions";
import { MAX_FINAL_THOUGHTS } from "@/lib/library/format";

export function ReviewForm({ entryId, rating, finalThoughts }: {
  entryId: string;
  rating: number | null;
  finalThoughts: string | null;
}) {
  const [state, action, pending] = useActionState(saveReview, {} as ActionState);
  const [stars, setStars] = useState(rating ?? 0);
  const [hover, setHover] = useState(0);
  const shown = hover || stars;

  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="rating" value={stars || ""} />

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Your rating</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={stars === n}
              onClick={() => setStars(stars === n ? 0 : n)}
              onMouseEnter={() => setHover(n)}
              className={`text-2xl leading-none transition-colors ${n <= shown ? "text-amber-500" : "text-border"}`}
            >
              ★
            </button>
          ))}
          {stars > 0 && (
            <button
              type="button"
              onClick={() => setStars(0)}
              className="ml-2 text-sm text-muted underline-offset-4 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Final thoughts</span>
        <textarea
          name="finalThoughts"
          defaultValue={finalThoughts ?? ""}
          maxLength={MAX_FINAL_THOUGHTS}
          rows={4}
          placeholder="What stayed with you?"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {state.message && <p role="status" className="text-sm text-muted">{state.message}</p>}
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      </div>
    </form>
  );
}
