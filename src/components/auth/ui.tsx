import Link from "next/link";
import type { ReactNode } from "react";
import type { FormState } from "@/app/(auth)/actions";

export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 font-serif text-2xl font-semibold tracking-tight">
        BookTalk
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="font-serif text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
    </main>
  );
}

export function EmailInput({ defaultValue }: { defaultValue?: string }) {
  return (
    <Label text="Email">
      <input
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={defaultValue}
        className={inputClass}
      />
    </Label>
  );
}

/**
 * A PIN field. `type="password"` hides the digits; `inputMode="numeric"` brings up the
 * number pad on phones; `autoComplete` lets password managers save and fill it.
 */
export function PinInput({ name = "pin", label, length, isNew = false }: {
  name?: string;
  label: string;
  /** Exact length required. Omit to accept either 4 or 6. */
  length?: 4 | 6;
  isNew?: boolean;
}) {
  return (
    <Label text={label}>
      <input
        name={name}
        type="password"
        inputMode="numeric"
        autoComplete={isNew ? "new-password" : "current-password"}
        required
        minLength={length ?? 4}
        maxLength={length ?? 6}
        pattern={length ? `\\d{${length}}` : "\\d{4}(\\d{2})?"}
        title={length ? `${length} digits` : "4 or 6 digits"}
        className={`${inputClass} tracking-[0.5em]`}
      />
    </Label>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="rounded-lg bg-success-surface px-3 py-2 text-sm">
        {state.message}
      </p>
    );
  }
  return null;
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "One moment…" : children}
    </button>
  );
}

function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{text}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";
