import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { formatRange } from "@/lib/months";
import { sortRoles } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { ATOM_KINDS, type AtomKind, type Role } from "@/lib/types";

type RoleWithAtoms = Role & { atoms: { kind: AtomKind; status: string }[] };

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.from("roles").select("*, atoms(kind, status)");
  const roles = ((data ?? []) as unknown as RoleWithAtoms[]).sort(sortRoles);

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Experience library</h1>
            <p className="mt-1 text-sm text-stone-500">
              Everything here is something you told us. Resumes are built only from these facts.
            </p>
          </div>
          <Link
            href="/library/new"
            className="shrink-0 rounded-md bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            + Add role
          </Link>
        </div>

        {error && (
          <p className="mt-6 text-sm text-red-600">
            Couldn&apos;t load your roles: {error.message}. Did you run the database migration?
          </p>
        )}

        {!error && roles.length === 0 && (
          <div className="mt-10 rounded-lg border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
            <p className="font-medium">No roles yet</p>
            <p className="mt-1 text-sm text-stone-500">
              Start with your current or most recent job.
            </p>
            <Link href="/library/new" className="mt-4 inline-block text-sm underline">
              Add your first role
            </Link>
          </div>
        )}

        <ul className="mt-8 space-y-3">
          {roles.map((role) => {
            const confirmed = role.atoms.filter((a) => a.status === "confirmed");
            const pending = role.atoms.length - confirmed.length;
            return (
              <li key={role.id}>
                <Link
                  href={`/library/${role.id}`}
                  className="block rounded-lg border border-stone-200 p-5 hover:border-stone-400 dark:border-stone-800 dark:hover:border-stone-600"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-medium">
                      {role.title} <span className="text-stone-500">at</span> {role.company}
                    </h2>
                    <span className="text-sm text-stone-500">
                      {formatRange(role.start_month, role.end_month, role.is_current)}
                    </span>
                  </div>
                  {pending > 0 && (
                    <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                      {pending} AI {pending === 1 ? "suggestion" : "suggestions"} to review
                    </p>
                  )}
                  <p className="mt-2 text-sm text-stone-500">
                    {confirmed.length === 0
                      ? "No details yet"
                      : ATOM_KINDS.map(({ kind, label }) => {
                          const n = confirmed.filter((a) => a.kind === kind).length;
                          return n ? `${n} ${label.toLowerCase()}` : null;
                        })
                          .filter(Boolean)
                          .join(" · ")}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
