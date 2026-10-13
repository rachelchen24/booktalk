"use client";

import { useEffect } from "react";
import { markOpened } from "../actions";

/**
 * Records that the reader opened this book, so it moves to the top of their library.
 * Runs in the browser after the page is on screen. Next.js prefetches pages for
 * links in view, and doing this on the server during render would count those
 * prefetches as opens.
 */
export function MarkOpened({ entryId }: { entryId: string }) {
  useEffect(() => {
    markOpened(entryId);
  }, [entryId]);
  return null;
}
