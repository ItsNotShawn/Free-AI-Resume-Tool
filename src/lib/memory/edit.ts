import type { About, Entry, ExtraSection, ListSection, Profile, Role, RolePrompt } from "@/lib/types";
import { emptyEntry, emptyRole, newId, now, type MemoryFile } from "./schema";

/** Pure helpers: each takes a file and returns an updated copy. */

export const setProfile = (patch: Partial<Profile>) => (m: MemoryFile): MemoryFile => ({
  ...m,
  profile: { ...m.profile, ...patch },
});

export const setAbout = (patch: Partial<About>) => (m: MemoryFile): MemoryFile => ({
  ...m,
  about: { ...m.about, ...patch },
});

/** Make sure there are at least `count` jobs. Never deletes existing ones. */
export const ensureRoleCount = (count: number) => (m: MemoryFile): MemoryFile => {
  if (m.roles.length >= count) return m;
  const extra: Role[] = Array.from({ length: count - m.roles.length }, emptyRole);
  return { ...m, roles: [...m.roles, ...extra] };
};

export const addRole = (role: Role) => (m: MemoryFile): MemoryFile => ({ ...m, roles: [...m.roles, role] });

export const updateRole = (id: string, patch: Partial<Role>) => (m: MemoryFile): MemoryFile => ({
  ...m,
  roles: m.roles.map((r) => (r.id === id ? { ...r, ...patch, updated_at: now() } : r)),
});

/** Remove a job together with its answers and facts. */
export const removeRole = (id: string) => (m: MemoryFile): MemoryFile => ({
  ...m,
  roles: m.roles.filter((r) => r.id !== id),
  notes: m.notes.filter((n) => n.role_id !== id),
  atoms: m.atoms.filter((a) => a.role_id !== id),
});

export function getNote(m: MemoryFile, roleId: string, prompt: RolePrompt): string {
  return m.notes.find((n) => n.role_id === roleId && n.prompt === prompt)?.body ?? "";
}

export const setNote = (roleId: string, prompt: RolePrompt, body: string) => (m: MemoryFile): MemoryFile => {
  const t = now();
  const existing = m.notes.find((n) => n.role_id === roleId && n.prompt === prompt);
  if (existing) {
    return { ...m, notes: m.notes.map((n) => (n === existing ? { ...n, body, updated_at: t } : n)) };
  }
  return {
    ...m,
    notes: [...m.notes, { id: newId("note"), role_id: roleId, prompt, body, created_at: t, updated_at: t }],
  };
};

export const addEntry = (section: ListSection) => (m: MemoryFile): MemoryFile => ({
  ...m,
  sections: { ...m.sections, [section]: [...m.sections[section], emptyEntry()] },
});

export const addEntries = (section: ListSection, entries: Entry[]) => (m: MemoryFile): MemoryFile => ({
  ...m,
  sections: { ...m.sections, [section]: [...m.sections[section], ...entries] },
});

export const updateEntry = (section: ListSection, id: string, patch: Partial<Entry>) => (m: MemoryFile): MemoryFile => ({
  ...m,
  sections: { ...m.sections, [section]: m.sections[section].map((e) => (e.id === id ? { ...e, ...patch } : e)) },
});

export const removeEntry = (section: ListSection, id: string) => (m: MemoryFile): MemoryFile => ({
  ...m,
  sections: { ...m.sections, [section]: m.sections[section].filter((e) => e.id !== id) },
});

export const setExtras = (extras: ExtraSection[]) => (m: MemoryFile): MemoryFile => ({ ...m, extras });

/** Skills the user typed in directly (not tied to a job). Stored as confirmed atoms. */
export function manualSkills(m: MemoryFile): { id: string; text: string }[] {
  return m.atoms.filter((a) => a.role_id === null && a.kind === "skill").map((a) => ({ id: a.id, text: a.text }));
}

export const addManualSkills = (texts: string[]) => (m: MemoryFile): MemoryFile => {
  const have = new Set(manualSkills(m).map((s) => s.text.toLowerCase()));
  const t = now();
  const fresh = texts
    .map((s) => s.trim())
    .filter((s) => s && s.length <= 80)
    .filter((s) => {
      const k = s.toLowerCase();
      if (have.has(k)) return false;
      have.add(k);
      return true;
    })
    .map((text) => ({
      id: newId("atom"),
      role_id: null,
      kind: "skill" as const,
      text,
      status: "confirmed" as const,
      origin: "manual" as const,
      source_note_id: null,
      evidence: null,
      review_note: null,
      confirmed_at: t,
      created_at: t,
      updated_at: t,
    }));
  return fresh.length ? { ...m, atoms: [...m.atoms, ...fresh] } : m;
};

export const removeAtom = (id: string) => (m: MemoryFile): MemoryFile => ({
  ...m,
  atoms: m.atoms.filter((a) => a.id !== id),
});
