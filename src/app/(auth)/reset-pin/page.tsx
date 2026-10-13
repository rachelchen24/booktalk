import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/ui";
import { ResetPinForm } from "./ResetPinForm";

export const metadata: Metadata = { title: "Choose a new PIN" };

// Reached from the reset email via /auth/confirm, which has already logged the reader in.
export default function ResetPinPage() {
  return (
    <AuthShell title="Choose a new PIN" subtitle="Your account is unlocked. Pick a PIN you'll remember.">
      <ResetPinForm />
    </AuthShell>
  );
}
