"use client";

import { useActionState, useState } from "react";
import { resetPin, type FormState } from "../actions";
import { FormMessage, PinInput, SubmitButton } from "@/components/auth/ui";

export function ResetPinForm() {
  const [state, action, pending] = useActionState(resetPin, {} as FormState);
  const [length, setLength] = useState<4 | 6>(4);
  const other = length === 4 ? 6 : 4;

  return (
    <form action={action} className="space-y-4">
      <div key={length} className="space-y-4">
        <PinInput label={`New ${length}-digit PIN`} length={length} isNew />
        <PinInput name="confirmPin" label="Type it again" length={length} isNew />
      </div>
      <button
        type="button"
        onClick={() => setLength(other)}
        className="text-sm text-muted underline-offset-4 hover:underline"
      >
        Use a {other}-digit PIN instead
      </button>
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Save new PIN</SubmitButton>
    </form>
  );
}
