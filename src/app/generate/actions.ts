"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AIError } from "@/lib/ai/anthropic";
import { generateDraft } from "@/lib/ai/generate";
import { usedAtomIds, type FactForGen, type RoleForGen } from "@/lib/ai/ground";
import { sortRoles } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_FACTS = 3;

function go(path: string, params: Record<string, string | undefined> = {}): never {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, v);
  const qs = q.toString();
  redirect(qs ? `${path}?${qs}` : path);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function generateResume(formData: FormData) {
  const { supabase, user } = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  if (!title) go("/generate", { error: "Add the job title." });
  if (title.length > 200 || (company?.length ?? 0) > 200) go("/generate", { error: "Title and company must be 200 characters or fewer." });
  if (description.length < 50) go("/generate", { error: "Paste the full job description (at least a few sentences)." });
  if (description.length > 30_000) go("/generate", { error: "That job description is over 30,000 characters. Trim it to the role details." });

  const [{ data: roleRows }, { data: factRows }] = await Promise.all([
    supabase.from("roles").select("id, title, company, location, start_month, end_month, is_current"),
    supabase.from("confirmed_atoms").select("id, role_id, kind, text").order("created_at", { ascending: true }),
  ]);
  const roles = ((roleRows ?? []) as unknown as RoleForGen[]).sort(sortRoles);
  const facts = (factRows ?? []) as unknown as FactForGen[];
  if (roles.length === 0 || facts.length < MIN_FACTS) {
    go("/generate", { error: `Add at least ${MIN_FACTS} confirmed facts to your library first.` });
  }

  // Save the posting first so a failed run doesn't lose it.
  const { data: job, error: jobErr } = await supabase
    .from("job_targets")
    .insert({ user_id: user.id, title, company, description })
    .select("id")
    .single();
  if (jobErr || !job) go("/generate", { error: jobErr?.message ?? "Couldn't save the job posting." });
  const jobId = (job as { id: string }).id;

  let result: Awaited<ReturnType<typeof generateDraft>> | null = null;
  try {
    result = await generateDraft({ roles, facts, job: { title, company, description } });
  } catch (e) {
    if (!(e instanceof AIError)) console.error("[generate] unexpected", e);
    go("/generate", { job: jobId, error: e instanceof AIError ? e.message : "Something went wrong while generating. Try again." });
  }
  if (!result) go("/generate", { job: jobId, error: "Something went wrong while generating. Try again." });
  const { content, model } = result;

  const bulletCount = content.roles.reduce((n, r) => n + r.bullets.length, 0);
  if (bulletCount === 0) {
    go("/generate", {
      job: jobId,
      error:
        content.removed.length > 0
          ? "Every line the AI wrote failed the fact check, so no draft was saved. Try again, or add more facts that relate to this job."
          : "The AI found nothing in your library relevant to this job. Add more facts, or try a different posting.",
    });
  }

  const { data: draft, error: draftErr } = await supabase
    .from("drafts")
    .insert({ user_id: user.id, job_target_id: jobId, content, model })
    .select("id")
    .single();
  if (draftErr || !draft) go("/generate", { job: jobId, error: draftErr?.message ?? "Couldn't save the draft." });
  const draftId = (draft as { id: string }).id;

  const used = usedAtomIds(content);
  if (used.length) {
    const { error } = await supabase.from("draft_atoms").insert(used.map((atom_id) => ({ draft_id: draftId, atom_id })));
    if (error) console.error("[generate] draft_atoms insert failed", error.message);
  }
  const { error: evErr } = await supabase.from("generation_events").insert({ user_id: user.id, draft_id: draftId });
  if (evErr) console.error("[generate] generation_events insert failed", evErr.message);

  revalidatePath("/drafts");
  revalidatePath("/dashboard");
  redirect(`/drafts/${draftId}`);
}

export async function deleteDraft(draftId: string) {
  if (!UUID.test(draftId)) redirect("/drafts");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("drafts").delete().eq("id", draftId);
  if (error) go(`/drafts/${draftId}`, { error: error.message });
  revalidatePath("/drafts");
  redirect("/drafts");
}
