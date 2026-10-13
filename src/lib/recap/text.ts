/**
 * Cleans up model-written text before it's shown, so a recap never looks pasted from a
 * chat (VISION principle 6): no markdown bold/italics, no leading bullet characters, no
 * "Here's your recap:" style openers.
 */
export function cleanRecapText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\s)\*(\S.+?\S|\S)\*(?=\s|[.,;:!?]|$)/g, "$1$2")
    .replace(/^\s*(?:[-•*]|\d+[.)])\s+/, "")
    .replace(/^(?:sure|certainly|of course|here(?:'s| is) (?:a |your |the )?(?:quick )?recap)[^a-z0-9]*?[:!.,-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cleans a list of model-written lines, dropping empties and keeping at most `max`. */
export function cleanLines(lines: string[], max: number): string[] {
  return lines.map(cleanRecapText).filter(Boolean).slice(0, max);
}
