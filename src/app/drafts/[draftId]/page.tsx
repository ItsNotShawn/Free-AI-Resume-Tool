import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { SubmitButton } from "@/components/SubmitButton";
import type { DraftContent } from "@/lib/ai/ground";
import { formatRange } from "@/lib/months";
import { createClient } from "@/lib/supabase/server";
import { KIND_LABEL, type AtomKind } from "@/lib/types";
import { deleteDraft } from "@/app/generate/actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FactRow = { id: string; role_id: string; kind: AtomKind; text: string; evidence: string | null };

export default async function DraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ draftId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { draftId } = await params;
  const { error } = await searchParams;
  if (!UUID.test(draftId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("drafts")
    .select("id, content, model, created_at, job_targets(title, company, description)")
    .eq("id", draftId)
    .maybeSingle();
  if (!row) notFound();

  const draft = row as unknown as {
    id: string;
    content: DraftContent;
    model: string | null;
    created_at: string;
    job_targets: { title: string; company: string | null; description: string } | null;
  };
  const c = draft.content;
  const job = draft.job_targets;

  // All current confirmed facts: to show sources and what went unused.
  const { data: factRows } = await supabase
    .from("confirmed_atoms")
    .select("id, role_id, kind, text, evidence")
    .order("created_at", { ascending: true });
  const facts = (factRows ?? []) as unknown as FactRow[];
  const factById = new Map(facts.map((f) => [f.id, f]));

  const used = new Set<string>();
  for (const r of c.roles) for (const b of r.bullets) b.atom_ids.forEach((id) => used.add(id));
  c.skills.forEach((s) => used.add(s.atom_id));
  const unused = facts.filter((f) => !used.has(f.id));
  const flagged = c.roles.reduce((n, r) => n + r.bullets.filter((b) => b.flags.length).length, 0);
  const lines = c.roles.reduce((n, r) => n + r.bullets.length, 0);

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/drafts" className="text-sm text-stone-500 hover:underline">
          ← All drafts
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {job?.title ?? "Resume draft"}
          {job?.company ? <span className="font-normal text-stone-500"> at {job.company}</span> : null}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Generated {new Date(draft.created_at).toLocaleString()} · {lines} lines from {used.size} of your confirmed facts
        </p>

        <div className="mt-6">
          <ErrorBanner message={error} />
        </div>

        <div
          className={`mb-6 rounded-md border px-4 py-3 text-sm ${
            flagged || c.removed.length
              ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
              : "border-green-300 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
          }`}
        >
          {flagged === 0 && c.removed.length === 0 ? (
            <p>Fact check passed: every line cites your confirmed facts and adds nothing new.</p>
          ) : (
            <>
              {flagged > 0 && (
                <p>
                  <strong>{flagged}</strong> {flagged === 1 ? "line is" : "lines are"} highlighted because {flagged === 1 ? "it says" : "they say"} something
                  your facts don&apos;t. Read the reason, and don&apos;t send a line you can&apos;t back up.
                </p>
              )}
              {c.removed.length > 0 && (
                <p className={flagged ? "mt-1" : ""}>
                  {c.removed.length} {c.removed.length === 1 ? "line was" : "lines were"} removed automatically (see the
                  bottom of the page).
                </p>
              )}
            </>
          )}
          <p className="mt-1 text-xs opacity-80">Click any line to see the facts it came from.</p>
        </div>

        {/* The resume */}
        <article className="rounded-lg border border-stone-200 bg-white p-8 text-stone-900 shadow-sm dark:border-stone-800">
          <header className="border-b border-stone-200 pb-4">
            <p className="text-xl font-semibold">Your Name</p>
            <p className="text-sm text-stone-500">{user.email} · contact details and export come next milestone</p>
          </header>

          <h2 className="mt-6 text-xs font-semibold uppercase tracking-wider text-stone-500">Experience</h2>
          <div className="mt-3 space-y-6">
            {c.roles.map((r) => (
              <section key={r.role_id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">
                    {r.title} <span className="font-normal">· {r.company}</span>
                    {r.location ? <span className="font-normal text-stone-500"> · {r.location}</span> : null}
                  </p>
                  <p className="text-sm text-stone-500">{formatRange(r.start_month, r.end_month, r.is_current)}</p>
                </div>
                {r.bullets.length === 0 ? (
                  <p className="mt-1 text-sm italic text-stone-400">No lines chosen for this job.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {r.bullets.map((b, i) => (
                      <li key={i}>
                        <details className={`rounded ${b.flags.length ? "bg-amber-50 ring-1 ring-amber-300" : ""}`}>
                          <summary className="flex cursor-pointer list-none gap-2 rounded px-1 py-0.5 text-sm hover:bg-stone-100">
                            <span aria-hidden>•</span>
                            <span className="flex-1">
                              {b.text}
                              {b.flags.length > 0 && <span className="ml-1 text-amber-700">⚠</span>}
                            </span>
                            <span className="shrink-0 text-xs text-stone-400">
                              {b.atom_ids.length} {b.atom_ids.length === 1 ? "fact" : "facts"}
                            </span>
                          </summary>
                          <div className="mb-2 ml-5 mt-1 space-y-1 border-l-2 border-stone-200 pl-3 text-xs">
                            {b.flags.map((f, j) => (
                              <p key={j} className="text-amber-800">
                                ⚠ {f}
                              </p>
                            ))}
                            <p className="font-medium text-stone-600">Based on:</p>
                            {b.atom_ids.map((id) => {
                              const f = factById.get(id);
                              return f ? (
                                <p key={id} className="text-stone-600">
                                  <span className="text-stone-400">[{KIND_LABEL[f.kind]}]</span> {f.text}
                                  {f.evidence && (
                                    <span className="block italic text-stone-400">from your note: “{f.evidence}”</span>
                                  )}
                                </p>
                              ) : (
                                <p key={id} className="italic text-stone-400">
                                  (a fact you&apos;ve since deleted or unconfirmed)
                                </p>
                              );
                            })}
                          </div>
                        </details>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {c.skills.length > 0 && (
            <>
              <h2 className="mt-6 text-xs font-semibold uppercase tracking-wider text-stone-500">Skills &amp; tools</h2>
              <p className="mt-2 text-sm">{c.skills.map((s) => s.text).join(" · ")}</p>
              <p className="mt-1 text-xs text-stone-400">Taken word for word from your skill and tool facts.</p>
            </>
          )}
        </article>

        {/* Transparency */}
        <div className="mt-8 space-y-3">
          {c.removed.length > 0 && (
            <details className="rounded-lg border border-stone-200 dark:border-stone-800">
              <summary className="cursor-pointer px-5 py-3 text-sm font-medium">
                Removed by the fact check ({c.removed.length})
              </summary>
              <ul className="space-y-2 px-5 pb-5 text-sm">
                {c.removed.map((x, i) => (
                  <li key={i}>
                    <span className="text-stone-400 line-through">{x.text}</span>
                    <span className="block text-xs text-stone-500">{x.reason}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <details className="rounded-lg border border-stone-200 dark:border-stone-800">
            <summary className="cursor-pointer px-5 py-3 text-sm font-medium">
              Facts not used in this draft ({unused.length})
            </summary>
            <ul className="space-y-1 px-5 pb-5 text-sm text-stone-600 dark:text-stone-400">
              {unused.length === 0 && <li>None. Every confirmed fact was used.</li>}
              {unused.map((f) => (
                <li key={f.id}>
                  <span className="text-xs text-stone-400">[{KIND_LABEL[f.kind]}]</span> {f.text}
                </li>
              ))}
            </ul>
          </details>

          {job && (
            <details className="rounded-lg border border-stone-200 dark:border-stone-800">
              <summary className="cursor-pointer px-5 py-3 text-sm font-medium">Job posting</summary>
              <p className="whitespace-pre-wrap px-5 pb-5 text-sm text-stone-600 dark:text-stone-400">{job.description}</p>
            </details>
          )}
        </div>

        <form action={deleteDraft.bind(null, draft.id)} className="mt-10">
          <SubmitButton variant="secondary" pendingText="Deleting…">
            Delete this draft
          </SubmitButton>
        </form>
      </main>
    </div>
  );
}
