import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { RoleFields } from "@/components/RoleFields";
import { SubmitButton } from "@/components/SubmitButton";
import { formatRange } from "@/lib/months";
import { createClient } from "@/lib/supabase/server";
import { ATOM_KINDS, type Atom, type Role } from "@/lib/types";
import { addAtoms, deleteAtom, deleteRole, updateAtom, updateRole } from "../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const textarea =
  "block w-full rounded-md border border-stone-300 bg-transparent px-3 py-2 text-sm dark:border-stone-700";

export default async function RolePage({
  params,
  searchParams,
}: {
  params: Promise<{ roleId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { roleId } = await params;
  const { error, saved } = await searchParams;
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
  const confirmedCount = role.atoms.filter((a) => a.status === "confirmed").length;

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

        {/* Role details */}
        <details className="mb-10 rounded-lg border border-stone-200 dark:border-stone-800">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium">Edit role details</summary>
          <form action={updateRole.bind(null, role.id)} className="space-y-6 px-5 pb-5 pt-2">
            <RoleFields role={role} />
            <SubmitButton>Save role details</SubmitButton>
          </form>
        </details>

        {/* Atoms, grouped by kind */}
        <div className="space-y-10">
          {ATOM_KINDS.map(({ kind, label, hint, placeholder }) => {
            const items = role.atoms.filter((a) => a.kind === kind);
            return (
              <section key={kind} id={kind} className="scroll-mt-6">
                <h2 className="text-lg font-semibold">{label}</h2>
                <p className="text-sm text-stone-500">{hint}</p>

                {items.length > 0 && (
                  <ul className="mt-4 divide-y divide-stone-200 rounded-lg border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
                    {items.map((atom) => (
                      <li key={atom.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-sm">
                            {atom.text}
                            {atom.status !== "confirmed" && (
                              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
                                not confirmed
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
              {role.atoms.length} items under it.
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
