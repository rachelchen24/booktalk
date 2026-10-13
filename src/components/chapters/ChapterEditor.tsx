"use client";

import { useActionState, useRef, useState } from "react";
import { saveChapters } from "@/app/books/chapter-actions";
import type { ActionState } from "@/app/books/actions";
import { MAX_CHAPTERS, MAX_TITLE_LENGTH, type Chapter } from "@/lib/chapters/list";

type Row = { key: number; title: string };

/**
 * Edit the reader's own chapter list. Saving writes a private copy (VISION §5.4),
 * so changes here never affect anyone else's chapters.
 */
export function ChapterEditor({ entryId, initial, saveLabel = "Save chapters" }: {
  entryId: string;
  initial: Chapter[];
  saveLabel?: string;
}) {
  const nextKey = useRef(initial.length);
  const [rows, setRows] = useState<Row[]>(() => initial.map((chapter, i) => ({ key: i, title: chapter.title })));
  const [count, setCount] = useState("");
  const [state, action, pending] = useActionState(saveChapters, {} as ActionState);

  const room = MAX_CHAPTERS - rows.length;
  const n = Number(count);
  const canAdd = Number.isInteger(n) && n >= 1 && n <= room;

  // "Add 33 chapters" → Chapter 1…33 appear at once; titles are optional.
  function addChapters() {
    if (!canAdd) return;
    const added = Array.from({ length: n }, () => ({ key: nextKey.current++, title: "" }));
    setRows((current) => [...current, ...added]);
    setCount("");
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="entryId" value={entryId} />

      <div className="flex flex-wrap items-center gap-3">
        {/* Reads as one sentence, "Add [33] chapters", with the number typed into the blank. */}
        <div className="inline-flex items-center overflow-hidden rounded-lg border border-accent bg-background focus-within:ring-2 focus-within:ring-accent/30">
          <label htmlFor="chapter-count" className="py-2 pl-3 text-sm font-medium text-accent">
            Add
          </label>
          <input
            id="chapter-count"
            type="number"
            inputMode="numeric"
            min={1}
            max={room}
            value={count}
            placeholder="33"
            aria-label="Number of chapters to add"
            onChange={(event) => setCount(event.target.value)}
            onKeyDown={(event) => {
              // Enter adds chapters instead of submitting the whole form.
              if (event.key === "Enter") {
                event.preventDefault();
                addChapters();
              }
            }}
            className="mx-2 w-12 border-b-2 border-dashed border-accent/50 bg-transparent py-0.5 text-center font-medium tabular-nums outline-none placeholder:text-muted/60 focus:border-solid focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="pr-3 text-sm font-medium text-accent">{n === 1 ? "chapter" : "chapters"}</span>
          <button
            type="button"
            onClick={addChapters}
            disabled={!canAdd}
            aria-label={canAdd ? `Add ${n} ${n === 1 ? "chapter" : "chapters"}` : "Add chapters"}
            className="self-stretch bg-accent px-3 text-lg leading-none text-accent-foreground hover:opacity-90 disabled:opacity-40"
          >
            +
          </button>
        </div>
        {rows.length > 0 && (
          <span className="text-sm text-muted">
            {rows.length} {rows.length === 1 ? "chapter" : "chapters"} so far
          </span>
        )}
      </div>

      {rows.length > 0 && (
        <ol className="divide-y divide-border rounded-xl border border-border bg-surface">
          {rows.map((row, i) => (
            <li key={row.key} className="flex items-center gap-3 px-3 py-2">
              <span className="w-24 shrink-0 text-sm text-muted">Chapter {i + 1}</span>
              <input
                name="title"
                value={row.title}
                maxLength={MAX_TITLE_LENGTH}
                placeholder="Title (optional)"
                aria-label={`Chapter ${i + 1} title`}
                onChange={(event) =>
                  setRows((current) => current.map((r) => (r.key === row.key ? { ...r, title: event.target.value } : r)))
                }
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 outline-none hover:border-border focus:border-accent focus:bg-background"
              />
              <button
                type="button"
                aria-label={`Remove chapter ${i + 1}`}
                onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                className="shrink-0 px-1 text-lg leading-none text-muted hover:text-danger"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || rows.length === 0}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : saveLabel}
        </button>
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      </div>
    </form>
  );
}
