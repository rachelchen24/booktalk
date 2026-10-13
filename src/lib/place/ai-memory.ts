import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { AI_MODEL, aiClient, isAiConfigured, logAiError } from "@/lib/ai/client";
import { chapterName, type Chapter } from "@/lib/chapters/list";

/**
 * "Last thing I remember" → chapter numbers, using the model's knowledge of the book.
 * Only used when the reader's notes didn't find it, and only if AI is set up.
 *
 * Spoiler safety (VISION §4.1, §5.5): the model answers with chapter NUMBERS only. It is
 * never asked to describe anything, and nothing it writes about events is shown, so even
 * a model that knows the whole plot can't leak it.
 */
const MemoryAnswerSchema = z.object({
  knows_book: z.boolean().describe("True only if you know this book's plot well enough to place the event."),
  chapters: z
    .array(z.number().int())
    .describe("Up to 3 chapter numbers where this most likely happens, most likely first. Empty if unsure."),
});

const SYSTEM_PROMPT = `You help a reader find their place in a book they're reading.

The reader describes the last thing they remember. Reply with the chapter number(s) where that happens, using the chapter list provided: up to three, most likely first.

Reply with chapter numbers only. Never describe events, characters or what comes next: the reader is mid-book and anything more could spoil it.

If you don't know this book well, or can't place the event, set knows_book to false and return no chapters. A wrong chapter is worse than none.`;

export type BookForMemory = { title: string; authors: string[] };

export async function findChaptersByMemory(
  book: BookForMemory,
  chapters: Chapter[],
  memory: string,
): Promise<number[]> {
  if (!isAiConfigured()) return [];

  const chapterList = chapters.map((chapter) => `${chapter.number}. ${chapterName(chapter)}`).join("\n");
  const content = [
    `Book: ${book.title}${book.authors.length ? ` by ${book.authors.join(", ")}` : ""}`,
    `Chapters:\n${chapterList}`,
    `The last thing the reader remembers:\n${memory}`,
  ].join("\n\n");

  try {
    const response = await aiClient().beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      output_config: { effort: "low", format: betaZodOutputFormat(MemoryAnswerSchema) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return [];
    const answer = response.parsed_output;
    if (!answer?.knows_book) return [];

    // Untrusted output: keep only real chapter numbers, no repeats, at most three.
    const valid = answer.chapters.filter((n) => Number.isInteger(n) && n >= 1 && n <= chapters.length);
    return [...new Set(valid)].slice(0, 3);
  } catch (error) {
    logAiError("finding a chapter by memory", error);
    return [];
  }
}
