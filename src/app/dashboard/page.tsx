import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const FREE_MONTHLY_GENERATIONS = 15;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 dark:border-stone-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="font-semibold">Resume Memory</span>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-stone-500">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button className="underline hover:no-underline">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Your career memory</h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card title="Experience library" body="No roles yet. Adding roles arrives in the next milestone." />
          <Card title="Resume drafts" body="No drafts yet." />
          <Card
            title="Generations this month"
            body={`0 of ${FREE_MONTHLY_GENERATIONS} free`}
          />
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
