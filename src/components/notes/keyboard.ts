import type { KeyboardEvent } from "react";

/**
 * Shift + Enter saves a note; plain Enter still makes a new line. Skipped while an
 * input method (e.g. for Japanese or Chinese) is composing, where Enter confirms text.
 */
export function submitOnShiftEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key === "Enter" && event.shiftKey && !event.nativeEvent.isComposing) {
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }
}
