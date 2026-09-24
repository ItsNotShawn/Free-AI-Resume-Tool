import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import type { DraftContent } from "@/lib/ai/ground";
import { createClient } from "@/lib/supabase/server";

export default async function DraftsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("drafts")
    .select("id, content, created_at, job_targets(title, company)")
    .order("created_at", { ascending: false });
  const drafts = (data ?? []) as unknown as {
    id: string;
    content: DraftContent;
    created_at: string;
    job_targets: { title: string; company: string | null } | null;
  }[];

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Resume drafts</h1>
          <Link
            href="/generate"
            className="shrink-0 rounded-md bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            + New resume
          </Link>
        </div>

        {drafts.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
            <p className="font-medium">No drafts yet</p>
            <Link href="/generate" className="mt-2 inline-block text-sm underline">
              Paste a job posting to make your first one
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {drafts.map((d) => {
              const lines = d.content.roles.reduce((n, r) => n + r.bullets.length, 0);
              const flagged = d.content.roles.reduce((n, r) => n + r.bullets.filter((b) => b.flags.length).length, 0);
              return (
                <li key={d.id}>
                  <Link
                    href={`/drafts/${d.id}`}
                    className="block rounded-lg border border-stone-200 p-5 hover:border-stone-400 dark:border-stone-800 dark:hover:border-stone-600"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="font-medium">
                        {d.job_targets?.title ?? "Untitled"}
                        {d.job_targets?.company ? <span className="text-stone-500"> at {d.job_targets.company}</span> : null}
                      </h2>
                      <span className="text-sm text-stone-500">{new Date(d.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-1 text-sm text-stone-500">
                      {lines} lines
                      {flagged > 0 && <span className="text-amber-700"> · {flagged} flagged</span>}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
