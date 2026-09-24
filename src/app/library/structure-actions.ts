"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MAX_NOTE, MIN_NOTE } from "@/lib/ai/limits";
import { proposeAtoms, StructuringError } from "@/lib/ai/structure";
import { verifyProposals, type RawProposal } from "@/lib/ai/verify";
import { formatRange } from "@/lib/months";
import { createClient } from "@/lib/supabase/server";
import type { AtomKind } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS: AtomKind[] = ["bullet", "outcome", "skill", "tool"];

/** Fair-use cap on structuring runs (not the resume-generation quota). */
const MAX_NOTES_PER_DAY = 25;

function go(path: string, params: Record<string, string | number | undefined> = {}): never {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v));
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

/** Save the ramble, ask Claude for proposals, check them, store as "proposed". */
export async function structureNote(roleId: string, formData: FormData) {
  if (!UUID.test(roleId)) redirect("/library");
  const { supabase, user } = await requireUser();
  const rolePath = `/library/${roleId}`;

  const body = String(formData.get("note") ?? "").trim();
  if (body.length < MIN_NOTE) go(rolePath, { error: "Tell it a bit more first: a few sentences about what you did." });
  if (body.length > MAX_NOTE) go(rolePath, { error: `That's over ${MAX_NOTE.toLocaleString()} characters. Split it into two notes.` });

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabase
    .from("source_notes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_NOTES_PER_DAY) {
    go(rolePath, { error: `You've structured ${MAX_NOTES_PER_DAY} notes in the last 24 hours. Try again tomorrow.` });
  }

  const { data: role } = await supabase
    .from("roles")
    .select("title, company, start_month, end_month, is_current, atoms(text, status)")
    .eq("id", roleId)
    .maybeSingle();
  if (!role) redirect("/library");
  const r = role as unknown as {
    title: string;
    company: string;
    start_month: string | null;
    end_month: string | null;
    is_current: boolean;
    atoms: { text: string; status: string }[];
  };

  // Keep the raw note first, so nothing typed or dictated is ever lost.
  const { data: note, error: noteErr } = await supabase
    .from("source_notes")
    .insert({ user_id: user.id, role_id: roleId, body })
    .select("id")
    .single();
  if (noteErr || !note) go(rolePath, { error: noteErr?.message ?? "Couldn't save your note." });
  const noteId = (note as { id: string }).id;

  let raw: RawProposal[] = [];
  try {
    raw = await proposeAtoms(body, {
      title: r.title,
      company: r.company,
      isCurrent: r.is_current,
      dates: formatRange(r.start_month, r.end_month, r.is_current),
      existing: r.atoms.filter((a) => a.status === "confirmed").map((a) => a.text),
    });
  } catch (e) {
    const message = e instanceof StructuringError ? e.message : "Something went wrong while structuring. Try again.";
    if (!(e instanceof StructuringError)) console.error("[structure] unexpected", e);
    go(rolePath, { note: noteId, error: message });
  }

  const { kept, dropped } = verifyProposals(body, raw);
  if (dropped.length) console.info("[structure] dropped proposals", dropped);

  if (kept.length === 0) {
    go(rolePath, {
      note: noteId,
      error:
        dropped.length > 0
          ? "None of the AI's suggestions could be matched to what you wrote, so nothing was proposed. Try adding more concrete detail."
          : "No facts to propose from that note. Try describing what you worked on, what changed because of it, and the tools you used.",
    });
  }

  const { error: insErr } = await supabase.from("atoms").insert(
    kept.map((k) => ({
      user_id: user.id,
      role_id: roleId,
      source_note_id: noteId,
      kind: k.kind,
      text: k.text,
      evidence: k.evidence,
      review_note: k.review_note,
      origin: "ai",
      status: "proposed",
    })),
  );
  if (insErr) go(rolePath, { note: noteId, error: insErr.message });

  revalidatePath(rolePath);
  go(`${rolePath}/review/${noteId}`, { dropped: dropped.length || undefined });
}

/** Ticked proposals become confirmed (with any edits); unticked ones are deleted. */
export async function confirmReview(roleId: string, noteId: string, formData: FormData) {
  if (!UUID.test(roleId) || !UUID.test(noteId)) redirect("/library");
  const { supabase } = await requireUser();
  const reviewPath = `/library/${roleId}/review/${noteId}`;

  // Only ever act on this note's still-proposed atoms.
  const { data: pending } = await supabase
    .from("atoms")
    .select("id")
    .eq("role_id", roleId)
    .eq("source_note_id", noteId)
    .eq("status", "proposed");
  const pendingIds = new Set((pending ?? []).map((a: { id: string }) => a.id));

  const ids = formData.getAll("atom_id").map(String).filter((id) => pendingIds.has(id));
  const toConfirm: { id: string; kind: AtomKind; text: string }[] = [];
  const toDelete: string[] = [];

  for (const id of ids) {
    const ticked = formData.get(`confirm_${id}`) === "on";
    const text = String(formData.get(`text_${id}`) ?? "").replace(/\s+/g, " ").trim();
    const kind = KINDS.find((k) => k === String(formData.get(`kind_${id}`) ?? ""));
    if (!ticked) {
      toDelete.push(id);
      continue;
    }
    if (!text) go(reviewPath, { error: "A ticked item is empty. Untick it or add text." });
    if (text.length > 600) go(reviewPath, { error: "Items must be 600 characters or fewer." });
    if (!kind) go(reviewPath, { error: "Unknown item type." });
    toConfirm.push({ id, kind, text });
  }

  const now = new Date().toISOString();
  const results = await Promise.all(
    toConfirm.map((a) =>
      supabase
        .from("atoms")
        .update({ kind: a.kind, text: a.text, status: "confirmed", confirmed_at: now, review_note: null })
        .eq("id", a.id)
        .eq("status", "proposed"),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) go(reviewPath, { error: failed.error.message });

  if (toDelete.length) {
    const { error } = await supabase.from("atoms").delete().in("id", toDelete).eq("status", "proposed");
    if (error) go(reviewPath, { error: error.message });
  }

  revalidatePath(`/library/${roleId}`);
  go(`/library/${roleId}`, { confirmed: toConfirm.length, discarded: toDelete.length });
}

/** Throw away every remaining proposal from this note. The note itself is kept. */
export async function discardReview(roleId: string, noteId: string) {
  if (!UUID.test(roleId) || !UUID.test(noteId)) redirect("/library");
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("atoms")
    .delete()
    .eq("role_id", roleId)
    .eq("source_note_id", noteId)
    .eq("status", "proposed");
  if (error) go(`/library/${roleId}/review/${noteId}`, { error: error.message });

  revalidatePath(`/library/${roleId}`);
  go(`/library/${roleId}`, { discarded: "all" });
}
