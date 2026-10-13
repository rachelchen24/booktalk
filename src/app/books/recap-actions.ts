"use server";

import { refresh } from "next/cache";
import { isAiConfigured } from "@/lib/ai/client";
import { getSavedRecap, loadRecapContext, writeAndSaveRecap, type RecapLevel } from "@/lib/recap/service";
import type { ActionState } from "./actions";

/**
 * Writes the recap if there isn't an up-to-date saved one. Called from the browser once
 * the recap page is actually on screen (never during a background prefetch), so an AI
 * call only happens when a reader really asked for it.
 */
export async function generateRecap(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const level: RecapLevel = formData.get("level") === "detail" ? "detail" : "short";
  if (!isAiConfigured()) return { error: "Written recaps aren't set up." };

  const context = await loadRecapContext(String(formData.get("entryId") ?? ""));
  if (!context || context === "no-chapters") return { error: "Something went wrong. Please reload the page." };
  if (context.scope.through < 1) return {};

  if (await getSavedRecap(context, level)) {
    refresh();
    return {};
  }
  const ok = await writeAndSaveRecap(context, level);
  if (!ok) return { error: "BookTalk couldn't write a recap just now. Your notes are below." };
  refresh();
  return {};
}
