import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { monthStartIso } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

const FREE_MONTHLY_GENERATIONS = 15;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [roles, atoms, drafts, gens] = await Promise.all([
    supabase.from("roles").select("id", { count: "exact", head: true }),
    supabase.from("confirmed_atoms").select("id", { count: "exact", head: true }),
    supabase.from("drafts").select("id", { count: "exact", head: true }),
    supabase.from("generation_events").select("id", { count: "exact", head: true }).gte("created_at", monthStartIso()),
  ]);
  const roleCount = roles.count ?? 0;
  const atomCount = atoms.count ?? 0;
  const draftCount = drafts.count ?? 0;
  const genCount = gens.count ?? 0;

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Your career memory</h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Link
            href="/library"
            className="rounded-lg border border-stone-200 p-5 hover:border-stone-400 dark:border-stone-800 dark:hover:border-stone-600"
          >
            <h2 className="text-sm font-medium text-stone-500">Experience library</h2>
            <p className="mt-2">
              {roleCount === 0
                ? "No roles yet. Add your first →"
                : `${roleCount} ${roleCount === 1 ? "role" : "roles"} · ${atomCount} confirmed ${atomCount === 1 ? "fact" : "facts"}`}
            </p>
          </Link>
          <Link
            href={draftCount ? "/drafts" : "/generate"}
            className="rounded-lg border border-stone-200 p-5 hover:border-stone-400 dark:border-stone-800 dark:hover:border-stone-600"
          >
            <h2 className="text-sm font-medium text-stone-500">Resume drafts</h2>
            <p className="mt-2">
              {draftCount === 0 ? "None yet. Paste a job posting →" : `${draftCount} ${draftCount === 1 ? "draft" : "drafts"}`}
            </p>
          </Link>
          <Card title="Generations this month" body={`${genCount} of ${FREE_MONTHLY_GENERATIONS} free`} />
        </div>
      </main>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-lg border border-stone-200 p-5 dark:border-stone-800">
      <h2 className="text-sm font-medium text-stone-500">{title}</h2>
      <p className="mt-2">{body}</p>
    </section>
  );
}
