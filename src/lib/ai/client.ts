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

// Models that support server-side fallbacks (a declined request is retried on another
// model). Claude Haiku 5.5 has none: sending `fallbacks` there does nothing, or fails
// the request outright, so it's only added for models that support it.
const MODELS_WITH_FALLBACKS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

/** Spread into a `beta.messages` request: fallback settings when the model supports them. */
export function fallbackParams(): { betas?: ["server-side-fallback-2026-07-01"]; fallbacks?: "default" } {
  return MODELS_WITH_FALLBACKS.has(AI_MODEL)
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }
    : {};
}

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
