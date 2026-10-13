"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logIn, sendUnlockLink, type FormState } from "../actions";
import { EmailInput, FormMessage, PinInput, SubmitButton } from "@/components/auth/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(logIn, {} as FormState);
  const [unlockState, unlockAction, unlockPending] = useActionState(sendUnlockLink, {} as FormState);
  const showUnlock = state.locked && !unlockState.message;

  return (
    <form action={action} className="space-y-4">
      <EmailInput defaultValue={state.email} />
      <PinInput label="PIN" />
      <FormMessage state={unlockState.message || unlockState.error ? unlockState : state} />
      {showUnlock && (
        // Same form, different action: reuses the email already typed. formNoValidate
        // skips the PIN field's "required" check, since no PIN is needed to unlock.
        <button
          type="submit"
          formAction={unlockAction}
          formNoValidate
          disabled={unlockPending}
          className="w-full rounded-lg border border-accent px-4 py-2.5 font-medium text-accent transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {unlockPending ? "Sending…" : "Email me an unlock link"}
        </button>
      )}
      <SubmitButton pending={pending}>Log in</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/forgot-pin" className="text-muted underline-offset-4 hover:underline">
          Forgot your PIN?
        </Link>
      </p>
    </form>
  );
}
