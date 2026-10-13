import Link from "next/link";
import { AuthShell } from "@/components/auth/ui";
import { ForgotPinForm } from "./ForgotPinForm";

export default function ForgotPinPage() {
  return (
    <AuthShell
      title="Forgot your PIN?"
      subtitle="We'll email you a link to choose a new one."
      footer={
        <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          Back to log in
        </Link>
      }
    >
      <ForgotPinForm />
    </AuthShell>
  );
}
