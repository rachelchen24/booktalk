import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { AI_MODEL, aiClient, fallbackParams, isAiConfigured, logAiError } from "@/lib/ai/client";
import { parseChapters, type Chapter } from "./list";

/**
 * AI-suggested chapter lists. Optional: with no ANTHROPIC_API_KEY the app never calls
 * the API and readers use "Add ___ chapters" instead.
 */

// The model must say whether it actually knows the book before listing anything.
// This is how "be honest about uncertainty" (VISION §4.2) is enforced: when it doesn't
// know, we get an empty answer instead of plausible-sounding invented chapters.
const ChapterListSchema = z.object({
  knows_chapters: z
    .boolean()
    .describe("True only if you reliably know this book's real chapter titles or count."),
  chapters: z
    .array(z.object({ title: z.string().describe("The chapter's title as printed, or empty if untitled.") }))
    .describe("Every chapter in order, or an empty list if knows_chapters is false."),
});

const SYSTEM_PROMPT = `You list the chapters of published books for a reading app.

Give the chapters as printed in the book's most common English edition, in order. Include prologues and epilogues if the book numbers or titles them like chapters; leave out front and back matter (contents, acknowledgments, about the author).

Give titles only. Never describe what happens in a chapter: readers use this list mid-book, and a description could spoil it.

Only answer if you genuinely know this book's chapters. If you are unsure of the titles or the number of chapters, set knows_chapters to false and return an empty list. An empty answer is far better than a guessed one.`;

export type BookForAi = { title: string; authors: string[]; firstPublishYear: number | null };

/** Returns a chapter list, or null if the model doesn't know the book (or anything fails). */
export async function suggestChaptersWithAi(book: BookForAi): Promise<Chapter[] | null> {
  if (!isAiConfigured()) return null;

  const description = [
    `Title: ${book.title}`,
    book.authors.length ? `Author: ${book.authors.join(", ")}` : null,
    book.firstPublishYear ? `First published: ${book.firstPublishYear}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await aiClient().beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `List the chapters of this book.\n\n${description}` }],
      // A lookup, not a hard reasoning task.
      output_config: { effort: "low", format: betaZodOutputFormat(ChapterListSchema) },
      // If a safety classifier declines, retry on a fallback model (where the model supports it).
      ...fallbackParams(),
    });

    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
    const answer = response.parsed_output;
    if (!answer?.knows_chapters) return null;

    // Validate and number the list ourselves; model output is untrusted input like any other.
    const parsed = parseChapters(answer.chapters);
    return parsed.ok ? parsed.chapters : null;
  } catch (error) {
    logAiError("suggesting chapters", error);
    return null;
  }
}
