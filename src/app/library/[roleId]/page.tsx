import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { RambleForm } from "@/components/RambleForm";
import { RoleFields } from "@/components/RoleFields";
import { SubmitButton } from "@/components/SubmitButton";
import { formatRange } from "@/lib/months";
import { createClient } from "@/lib/supabase/server";
import { ATOM_KINDS, type Atom, type Role } from "@/lib/types";
import { addAtoms, deleteAtom, deleteRole, updateAtom, updateRole } from "../actions";
import { structureNote } from "../structure-actions";

// Structuring calls the AI and can take ~30s.
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const textarea =
  "block w-full rounded-md border border-stone-300 bg-transparent px-3 py-2 text-sm dark:border-stone-700";

export default async function RolePage({
  params,
  searchParams,
}: {
  params: Promise<{ roleId: string }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
    note?: string;
    confirmed?: string;
    discarded?: string;
  }>;
}) {
  const { roleId } = await params;
  const { error, saved, note: noteParam, confirmed, discarded } = await searchParams;
  if (!UUID.test(roleId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("roles")
    .select("*, atoms(*)")
    .eq("id", roleId)
    .order("created_at", { referencedTable: "atoms", ascending: true })
    .maybeSingle();
  if (!data) notFound();

  const role = data as unknown as Role & { atoms: Atom[] };
  // Only confirmed atoms are part of the library. Proposed ones wait on the review screen.
  const confirmedAtoms = role.atoms.filter((a) => a.status === "confirmed");
  const confirmedCount = confirmedAtoms.length;
  const pendingByNote = new Map<string, number>();
  for (const a of role.atoms) {
    if (a.status === "proposed" && a.source_note_id) {
      pendingByNote.set(a.source_note_id, (pendingByNote.get(a.source_note_id) ?? 0) + 1);
    }
  }

  // After a failed structuring run, put the saved note back in the box.
  let rambleDefault = "";
  if (noteParam && UUID.test(noteParam)) {
    const { data: n } = await supabase
      .from("source_notes")
      .select("body")
      .eq("id", noteParam)
      .eq("role_id", roleId)
      .maybeSingle();
    rambleDefault = (n as { body?: string } | null)?.body ?? "";
  }
  const confirmedN = Number(confirmed) || 0;
  const discardedN = discarded === "all" ? "all" : Number(discarded) || 0;

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/library" className="text-sm text-stone-500 hover:underline">
          ← Experience library
        </Link>

        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold">
            {role.title} <span className="font-normal text-stone-500">at</span> {role.company}
          </h1>
          <span className="text-sm text-stone-500">
            {formatRange(role.start_month, role.end_month, role.is_current)}
            {role.location ? ` · ${role.location}` : ""}
          </span>
        </div>
        <p className="mb-6 mt-1 text-sm text-stone-500">
          {confirmedCount} confirmed {confirmedCount === 1 ? "fact" : "facts"}. Only confirmed facts
          are ever used in a resume.
        </p>

        <ErrorBanner message={error} />
        {saved === "role" && (
          <p className="mb-6 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
            Role details saved.
          </p>
        )}

        {(confirmedN > 0 || discardedN !== 0) && (
          <p className="mb-6 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
            {confirmedN > 0 && `${confirmedN} ${confirmedN === 1 ? "fact" : "facts"} confirmed and added below. `}
            {discardedN === "all"
              ? "Suggestions discarded."
              : discardedN > 0
                ? `${discardedN} discarded.`
                : ""}
          </p>
        )}

        {[...pendingByNote.entries()].map(([nid, count]) => (
          <Link
            key={nid}
            href={`/library/${role.id}/review/${nid}`}
            className="mb-6 block rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
          >
            {count} AI {count === 1 ? "suggestion is" : "suggestions are"} waiting for your review →
          </Link>
        ))}

        {/* One ramble → AI proposals → review */}
        <section className="mb-10 rounded-lg border border-stone-200 p-5 dark:border-stone-800">
          <h2 className="text-lg font-semibold">Tell it about this role</h2>
          <p className="mb-4 text-sm text-stone-500">
            One brain dump, typed, pasted or dictated. The AI splits it into facts for you to check.
          </p>
          <RambleForm key={noteParam ?? "new"} action={structureNote.bind(null, role.id)} defaultValue={rambleDefault} />
        </section>

        {/* Role details */}
        <details className="mb-10 rounded-lg border border-stone-200 dark:border-stone-800">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium">Edit role details</summary>
          <form action={updateRole.bind(null, role.id)} className="space-y-6 px-5 pb-5 pt-2">
            <RoleFields role={role} />
            <SubmitButton>Save role details</SubmitButton>
          </form>
        </details>

        {/* Confirmed atoms, grouped by kind */}
        <h2 className="text-xl font-semibold">Confirmed facts</h2>
        <p className="mb-6 text-sm text-stone-500">
          These are the only things a resume can be built from. Add or fix items by hand at any time.
        </p>
        <div className="space-y-10">
          {ATOM_KINDS.map(({ kind, label, hint, placeholder }) => {
            const items = confirmedAtoms.filter((a) => a.kind === kind);
            return (
              <section key={kind} id={kind} className="scroll-mt-6">
                <h3 className="text-lg font-semibold">{label}</h3>
                <p className="text-sm text-stone-500">{hint}</p>

                {items.length > 0 && (
                  <ul className="mt-4 divide-y divide-stone-200 rounded-lg border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
                    {items.map((atom) => (
                      <li key={atom.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-sm">
                            {atom.text}
                            {atom.origin === "ai" && (
                              <span className="ml-2 text-xs text-stone-400" title="Proposed by AI from your note, confirmed by you">
                                from note
                              </span>
                            )}
                          </p>
                          <form action={deleteAtom.bind(null, role.id, atom.id)} className="shrink-0">
                            <button
                              type="submit"
                              className="text-xs text-stone-500 hover:text-red-600 hover:underline"
                              aria-label={`Delete "${atom.text}"`}
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-stone-500 hover:underline">
                            Edit
                          </summary>
                          <form
                            action={updateAtom.bind(null, role.id, atom.id)}
                            className="mt-2 space-y-2"
                          >
                            <textarea
                              name="text"
                              required
                              maxLength={600}
                              rows={2}
                              defaultValue={atom.text}
                              className={textarea}
                            />
                            <div className="flex items-center gap-3">
                              <select
                                name="kind"
                                defaultValue={atom.kind}
                                className="rounded-md border border-stone-300 bg-transparent px-2 py-1.5 text-sm dark:border-stone-700"
                              >
                                {ATOM_KINDS.map((k) => (
                                  <option key={k.kind} value={k.kind}>
                                    {k.label}
                                  </option>
                                ))}
                              </select>
                              <SubmitButton variant="secondary">Save</SubmitButton>
                            </div>
                          </form>
                        </details>
                      </li>
                    ))}
                  </ul>
                )}

                <form action={addAtoms.bind(null, role.id)} className="mt-4 space-y-2">
                  <input type="hidden" name="kind" value={kind} />
                  <textarea
                    name="text"
                    rows={items.length ? 2 : 3}
                    placeholder={placeholder}
                    className={textarea}
                    aria-label={`Add ${label.toLowerCase()}`}
                  />
                  <div className="flex items-center gap-3">
                    <SubmitButton variant="secondary" pendingText="Adding…">
                      Add
                    </SubmitButton>
                    <span className="text-xs text-stone-500">One per line. Each line becomes its own item.</span>
                  </div>
                </form>
              </section>
            );
          })}
        </div>

        {/* Danger zone */}
        <details className="mt-16 rounded-lg border border-red-200 dark:border-red-900">
          <summary className="cursor-pointer px-5 py-3 text-sm text-red-700 dark:text-red-400">
            Delete this role
          </summary>
          <form action={deleteRole.bind(null, role.id)} className="space-y-3 px-5 pb-5">
            <p className="text-sm">
              This permanently deletes <strong>{role.title} at {role.company}</strong> and all{" "}
              {confirmedCount} confirmed facts, pending suggestions and saved notes for it.
            </p>
            <SubmitButton variant="danger" pendingText="Deleting…">
              Yes, delete role
            </SubmitButton>
          </form>
        </details>
      </main>
    </div>
  );
}
