"use client";

import Link from "next/link";
import { useActionState, useOptimistic, useState, useSyncExternalStore } from "react";
import { addNote, type NoteState } from "@/app/books/actions";
import { markSpot, moveNote } from "@/app/books/chapter-actions";
import { AnchorFields } from "@/components/notes/AnchorFields";
import { submitOnShiftEnter } from "@/components/notes/keyboard";
import { NoteCard } from "@/components/notes/NoteCard";
import { chapterName, type Chapter } from "@/lib/chapters/list";
import { MAX_NOTE_LENGTH, type Note } from "@/lib/library/notes";

type View = "list" | "grid";
const VIEW_KEY = "booktalk:chapter-view";

type Props = {
  entryId: string;
  chapters: Chapter[];
  currentChapter: number | null;
  notesByChapter: Record<number, Note[]>;
  /** Notes with no chapter, or a chapter number that isn't in this list. */
  unplacedNotes: Note[];
};

/**
 * The book page's chapters (VISION §5.2a, §5.4): a list or a grid, one tap to mark
 * your spot, read chapters shaded, a bookmark on your spot, and a green dot on every
 * chapter you've left notes in. In the list, a chapter opens to show its notes.
 */
export function ChapterSection({ entryId, chapters, currentChapter, notesByChapter, unplacedNotes }: Props) {
  // List vs. grid is remembered in this browser. useSyncExternalStore reads it from
  // localStorage after hydration (the server always renders "list"), without the extra
  // render a setState-in-useEffect would cause.
  const view = useSyncExternalStore(subscribeToView, readView, () => "list" as View);

  // Optimistic spot: the bookmark moves the moment you tap, and the save to the
  // database finishes in the background. If it fails, React puts the bookmark back.
  const [spot, setSpot] = useOptimistic(currentChapter);
  async function mark(formData: FormData) {
    setSpot(Number(formData.get("chapter")));
    await markSpot(formData);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Chapter view" className="flex rounded-lg border border-border p-0.5 text-sm">
          {(["list", "grid"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => chooseView(option)}
              className="rounded-md px-3 py-1 capitalize aria-pressed:bg-accent aria-pressed:text-accent-foreground"
            >
              {option}
            </button>
          ))}
        </div>
        <Link href={`/books/${entryId}/chapters`} className="text-sm text-muted underline-offset-4 hover:underline">
          Edit chapters &amp; edition
        </Link>
      </div>

      {view === "list" ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {chapters.map((chapter) => (
            <ChapterRow
              key={chapter.number}
              entryId={entryId}
              chapter={chapter}
              status={statusOf(chapter.number, spot)}
              notes={notesByChapter[chapter.number] ?? []}
              mark={mark}
            />
          ))}
        </ul>
      ) : (
        <ChapterGrid entryId={entryId} chapters={chapters} currentChapter={spot} notesByChapter={notesByChapter} mark={mark} />
      )}

      {unplacedNotes.length > 0 && <UnplacedNotes notes={unplacedNotes} chapters={chapters} />}
    </div>
  );
}

// localStorage can throw (private windows, blocked storage); fall back to memory.
let fallbackView: View = "list";
const viewListeners = new Set<() => void>();

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "list";
  } catch {
    return fallbackView;
  }
}

function chooseView(next: View) {
  fallbackView = next;
  try {
    localStorage.setItem(VIEW_KEY, next);
  } catch {}
  viewListeners.forEach((listener) => listener());
}

function subscribeToView(listener: () => void) {
  viewListeners.add(listener);
  window.addEventListener("storage", listener); // another tab changed it
  return () => {
    viewListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

type Status = "read" | "current" | "unread";
function statusOf(chapter: number, current: number | null): Status {
  if (current === null || chapter > current) return "unread";
  return chapter === current ? "current" : "read";
}

type MarkAction = (formData: FormData) => Promise<void>;

function ChapterRow({ entryId, chapter, status, notes, mark }: {
  entryId: string;
  chapter: Chapter;
  status: Status;
  notes: Note[];
  mark: MarkAction;
}) {
  // A new note shows up in the list immediately, greyed out until it's saved.
  const [shownNotes, addPendingNote] = useOptimistic(notes, (current, note: Note) => [...current, note]);

  return (
    <li className={`flex items-start ${status === "unread" ? "" : "bg-success-surface/60"}`}>
      <details className="group min-w-0 flex-1">
        <summary className="flex cursor-pointer list-none items-center gap-3 py-3 pl-4 pr-2 [&::-webkit-details-marker]:hidden">
          <span className="w-6 shrink-0 text-right text-sm tabular-nums text-muted">{chapter.number}</span>
          <span className="min-w-0 flex-1 truncate">{chapterName(chapter)}</span>
          {shownNotes.length > 0 && (
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
              <NoteDot />
              {shownNotes.length}
            </span>
          )}
          <span aria-hidden className="shrink-0 text-muted transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="pb-4 pl-13 pr-4">
          <ChapterNotes entryId={entryId} chapter={chapter.number} notes={shownNotes} onAdd={addPendingNote} />
        </div>
      </details>
      <SpotButton entryId={entryId} chapter={chapter} isCurrent={status === "current"} mark={mark} />
    </li>
  );
}

/** A chapter's notes and its "add a note" box. Shared by list rows and the grid's panel. */
function ChapterNotes({ entryId, chapter, notes, onAdd }: {
  entryId: string;
  chapter: number;
  notes: Note[];
  onAdd: (note: Note) => void;
}) {
  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} pending={note.id.startsWith(PENDING)} />
      ))}
      <ChapterNoteForm entryId={entryId} chapter={chapter} onAdd={onAdd} />
    </div>
  );
}

/** One tap: "I've read up to here." */
function SpotButton({ entryId, chapter, isCurrent, mark }: {
  entryId: string;
  chapter: Chapter;
  isCurrent: boolean;
  mark: MarkAction;
}) {
  return (
    <form action={mark} className="shrink-0 py-2 pr-2">
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="chapter" value={chapter.number} />
      <button
        type="submit"
        aria-label={isCurrent ? `You're here: ${chapterName(chapter)}` : `Mark ${chapterName(chapter)} as my spot`}
        aria-pressed={isCurrent}
        title={isCurrent ? "You're here" : "I've read up to here"}
        className={`rounded-md p-1.5 ${isCurrent ? "text-accent" : "text-border hover:text-muted"}`}
      >
        <BookmarkIcon filled={isCurrent} />
      </button>
    </form>
  );
}

function ChapterGrid({ entryId, chapters, currentChapter, notesByChapter, mark }: {
  entryId: string;
  chapters: Chapter[];
  currentChapter: number | null;
  notesByChapter: Record<number, Note[]>;
  mark: MarkAction;
}) {
  // Tapping a box opens that chapter below the grid: its notes, a note box, and the
  // "I've read up to here" button. Tapping it again closes it.
  const [open, setOpen] = useState<number | null>(null);
  const openChapter = open === null ? null : chapters[open - 1];

  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {chapters.map((chapter) => {
          const status = statusOf(chapter.number, currentChapter);
          const hasNotes = (notesByChapter[chapter.number] ?? []).length > 0;
          const isOpen = open === chapter.number;
          return (
            <li key={chapter.number}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : chapter.number)}
                aria-expanded={isOpen}
                aria-controls="grid-chapter-panel"
                title={chapterName(chapter)}
                aria-label={`${chapterName(chapter)}${status === "current" ? ", your spot" : ""}${hasNotes ? ", has notes" : ""}`}
                className={`relative flex aspect-square w-full flex-col items-center justify-center rounded-lg border text-lg tabular-nums transition-colors ${
                  status === "current"
                    ? "border-accent bg-accent text-accent-foreground"
                    : status === "read"
                      ? "border-transparent bg-success-surface"
                      : "border-border bg-surface hover:border-accent"
                } ${isOpen ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""}`}
              >
                {chapter.number}
                {status === "current" && (
                  <span className="absolute right-1 top-0.5">
                    <BookmarkIcon filled small />
                  </span>
                )}
                {hasNotes && (
                  <span className="absolute bottom-1.5">
                    <NoteDot />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {openChapter ? (
        <GridChapterPanel
          key={openChapter.number}
          entryId={entryId}
          chapter={openChapter}
          isCurrent={currentChapter === openChapter.number}
          notes={notesByChapter[openChapter.number] ?? []}
          mark={mark}
        />
      ) : (
        <p className="text-xs text-muted">Tap a chapter to see its notes or mark it as your spot.</p>
      )}
    </div>
  );
}

/** The chapter opened from the grid. `key` resets it when a different chapter opens. */
function GridChapterPanel({ entryId, chapter, isCurrent, notes, mark }: {
  entryId: string;
  chapter: Chapter;
  isCurrent: boolean;
  notes: Note[];
  mark: MarkAction;
}) {
  const [shownNotes, addPendingNote] = useOptimistic(notes, (current, note: Note) => [...current, note]);
  return (
    <section id="grid-chapter-panel" aria-label={chapterName(chapter)} className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-medium">
          <span className="text-muted">{chapter.number}.</span> {chapterName(chapter)}
        </h3>
        <form action={mark}>
          <input type="hidden" name="entryId" value={entryId} />
          <input type="hidden" name="chapter" value={chapter.number} />
          <button
            type="submit"
            aria-pressed={isCurrent}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${
              isCurrent ? "border-accent bg-accent text-accent-foreground" : "border-accent text-accent hover:bg-success-surface"
            }`}
          >
            <BookmarkIcon filled={isCurrent} small />
            {isCurrent ? "You're here" : "I've read up to here"}
          </button>
        </form>
      </div>
      <ChapterNotes entryId={entryId} chapter={chapter.number} notes={shownNotes} onAdd={addPendingNote} />
    </section>
  );
}

const PENDING = "pending-";

function ChapterNoteForm({ entryId, chapter, onAdd }: {
  entryId: string;
  chapter: number;
  onAdd: (note: Note) => void;
}) {
  const [state, action] = useActionState(addNote, {} as NoteState);

  // Runs inside the form's transition, so the optimistic note lasts until the save
  // (and the page refresh after it) finishes.
  function submit(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();
    if (body) onAdd({ id: `${PENDING}${Date.now()}`, chapter, body, created_at: new Date().toISOString() });
    action(formData);
  }

  return (
    <form action={submit} className="space-y-1">
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="chapter" value={chapter} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <textarea
          name="body"
          required
          rows={1}
          maxLength={MAX_NOTE_LENGTH}
          defaultValue={state.body}
          placeholder="Add a note to this chapter"
          aria-label={`Add a note to chapter ${chapter}`}
          onKeyDown={submitOnShiftEnter}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-accent px-3 py-2 text-sm font-medium text-accent hover:bg-success-surface"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs text-muted">Shift + Enter to save · @ to tag people and places</span>
        <AnchorFields page={state.page} time={state.time} quote={state.quote} />
      </div>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

function UnplacedNotes({ notes, chapters }: { notes: Note[]; chapters: Chapter[] }) {
  return (
    <section className="rounded-xl border border-dashed border-border p-4">
      <h3 className="text-sm font-medium">General notes</h3>
      <p className="mt-0.5 text-xs text-muted">Notes about the whole book. If one belongs to a chapter, you can move it there.</p>
      <ul className="mt-3 space-y-3">
        {notes.map((note) => (
          <li key={note.id} className="space-y-2">
            <NoteCard note={note} />
            <form action={moveNote} className="flex items-center gap-2">
              <input type="hidden" name="noteId" value={note.id} />
              <select
                name="chapter"
                defaultValue=""
                required
                aria-label="Move to chapter"
                className="min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm"
              >
                <option value="" disabled>
                  Move to chapter…
                </option>
                {chapters.map((chapter) => (
                  <option key={chapter.number} value={chapter.number}>
                    {chapter.number}. {chapterName(chapter)}
                  </option>
                ))}
              </select>
              <button type="submit" className="text-sm text-accent underline-offset-4 hover:underline">
                Move
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NoteDot() {
  return <span aria-label="Has notes" className="inline-block h-2 w-2 rounded-full bg-green-600" />;
}

function BookmarkIcon({ filled, small = false }: { filled: boolean; small?: boolean }) {
  const size = small ? 12 : 18;
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <path d="M6 3h12v18l-6-4.5L6 21z" />
    </svg>
  );
}
