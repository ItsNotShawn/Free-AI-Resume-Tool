import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { SubmitButton } from "@/components/SubmitButton";
import { createClient } from "@/lib/supabase/server";
import { ATOM_KINDS, type Atom, type SourceNote } from "@/lib/types";
import { confirmReview, discardReview } from "@/app/library/structure-actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ roleId: string; noteId: string }>;
  searchParams: Promise<{ error?: string; dropped?: string }>;
}) {
  const { roleId, noteId } = await params;
  const { error, dropped } = await searchParams;
  if (!UUID.test(roleId) || !UUID.test(noteId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: role }, { data: note }, { data: atomRows }] = await Promise.all([
    supabase.from("roles").select("id, title, company").eq("id", roleId).maybeSingle(),
    supabase.from("source_notes").select("*").eq("id", noteId).eq("role_id", roleId).maybeSingle(),
    supabase
      .from("atoms")
      .select("*")
      .eq("role_id", roleId)
      .eq("source_note_id", noteId)
      .eq("status", "proposed")
      .order("created_at", { ascending: true }),
  ]);
  if (!role || !note) notFound();

  const r = role as unknown as { id: string; title: string; company: string };
  const n = note as unknown as SourceNote;
  const atoms = (atomRows ?? []) as unknown as Atom[];
  if (atoms.length === 0) redirect(`/library/${roleId}`);

  const flagged = atoms.filter((a) => a.review_note).length;
  const droppedCount = Number(dropped) || 0;

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href={`/library/${roleId}`} className="text-sm text-stone-500 hover:underline">
          ← {r.title} at {r.company}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Review what the AI found</h1>
        <p className="mb-6 mt-1 text-sm text-stone-500">
          {atoms.length} suggestions from your note. Ticked items become confirmed facts in your library;
          unticked ones are thrown away. Edit anything that isn&apos;t quite right before saving.
        </p>

        <ErrorBanner message={error} />

        {(flagged > 0 || droppedCount > 0) && (
          <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {flagged > 0 && (
              <p>
                <strong>{flagged}</strong> {flagged === 1 ? "item needs" : "items need"} your input and{" "}
                {flagged === 1 ? "starts" : "start"} unticked. Read the note under each one.
              </p>
            )}
            {droppedCount > 0 && (
              <p className={flagged > 0 ? "mt-1" : ""}>
                {droppedCount} {droppedCount === 1 ? "suggestion was" : "suggestions were"} thrown out automatically
                because {droppedCount === 1 ? "it" : "they"} couldn&apos;t be traced back to what you wrote.
              </p>
            )}
          </div>
        )}

        <details className="mb-8 rounded-lg border border-stone-200 dark:border-stone-800">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium">Your note</summary>
          <p className="whitespace-pre-wrap px-5 pb-5 text-sm text-stone-600 dark:text-stone-400">{n.body}</p>
        </details>

        <form action={confirmReview.bind(null, roleId, noteId)} className="space-y-10">
          {ATOM_KINDS.map(({ kind, label }) => {
            const items = atoms.filter((a) => a.kind === kind);
            if (items.length === 0) return null;
            return (
              <section key={kind}>
                <h2 className="text-lg font-semibold">{label}</h2>
                <ul className="mt-3 space-y-3">
                  {items.map((a) => (
                    <li
                      key={a.id}
                      className={`rounded-lg border p-4 ${
                        a.review_note
                          ? "border-amber-300 dark:border-amber-800"
                          : "border-stone-200 dark:border-stone-800"
                      }`}
                    >
                      <input type="hidden" name="atom_id" value={a.id} />
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          name={`confirm_${a.id}`}
                          defaultChecked={!a.review_note}
                          className="mt-2.5 h-4 w-4 shrink-0"
                          aria-label="Keep this item"
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                          <textarea
                            name={`text_${a.id}`}
                            defaultValue={a.text}
                            rows={a.text.length > 90 ? 3 : a.text.length > 45 ? 2 : 1}
                            maxLength={600}
                            className="block w-full rounded-md border border-stone-300 bg-transparent px-3 py-1.5 text-sm dark:border-stone-700"
                          />
                          {a.review_note && (
                            <p className="text-sm text-amber-800 dark:text-amber-300">⚠ {a.review_note}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3">
                            <select
                              name={`kind_${a.id}`}
                              defaultValue={a.kind}
                              className="rounded-md border border-stone-300 bg-transparent px-2 py-1 text-xs dark:border-stone-700"
                              aria-label="Item type"
                            >
                              {ATOM_KINDS.map((k) => (
                                <option key={k.kind} value={k.kind}>
                                  {k.label}
                                </option>
                              ))}
                            </select>
                            {a.evidence && (
                              <span className="text-xs text-stone-500">
                                From your note: <q className="italic">{a.evidence}</q>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 pt-6 dark:border-stone-800">
            <SubmitButton pendingText="Saving…">Save ticked items</SubmitButton>
            <span className="text-xs text-stone-500">Unticked items will be discarded.</span>
          </div>
        </form>

        <form action={discardReview.bind(null, roleId, noteId)} className="mt-4">
          <SubmitButton variant="secondary" pendingText="Discarding…">
            Discard all suggestions
          </SubmitButton>
        </form>
      </main>
    </div>
  );
}
