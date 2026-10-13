import Link from "next/link";
import { AuthShell } from "@/components/auth/ui";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Just an email and a PIN. No password rules."
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
