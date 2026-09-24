import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { RoleFields } from "@/components/RoleFields";
import { SubmitButton } from "@/components/SubmitButton";
import { createClient } from "@/lib/supabase/server";
import { createRole } from "../actions";

export default async function NewRolePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/library" className="text-sm text-stone-500 hover:underline">
          ← Experience library
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Add a role</h1>
        <p className="mb-6 mt-1 text-sm text-stone-500">
          Just the basics. You&apos;ll add what you did on the next screen.
        </p>
        <ErrorBanner message={error} />
        <form action={createRole} className="space-y-6">
          <RoleFields />
          <div className="flex gap-3">
            <SubmitButton>Save role</SubmitButton>
            <Link href="/library" className="px-3 py-1.5 text-sm underline">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
