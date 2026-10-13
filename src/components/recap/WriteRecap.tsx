"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { generateRecap } from "@/app/books/recap-actions";
import type { ActionState } from "@/app/books/actions";

/**
 * Asks the server to write a recap. With `auto`, it starts as soon as the page is on
 * screen; that's on purpose. Next.js prefetches pages in the background, and running
 * the AI during a prefetch would spend money on recaps nobody opened. Otherwise it's a
 * "More detail" button.
 */
export function WriteRecap({ entryId, level, auto = false }: { entryId: string; level: "short" | "detail"; auto?: boolean }) {
  const [state, action, pending] = useActionState(generateRecap, {} as ActionState);
  const started = useRef(false);

  function run() {
    const formData = new FormData();
    formData.set("entryId", entryId);
    formData.set("level", level);
    startTransition(() => action(formData));
  }

  useEffect(() => {
    // The ref keeps React's development double-run from asking for two recaps.
    if (auto && !started.current) {
      started.current = true;
      run();
    }
    // Runs once on mount; `run` only depends on props that don't change on this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.error) return <p className="text-sm text-muted">{state.error}</p>;

  if (pending || auto) {
    return (
      <div aria-busy="true" aria-label="Writing your recap" className="space-y-3">
        <p className="text-sm text-muted">Putting your recap together…</p>
        {[85, 70, 90].map((width) => (
          <div key={width} className="h-4 animate-pulse rounded bg-border/50" style={{ width: `${width}%` }} />
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={run}
      className="rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-success-surface"
    >
      More detail
    </button>
  );
}
