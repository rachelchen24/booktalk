import Link from "next/link";
import { Suspense } from "react";
import { logOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth/current-user";

/** Static header shell; only the account menu waits for the session. */
export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
      <Link href="/" className="flex items-center gap-2 font-serif text-xl font-semibold tracking-tight">
        <Logo className="h-7 w-7" />
        BookTalk
      </Link>
      <Suspense>
        <AccountMenu />
      </Suspense>
    </header>
  );
}

async function AccountMenu() {
  const user = await getCurrentUser();
  return (
    <form action={logOut} className="flex items-center gap-3 text-sm">
      {user.isDemo ? (
        <span className="rounded-full bg-success-surface px-2.5 py-0.5 text-xs font-medium text-accent">Demo</span>
      ) : (
        <span className="hidden text-muted sm:inline">{user.email}</span>
      )}
      <button
        type="submit"
        title={user.isDemo ? "Your demo library is deleted after a week" : undefined}
        className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface"
      >
        {user.isDemo ? "Leave demo" : "Log out"}
      </button>
    </form>
  );
}
