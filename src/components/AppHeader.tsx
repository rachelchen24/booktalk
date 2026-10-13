import Link from "next/link";
import { Suspense } from "react";
import { logOut } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth/current-user";

/** Static header shell; only the account menu waits for the session. */
export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
      <Link href="/" className="font-serif text-xl font-semibold tracking-tight">
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
      <span className="hidden text-muted sm:inline">{user.email}</span>
      <button type="submit" className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface">
        Log out
      </button>
    </form>
  );
}
