"use client";

import { useActionState } from "react";
import { saveEdition } from "@/app/books/chapter-actions";
import type { ActionState } from "@/app/books/actions";
import type { EditionFormat } from "@/lib/library/queries";

const FORMAT_LABELS: Record<EditionFormat, string> = {
  hardcover: "Hardcover",
  paperback: "Paperback",
  mass_market: "Mass market paperback",
  ebook: "Ebook",
  audiobook: "Audiobook",
  other: "Other",
};

export type EditionValues = {
  isbn: string | null;
  publisher: string | null;
  format: EditionFormat | null;
  total_pages: number | null;
  calibration_chapter: number | null;
  calibration_page: number | null;
};

/**
 * Edition details (VISION §5.3). Page numbers differ between printings, so these let
 * step 4 turn "I'm on page 212" into the right chapter. Everything is optional.
 */
export function EditionForm({ entryId, values }: { entryId: string; values: EditionValues }) {
  const [state, action, pending] = useActionState(saveEdition, {} as ActionState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="entryId" value={entryId} />
      {values.isbn && (
        <p className="text-sm">
          <span className="text-muted">ISBN:</span> {values.isbn}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Publisher">
          <input name="publisher" defaultValue={values.publisher ?? ""} maxLength={200} className={inputClass} />
        </Field>
        <Field label="Format">
          <select name="format" defaultValue={values.format ?? ""} className={inputClass}>
            <option value="">Not sure</option>
            {Object.entries(FORMAT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Total pages">
          <input name="totalPages" type="number" inputMode="numeric" min={1} max={20000} defaultValue={values.total_pages ?? ""} className={inputClass} />
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">A page you know</legend>
        <p className="mb-2 text-xs text-muted">Helps match page numbers to chapters in your edition.</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          Chapter
          <input name="calibrationChapter" type="number" inputMode="numeric" min={1} max={1000} defaultValue={values.calibration_chapter ?? ""} aria-label="Chapter" className={`${inputClass} w-20`} />
          starts on page
          <input name="calibrationPage" type="number" inputMode="numeric" min={1} max={20000} defaultValue={values.calibration_page ?? ""} aria-label="Page" className={`${inputClass} w-24`} />
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60">
          {pending ? "Saving…" : "Save edition"}
        </button>
        {state.message && <p role="status" className="text-sm text-muted">{state.message}</p>}
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";
