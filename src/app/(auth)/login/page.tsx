import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/ui";
import { ExpiredLinkNotice } from "./ExpiredLinkNotice";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Pick up right where you left off."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-accent underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {/* Reads the URL, so it's the only part that isn't prerendered. */}
      <Suspense>
        <ExpiredLinkNotice />
      </Suspense>
      <LoginForm />
    </AuthShell>
  );
}
