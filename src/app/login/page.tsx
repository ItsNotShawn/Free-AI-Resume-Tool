import Link from "next/link";
import { sendMagicLink } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Link href="/" className="text-sm text-stone-500 hover:underline">
        ← Resume Memory
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Log in or sign up</h1>

      {sent ? (
        <div className="mt-6 rounded-md border border-stone-300 p-4 dark:border-stone-700">
          <p>
            Check <strong>{sent}</strong> for a sign-in link. You can close this
            tab.
          </p>
          <p className="mt-2 text-sm text-stone-500">
            Open the link in this same browser. No email after a minute? Check
            spam, or <Link href="/login" className="underline">try again</Link>.
          </p>
        </div>
      ) : (
        <form action={sendMagicLink} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-1 block w-full rounded-md border border-stone-300 bg-transparent px-3 py-2 dark:border-stone-700"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-stone-900 px-4 py-2 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            Email me a sign-in link
          </button>
          <p className="text-sm text-stone-500">No password needed.</p>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
    </main>
  );
}
