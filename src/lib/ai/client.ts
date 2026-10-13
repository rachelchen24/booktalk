import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Shared Claude setup. AI is optional: with no ANTHROPIC_API_KEY the app never calls
 * the API, and every AI feature has a non-AI fallback.
 *
 * The model is a setting so it can be swapped for a cheaper one (e.g. claude-haiku-5-5)
 * without code changes.
 */
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function aiClient(): Anthropic {
  return new Anthropic();
}

/** Server-side logging for API failures; readers just see "couldn't do that". */
export function logAiError(task: string, error: unknown): void {
  if (error instanceof Anthropic.AuthenticationError) {
    console.error(`ANTHROPIC_API_KEY was rejected (${task}). Check the key in .env.local.`);
  } else if (error instanceof Anthropic.RateLimitError) {
    console.error(`Claude API rate limit hit (${task}).`);
  } else if (error instanceof Anthropic.APIError) {
    console.error(`Claude API error ${error.status} (${task}):`, error.message);
  } else {
    console.error(`${task} failed`, error);
  }
}
