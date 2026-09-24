import Link from "next/link";

export function AppHeader({ email }: { email: string | undefined }) {
  return (
    <header className="border-b border-stone-200 dark:border-stone-800">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold">
            Resume Memory
          </Link>
          <Link href="/library" className="text-sm hover:underline">
            Experience library
          </Link>
          <Link href="/generate" className="text-sm hover:underline">
            New resume
          </Link>
          <Link href="/drafts" className="text-sm hover:underline">
            Drafts
          </Link>
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-stone-500 sm:inline">{email}</span>
          <form action="/auth/signout" method="post">
            <button className="underline hover:no-underline">Sign out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
