import { Suspense } from "react";
import { logOut } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth/current-user";

// The header and heading are static and load instantly; only the parts that
// depend on who's logged in wait for the session (see <Suspense> below).
export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <span className="font-serif text-xl font-semibold tracking-tight">BookTalk</span>
        <Suspense>
          <AccountMenu />
        </Suspense>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-serif text-2xl font-semibold">Your library</h1>
        <Suspense fallback={<div className="mt-6 h-32 animate-pulse rounded-2xl bg-border/40" />}>
          <Library />
        </Suspense>
      </main>
    </div>
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

async function Library() {
  await getCurrentUser();
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-muted">
      No books yet. Adding books is coming soon.
    </div>
  );
}
