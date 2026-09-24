import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <h1 className="text-4xl font-semibold tracking-tight">Resume Memory</h1>
      <p className="mt-4 text-lg text-stone-600 dark:text-stone-400">
        Tell it your real experience once. Paste a job posting later and get a
        targeted resume built only from what you actually did.
      </p>
      <div className="mt-8">
        <Link
          href="/login"
          className="inline-block rounded-md bg-stone-900 px-5 py-2.5 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
        >
          Get started free
        </Link>
      </div>
    </main>
  );
}
