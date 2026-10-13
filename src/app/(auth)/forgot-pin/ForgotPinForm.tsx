"use client";

import { useActionState } from "react";
import { requestPinReset, type FormState } from "../actions";
import { EmailInput, FormMessage, SubmitButton } from "@/components/auth/ui";

export function ForgotPinForm() {
  const [state, action, pending] = useActionState(requestPinReset, {} as FormState);

  if (state.message) return <FormMessage state={state} />;

  return (
    <form action={action} className="space-y-4">
      <EmailInput defaultValue={state.email} />
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Send reset link</SubmitButton>
    </form>
  );
}
