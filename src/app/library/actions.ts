"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromMonthInput } from "@/lib/months";
import { createClient } from "@/lib/supabase/server";
import type { AtomKind } from "@/lib/types";

const KINDS: AtomKind[] = ["bullet", "outcome", "skill", "tool"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function checkId(id: string) {
  if (!UUID.test(id)) redirect("/library");
}

// ───────────────────────── roles ─────────────────────────

type RoleInput = {
  company: string;
  title: string;
  location: string | null;
  start_month: string | null;
  end_month: string | null;
  is_current: boolean;
};

/** Returns a clean role or an error message. */
function parseRole(formData: FormData): RoleInput | string {
  const company = String(formData.get("company") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;
  const is_current = formData.get("is_current") === "on";

  if (!company) return "Company is required.";
  if (!title) return "Job title is required.";
  if (company.length > 200 || title.length > 200 || (location?.length ?? 0) > 200) {
    return "Company, title and location must be 200 characters or fewer.";
  }

  let start_month: string | null;
  let end_month: string | null;
  try {
    start_month = fromMonthInput(String(formData.get("start_month") ?? ""));
    end_month = is_current ? null : fromMonthInput(String(formData.get("end_month") ?? ""));
  } catch {
    return "Dates must be a month and year (YYYY-MM).";
  }
  if (start_month && end_month && end_month < start_month) {
    return "End month can't be before start month.";
  }
  return { company, title, location, start_month, end_month, is_current };
}

export async function createRole(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = parseRole(formData);
  if (typeof parsed === "string") fail("/library/new", parsed);

  const { data, error } = await supabase
    .from("roles")
    .insert({ ...parsed, user_id: user.id })
    .select("id")
    .single();
  if (error || !data) fail("/library/new", error?.message ?? "Could not save the role.");

  revalidatePath("/library");
  redirect(`/library/${data.id}`);
}

export async function updateRole(roleId: string, formData: FormData) {
  checkId(roleId);
  const { supabase } = await requireUser();
  const path = `/library/${roleId}`;
  const parsed = parseRole(formData);
  if (typeof parsed === "string") fail(path, parsed);

  const { error } = await supabase.from("roles").update(parsed).eq("id", roleId);
  if (error) fail(path, error.message);

  revalidatePath("/library");
  redirect(`${path}?saved=role`);
}

export async function deleteRole(roleId: string) {
  checkId(roleId);
  const { supabase } = await requireUser();
  // Atoms are removed by ON DELETE CASCADE.
  const { error } = await supabase.from("roles").delete().eq("id", roleId);
  if (error) fail(`/library/${roleId}`, error.message);

  revalidatePath("/library");
  redirect("/library");
}

// ───────────────────────── atoms ─────────────────────────

function parseKind(value: FormDataEntryValue | null): AtomKind | null {
  const k = String(value ?? "") as AtomKind;
  return KINDS.includes(k) ? k : null;
}

/** Strip list markers people paste in ("- ", "• ", "1. "). */
function cleanLine(line: string): string {
  return line.replace(/^\s*(?:[-*•·▪◦]|\d+[.)])\s+/, "").trim();
}

/**
 * Adds one atom per non-empty line. Hand-typed facts are the user's own
 * statements, so they are stored as confirmed (the DB enforces this too).
 */
export async function addAtoms(roleId: string, formData: FormData) {
  checkId(roleId);
  const { supabase, user } = await requireUser();
  const path = `/library/${roleId}`;

  const kind = parseKind(formData.get("kind"));
  if (!kind) fail(path, "Unknown item type.");

  const lines = String(formData.get("text") ?? "")
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);
  if (lines.length === 0) fail(path, "Type at least one item.");
  if (lines.length > 50) fail(path, "Add at most 50 items at a time.");
  const tooLong = lines.find((l) => l.length > 600);
  if (tooLong) fail(path, `This item is over 600 characters: "${tooLong.slice(0, 60)}…"`);

  const now = new Date().toISOString();
  const { error } = await supabase.from("atoms").insert(
    lines.map((text) => ({
      user_id: user.id,
      role_id: roleId,
      kind,
      text,
      origin: "manual",
      status: "confirmed",
      confirmed_at: now,
    })),
  );
  if (error) fail(path, error.message);

  revalidatePath(path);
  redirect(`${path}#${kind}`);
}

export async function updateAtom(roleId: string, atomId: string, formData: FormData) {
  checkId(roleId);
  checkId(atomId);
  const { supabase } = await requireUser();
  const path = `/library/${roleId}`;

  const kind = parseKind(formData.get("kind"));
  const text = cleanLine(String(formData.get("text") ?? "").replace(/\s*\r?\n\s*/g, " "));
  if (!kind) fail(path, "Unknown item type.");
  if (!text) fail(path, "An item can't be empty. Delete it instead.");
  if (text.length > 600) fail(path, "Items must be 600 characters or fewer.");

  // Editing your own words keeps it confirmed; status is not touched here.
  const { error } = await supabase
    .from("atoms")
    .update({ kind, text })
    .eq("id", atomId)
    .eq("role_id", roleId);
  if (error) fail(path, error.message);

  revalidatePath(path);
  redirect(`${path}#${kind}`);
}

export async function deleteAtom(roleId: string, atomId: string) {
  checkId(roleId);
  checkId(atomId);
  const { supabase } = await requireUser();
  const path = `/library/${roleId}`;

  const { error } = await supabase.from("atoms").delete().eq("id", atomId).eq("role_id", roleId);
  if (error) fail(path, error.message);

  revalidatePath(path);
  redirect(path);
}
