"use client";

import { useState } from "react";
import { MAX_QUOTE_LENGTH } from "@/lib/library/notes";

/**
 * Optional page / audiobook time / quote snippet for a note (VISION §5.7). Collapsed by
 * default so the note box stays one quick field; opens on its own if any are filled in.
 */
export function AnchorFields({ page, time, quote }: { page?: string; time?: string; quote?: string }) {
  const [open, setOpen] = useState(Boolean(page || time || quote));

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline">
        + Page, time or quote
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium">Page</span>
        <input name="page" type="number" inputMode="numeric" min={1} max={20000} defaultValue={page} className={`${fieldClass} w-20`} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium">Audiobook time</span>
        <input name="time" defaultValue={time} placeholder="3h 42m" className={`${fieldClass} w-24`} />
      </label>
      <label className="block min-w-48 flex-1">
        <span className="mb-1 block text-xs font-medium">Paragraph starting with…</span>
        <input name="quote" defaultValue={quote} maxLength={MAX_QUOTE_LENGTH} placeholder="The first few words" className={`${fieldClass} w-full`} />
      </label>
    </div>
  );
}

const fieldClass =
  "rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";
