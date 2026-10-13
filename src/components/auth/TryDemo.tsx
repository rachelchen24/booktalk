"use client";

import { useActionState } from "react";
import { startDemo, type FormState } from "@/app/(auth)/actions";

/** "Just looking?" One click into a private demo account with a sample library. */
export function TryDemo() {
  const [state, action, pending] = useActionState(startDemo, {} as FormState);
  return (
    <form action={action} className="w-full max-w-sm rounded-2xl border border-dashed border-accent/50 px-6 py-4 text-center">
      <p className="text-sm text-foreground">Just looking around?</p>
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-lg border border-accent px-4 py-2 font-medium text-accent hover:bg-success-surface disabled:opacity-60"
      >
        {pending ? "Setting up your demo…" : "Try the demo"}
      </button>
      <p className="mt-2 text-xs text-muted">No sign-up. You get your own sample library to play with.</p>
      {state.error && <p role="alert" className="mt-2 text-sm text-danger">{state.error}</p>}
    </form>
  );
}
