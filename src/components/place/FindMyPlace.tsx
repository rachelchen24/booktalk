"use client";

import { useActionState, useState } from "react";
import { findByMemory, setSpot, type MemoryState } from "@/app/books/place-actions";
import { chapterName, percentThrough, type Chapter } from "@/lib/chapters/list";
import {
  estimateFromPage,
  estimateFromPercent,
  estimateFromTime,
  formatDuration,
  parseDuration,
  type Calibration,
  type Estimate,
} from "@/lib/place/estimate";

type Method = "chapter" | "page" | "time" | "percent" | "memory";

const METHODS: { id: Method; label: string }[] = [
  { id: "chapter", label: "Chapter" },
  { id: "page", label: "Page number" },
  { id: "time", label: "Audiobook time" },
  { id: "percent", label: "Percentage" },
  { id: "memory", label: "Last thing I remember" },
];

type Props = {
  entryId: string;
  chapters: Chapter[];
  currentChapter: number | null;
  totalPages: number | null;
  calibration: Calibration | null;
  audiobookMinutes: number | null;
  aiAvailable: boolean;
};

/**
 * "Find my place by…" (VISION §5.5). Every method ends in the same place: a short list
 * of possible chapters showing only number, title and % (never what happens in them),
 * and the reader taps the right one.
 */
export function FindMyPlace(props: Props) {
  const [method, setMethod] = useState<Method>("chapter");

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 font-medium">Find my place by:</legend>
        <div className="flex flex-wrap gap-2">
          {METHODS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={method === option.id}
              onClick={() => setMethod(option.id)}
              className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-foreground"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        {method === "chapter" && <ByChapter {...props} />}
        {method === "page" && <ByPage {...props} />}
        {method === "time" && <ByTime {...props} />}
        {method === "percent" && <ByPercent {...props} />}
        {method === "memory" && <ByMemory {...props} />}
      </div>
    </div>
  );
}

function ByChapter({ entryId, chapters, currentChapter }: Props) {
  const [chapter, setChapter] = useState(currentChapter ?? 1);
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">The chapter you&apos;re on</span>
        <select value={chapter} onChange={(e) => setChapter(Number(e.target.value))} className={inputClass}>
          {chapters.map((c) => (
            <option key={c.number} value={c.number}>
              {c.number}. {chapterName(c)}
            </option>
          ))}
        </select>
      </label>
      <SaveSpot entryId={entryId} chapter={chapter} percent={percentThrough(chapter, chapters.length)} />
    </div>
  );
}

function ByPage({ entryId, chapters, totalPages, calibration }: Props) {
  const [page, setPage] = useState("");
  const [total, setTotal] = useState(totalPages ? String(totalPages) : "");
  const pageN = Number(page);
  const totalN = Number(total);
  const valid = isWhole(pageN) && isWhole(totalN) && pageN <= totalN;
  const estimate = valid ? estimateFromPage(pageN, totalN, chapters.length, calibration) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <NumberField label="Page you're on" value={page} onChange={setPage} />
        <NumberField label="Total pages" value={total} onChange={setTotal} hint={totalPages ? "From your edition" : "Saved for next time"} />
      </div>
      {page && total && !valid && <p className="text-sm text-danger">That page is past the end of the book.</p>}
      <EstimateNote calibrated={Boolean(calibration)} />
      {estimate && (
        <Candidates entryId={entryId} chapters={chapters} estimate={estimate} extra={{ totalPages: String(totalN) }} />
      )}
    </div>
  );
}

function ByTime({ entryId, chapters, audiobookMinutes }: Props) {
  const [time, setTime] = useState("");
  const [length, setLength] = useState(audiobookMinutes ? formatDuration(audiobookMinutes) : "");
  const timeN = parseDuration(time);
  const lengthN = parseDuration(length);
  const valid = timeN !== null && lengthN !== null && lengthN > 0 && timeN <= lengthN;
  const estimate = valid ? estimateFromTime(timeN, lengthN, chapters.length) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <TextField label="Where you are" value={time} onChange={setTime} placeholder="3h 42m" />
        <TextField
          label="Total length"
          value={length}
          onChange={setLength}
          placeholder="11h 5m"
          hint={audiobookMinutes ? "Saved from last time" : "Saved for next time"}
        />
      </div>
      {time && timeN === null && <p className="text-sm text-danger">Try a time like 3h 42m or 3:42.</p>}
      {timeN !== null && lengthN !== null && timeN > lengthN && (
        <p className="text-sm text-danger">That&apos;s past the end of the audiobook.</p>
      )}
      <EstimateNote />
      {estimate && lengthN !== null && (
        <Candidates entryId={entryId} chapters={chapters} estimate={estimate} extra={{ audiobookMinutes: String(lengthN) }} />
      )}
    </div>
  );
}

function ByPercent({ entryId, chapters }: Props) {
  const [percent, setPercent] = useState("");
  const n = Number(percent);
  const valid = percent !== "" && Number.isFinite(n) && n >= 0 && n <= 100;
  return (
    <div className="space-y-4">
      <NumberField label="Percent through the book" value={percent} onChange={setPercent} max={100} min={0} suffix="%" />
      <EstimateNote />
      {valid && <Candidates entryId={entryId} chapters={chapters} estimate={estimateFromPercent(n, chapters.length)} />}
    </div>
  );
}

function ByMemory({ entryId, chapters, aiAvailable }: Props) {
  const [state, action, pending] = useActionState(findByMemory, {} as MemoryState);
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="entryId" value={entryId} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium">The last thing you remember</span>
          <textarea
            name="memory"
            rows={2}
            maxLength={500}
            defaultValue={state.memory}
            placeholder="Elphaba ran away with Fiyero"
            className={inputClass}
          />
        </label>
        <p className="text-xs text-muted">
          {aiAvailable
            ? "BookTalk checks your notes first, then what it knows about the book."
            : "BookTalk searches your notes for this. The more notes you keep, the better it works."}
        </p>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Looking…" : "Find it"}
        </button>
      </form>
      {state.error && <p role="alert" className="text-sm text-muted">{state.error}</p>}
      {state.chapters && state.chapters.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            {state.source === "notes" ? "From your notes:" : "BookTalk thinks it's one of these:"}
          </p>
          <ul className="space-y-2">
            {state.chapters.map((n, i) => (
              <CandidateRow
                key={n}
                entryId={entryId}
                chapter={chapters[n - 1]}
                percent={percentThrough(n, chapters.length)}
                best={i === 0}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Best guess plus its neighbours. Only number, title and % are shown: nothing that could spoil. */
function Candidates({ entryId, chapters, estimate, extra }: {
  entryId: string;
  chapters: Chapter[];
  estimate: Estimate;
  extra?: Record<string, string>;
}) {
  return (
    <ul className="space-y-2">
      {estimate.candidates.map((n) => (
        <CandidateRow
          key={n}
          entryId={entryId}
          chapter={chapters[n - 1]}
          percent={n === estimate.chapter ? estimate.percent : percentThrough(n, chapters.length)}
          best={n === estimate.chapter}
          extra={extra}
        />
      ))}
    </ul>
  );
}

function CandidateRow({ entryId, chapter, percent, best, extra }: {
  entryId: string;
  chapter: Chapter;
  percent: number;
  best: boolean;
  extra?: Record<string, string>;
}) {
  return (
    <li className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${best ? "border-accent bg-success-surface/60" : "border-border"}`}>
      <span className="w-8 shrink-0 text-right tabular-nums text-muted">{chapter.number}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{chapterName(chapter)}</span>
        <span className="text-xs text-muted">
          {Math.round(percent)}% through the book{best ? " · most likely" : ""}
        </span>
      </span>
      <SaveSpot entryId={entryId} chapter={chapter.number} percent={percent} extra={extra} compact />
    </li>
  );
}

function SaveSpot({ entryId, chapter, percent, extra, compact = false }: {
  entryId: string;
  chapter: number;
  percent: number;
  extra?: Record<string, string>;
  compact?: boolean;
}) {
  return (
    <form action={setSpot} className="shrink-0">
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="chapter" value={chapter} />
      <input type="hidden" name="percent" value={percent} />
      {Object.entries(extra ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" className={compact ? "rounded-lg border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-success-surface" : primaryButton}>
        {compact ? "This is my spot" : "Save my spot"}
      </button>
    </form>
  );
}

function EstimateNote({ calibrated = false }: { calibrated?: boolean }) {
  return (
    <p className="text-xs text-muted">
      An estimate, since chapters vary in length{calibrated ? " (adjusted using the page you gave for your edition)" : ""}.
      Pick whichever chapter looks right.
    </p>
  );
}

function NumberField({ label, value, onChange, hint, min = 1, max, suffix }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <span className="flex items-center gap-2">
        <input type="number" inputMode="decimal" min={min} max={max} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} w-28`} />
        {suffix && <span className="text-muted">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function TextField({ label, value, onChange, placeholder, hint }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputClass} w-36`} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function isWhole(n: number): boolean {
  return Number.isInteger(n) && n >= 1;
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";
const primaryButton =
  "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60";
