import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { AI_MODEL, aiClient, isAiConfigured, logAiError } from "@/lib/ai/client";
import { cleanLines, cleanRecapText } from "./text";

/**
 * Writes the "previously on…" recap (VISION §5.6). The rules in the prompt map to the
 * spec's principles: never spoil (§4.1), be honest about uncertainty (§4.2), short over
 * thorough (§4.3), and read like a book, not a chatbot (§4.6).
 */

export type Confidence = "high" | "medium" | "low";
export type ShortRecap = {
  knowsBook: boolean;
  confidence: Confidence;
  bullets: string[];
  characters: { name: string; who: string }[];
};
export type DetailRecap = { knowsBook: boolean; confidence: Confidence; paragraphs: string[] };

const RULES = `You write the "previously on…" page a reader sees when they pick a book back up after a break. They read it, think "oh right," and keep reading.

Never spoil:
- Only include what happens up to the end of the chapter the reader has finished. Nothing after it: no hints, no foreshadowing, no "little do they know," no mention of who matters later.
- Describe characters and places only as they're known by that point in the book.
- If you aren't sure whether something has happened yet, leave it out. Saying less is always fine.

Be honest:
- The reader's own notes are ground truth. Where they differ from what you remember, follow the notes.
- confidence: "high" if you know this book's plot in detail up to this point, "medium" if you know it roughly, "low" if you're unsure. If you don't know the book at all, set knows_book to false and return empty lists rather than guessing.

Tone and style:
- If the reader's notes have a clear voice (funny, blunt, emotional, full of slang), match that energy. Otherwise write in a warm, neutral voice.
- Write like the recap page of a novel, or a friend catching them up: plain, natural sentences in the past tense.
- No preamble or sign-off ("Here's your recap," "Hope this helps"), no questions, no emojis, no markdown, no bold, no headings. Avoid stock phrases like "delve," "tapestry," "a testament to," "it's worth noting."`;

const ShortSchema = z.object({
  knows_book: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  bullets: z.array(z.string()).describe("3 to 5 short points, oldest events first, one or two sentences each."),
  characters: z
    .array(z.object({ name: z.string(), who: z.string().describe("A few words: who they are so far.") }))
    .describe("Up to 8 main characters introduced so far, most important first."),
});

const DetailSchema = z.object({
  knows_book: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  paragraphs: z.array(z.string()).describe("3 to 6 short paragraphs telling the story so far, in order."),
});

export async function writeShortRecap(promptInput: string): Promise<ShortRecap | null> {
  const answer = await ask(promptInput, "Write the short recap: 3 to 5 points, plus the main characters so far.", ShortSchema);
  if (!answer) return null;
  return {
    knowsBook: answer.knows_book,
    confidence: answer.confidence,
    bullets: cleanLines(answer.bullets, 5),
    characters: answer.characters
      .map((c) => ({ name: cleanRecapText(c.name), who: cleanRecapText(c.who) }))
      .filter((c) => c.name)
      .slice(0, 8),
  };
}

export async function writeDetailRecap(promptInput: string): Promise<DetailRecap | null> {
  const answer = await ask(promptInput, "Write the longer recap: the story so far in 3 to 6 short paragraphs.", DetailSchema);
  if (!answer) return null;
  return { knowsBook: answer.knows_book, confidence: answer.confidence, paragraphs: cleanLines(answer.paragraphs, 6) };
}

async function ask<T extends z.ZodType>(promptInput: string, task: string, schema: T): Promise<z.infer<T> | null> {
  if (!isAiConfigured()) return null;
  try {
    const response = await aiClient().beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      system: RULES,
      messages: [{ role: "user", content: `${promptInput}\n\n${task}` }],
      // Recaps are the product: worth more care than a lookup.
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
    return (response.parsed_output as z.infer<T> | null) ?? null;
  } catch (error) {
    logAiError("writing a recap", error);
    return null;
  }
}
