"use client";

import { useRef, useState, useSyncExternalStore } from "react";

/**
 * Optional voice note (VISION §5.8): the browser's own speech-to-text turns what you say
 * into text in the note box, where you can fix it before saving. Nothing is saved until
 * you press Save.
 *
 * Browser support: Chrome, Edge and Safari have it (Chrome sends the audio to Google's
 * speech service to transcribe it). Firefox doesn't, so Firefox readers get a short
 * message instead of a button that wouldn't work.
 */

// The Web Speech API isn't in TypeScript's built-in DOM types, so describe what we use.
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionClass = new () => Recognition;

function getRecognition(): RecognitionClass | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Support = "yes" | "firefox" | "no";
function readSupport(): Support {
  if (getRecognition()) return "yes";
  return /firefox/i.test(navigator.userAgent) ? "firefox" : "no";
}
const subscribe = () => () => {};

export function VoiceNoteButton({ onText }: { onText: (text: string) => void }) {
  // Support never changes while the page is open. useSyncExternalStore reads it in the
  // browser without a hydration mismatch (the server doesn't know the browser).
  const support = useSyncExternalStore<Support | null>(subscribe, readSupport, () => null);
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);

  if (support === null) return null;
  if (support !== "yes") {
    return (
      <p className="text-xs text-muted">
        {support === "firefox"
          ? "Voice notes don't work in Firefox yet. Try Chrome, Edge or Safari, or type your note."
          : "Voice notes don't work in this browser. Try Chrome, Edge or Safari, or type your note."}
      </p>
    );
  }

  function start() {
    const Recognition = getRecognition();
    if (!Recognition) return;
    const r = new Recognition();
    r.lang = navigator.language || "en-US";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) onText(text);
    };
    r.onerror = (event) => {
      setProblem(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Allow microphone access to use voice notes."
          : event.error === "no-speech"
            ? "Didn't catch that. Try again?"
            : "Voice notes stopped working. You can type instead.",
      );
    };
    r.onend = () => setListening(false);
    recognition.current = r;
    setProblem(null);
    setListening(true);
    r.start();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => (listening ? recognition.current?.stop() : start())}
        aria-pressed={listening}
        aria-label={listening ? "Stop recording" : "Record a voice note"}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${
          listening ? "border-danger text-danger" : "border-border text-muted hover:border-accent hover:text-accent"
        }`}
      >
        <MicIcon />
        {listening ? "Listening… tap to stop" : "Speak"}
      </button>
      {problem && <span className="text-xs text-muted">{problem}</span>}
    </span>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}
