"use client";

import { useActionState, useState } from "react";
import { signUp, type FormState } from "../actions";
import { EmailInput, FormMessage, PinInput, SubmitButton } from "@/components/auth/ui";

const LENGTH_OPTIONS = [
  { length: 4, label: "4 digits", hint: "Quick and easy" },
  { length: 6, label: "6 digits", hint: "More secure" },
] as const;

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, {} as FormState);
  const [length, setLength] = useState<4 | 6>(4);

  if (state.message) return <FormMessage state={state} />;

  return (
    <form action={action} className="space-y-4">
      <EmailInput defaultValue={state.email} />

      <fieldset>
        <legend className="mb-1 text-sm font-medium">PIN length</legend>
        <div className="grid grid-cols-2 gap-2">
          {LENGTH_OPTIONS.map((option) => (
            <label
              key={option.length}
              className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-success-surface has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/30"
            >
              <input
                type="radio"
                name="pinLength"
                value={option.length}
                checked={length === option.length}
                onChange={() => setLength(option.length)}
                className="sr-only"
              />
              <span className="block font-medium">{option.label}</span>
              <span className="block text-muted">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* key resets the fields when the length changes, so a half-typed PIN can't linger. */}
      <div key={length} className="space-y-4">
        <PinInput label={`Choose a ${length}-digit PIN`} length={length} isNew />
        <PinInput name="confirmPin" label="Type it again" length={length} isNew />
      </div>

      <FormMessage state={state} />
      <SubmitButton pending={pending}>Create account</SubmitButton>
    </form>
  );
}
