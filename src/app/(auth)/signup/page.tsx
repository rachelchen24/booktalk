import type { Metadata } from "next";
import Link from "next/link";
import { TryDemo } from "@/components/auth/TryDemo";
import { AuthShell } from "@/components/auth/ui";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Just an email and a PIN. No password rules."
      aside={<TryDemo />}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
