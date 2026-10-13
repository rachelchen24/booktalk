/**
 * @tags for characters and places (VISION §5.7), read straight from note text.
 *
 * "@Alice" tags one word. Multi-word names keep going while the next word is
 * capitalized: "@Kiamo Ko is far away" tags "Kiamo Ko". To stop a name early, lowercase
 * the next word or add punctuation: "@Alice, Bob and Carol" tags just "Alice".
 */
const TAG = /@([\p{Lu}\p{Ll}\p{N}][\p{L}\p{N}'’-]*(?:[ \t]+\p{Lu}[\p{L}\p{N}'’-]*)*)/gu;

export type TextPart = { text: string; tag?: string };

/** Splits note text into plain text and tags, for highlighting tags in place. */
export function splitTags(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(TAG)) {
    const start = match.index!;
    // An @ inside a word is an email address or similar, not a tag.
    if (start > 0 && /[\p{L}\p{N}.]/u.test(text[start - 1])) continue;
    if (start > last) parts.push({ text: text.slice(last, start) });
    const name = trimTag(match[1]);
    parts.push({ text: `@${name}`, tag: name });
    last = start + 1 + name.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** The distinct tags in some text, as written (first spelling wins). */
export function extractTags(text: string): string[] {
  const seen = new Map<string, string>();
  for (const part of splitTags(text)) {
    if (part.tag && !seen.has(tagKey(part.tag))) seen.set(tagKey(part.tag), part.tag);
  }
  return [...seen.values()];
}

/** Tags match regardless of case: @alice and @Alice are the same person. */
export function tagKey(tag: string): string {
  return tag.toLocaleLowerCase();
}

export type TagSummary = { tag: string; count: number };

/** Every tag across some notes, with how many notes mention it, most-mentioned first. */
export function summarizeTags(notes: { body: string }[]): TagSummary[] {
  const counts = new Map<string, TagSummary>();
  for (const note of notes) {
    for (const tag of extractTags(note.body)) {
      const key = tagKey(tag);
      const summary = counts.get(key) ?? { tag, count: 0 };
      summary.count += 1;
      counts.set(key, summary);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function mentionsTag(body: string, tag: string): boolean {
  return extractTags(body).some((t) => tagKey(t) === tagKey(tag));
}

// Drop trailing apostrophes or possessives so "@Alice's" tags "Alice".
function trimTag(name: string): string {
  return name.replace(/['’]s$/u, "").replace(/['’-]+$/u, "");
}
