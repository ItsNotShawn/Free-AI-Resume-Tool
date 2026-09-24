import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { SubmitButton } from "@/components/SubmitButton";
import { monthStartIso } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { generateResume } from "./actions";

// Generation calls the AI and can take up to ~90s.
export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FREE_MONTHLY_GENERATIONS = 15;
const input =
  "mt-1 block w-full rounded-md border border-stone-300 bg-transparent px-3 py-2 dark:border-stone-700";

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; job?: string }>;
}) {
  const { error, job } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ count: factCount }, { count: usedThisMonth }, prefill] = await Promise.all([
    supabase.from("confirmed_atoms").select("id", { count: "exact", head: true }),
    supabase.from("generation_events").select("id", { count: "exact", head: true }).gte("created_at", monthStartIso()),
    job && UUID.test(job)
      ? supabase.from("job_targets").select("title, company, description").eq("id", job).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const p = (prefill.data ?? null) as { title: string; company: string | null; description: string } | null;
  const facts = factCount ?? 0;

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">New targeted resume</h1>
        <p className="mb-6 mt-1 text-sm text-stone-500">
          Paste a job posting. The AI picks and rewords your confirmed facts for it. Every line will show which facts it
          came from, and a fact check flags anything it can&apos;t trace back.
        </p>

        <ErrorBanner message={error} />

        {facts < 3 ? (
          <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center dark:border-stone-700">
            <p className="font-medium">You need a few confirmed facts first</p>
            <p className="mt-1 text-sm text-stone-500">
              You have {facts}. Add at least 3 in your{" "}
              <Link href="/library" className="underline">
                experience library
              </Link>
              .
            </p>
          </div>
        ) : (
          <form action={generateResume} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">Job title *</span>
                <input name="title" required maxLength={200} defaultValue={p?.title} className={input} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Company</span>
                <input name="company" maxLength={200} defaultValue={p?.company ?? ""} className={input} />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium">Job description *</span>
              <textarea
                name="description"
                required
                rows={14}
                maxLength={30000}
                defaultValue={p?.description}
                placeholder="Paste the whole posting: responsibilities, requirements, nice-to-haves."
                className={`${input} text-sm`}
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton pendingText="Generating… (usually 20–60 seconds)">Generate resume</SubmitButton>
              <span className="text-xs text-stone-500">
                Uses {facts} confirmed facts · {usedThisMonth ?? 0} of {FREE_MONTHLY_GENERATIONS} free generations used
                this month
              </span>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
