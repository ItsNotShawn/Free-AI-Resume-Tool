import type {
  About,
  Atom,
  AtomKind,
  Entry,
  ExtraSection,
  ListSection,
  Note,
  Profile,
  Role,
  RolePrompt,
  WorkMode,
} from "@/lib/types";

/**
 * The memory file format. Bump CURRENT_VERSION whenever the shape changes and
 * add a step to MIGRATIONS that upgrades the previous version, so files people
 * saved months ago still open.
 */
export const FORMAT = "resume-memory";
export const CURRENT_VERSION = 1;
export const DEFAULT_FILENAME = "my-career-memory.json";

export const LIST_SECTIONS: ListSection[] = ["education", "certifications", "projects", "volunteer", "awards", "languages"];
export const EXTRA_SECTIONS: ExtraSection[] = ["projects", "volunteer", "awards", "languages"];

export type MemoryFile = {
  format: typeof FORMAT;
  version: typeof CURRENT_VERSION;
  created_at: string;
  updated_at: string;
  profile: Profile;
  about: About;
  roles: Role[];
  notes: Note[];
  atoms: Atom[];
  sections: Record<ListSection, Entry[]>;
  /** Optional sections the user chose to include. */
  extras: ExtraSection[];
  /** Saved resume drafts (added in a later milestone). */
  drafts: unknown[];
};

export function now(): string {
  return new Date().toISOString();
}

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rand}`;
}

export function emptyMemory(): MemoryFile {
  const t = now();
  return {
    format: FORMAT,
    version: CURRENT_VERSION,
    created_at: t,
    updated_at: t,
    profile: { name: "", email: "", phone: "", location: "", links: [] },
    about: { work_process: "", motivation: "", hobbies: "" },
    roles: [],
    notes: [],
    atoms: [],
    sections: { education: [], certifications: [], projects: [], volunteer: [], awards: [], languages: [] },
    extras: [],
    drafts: [],
  };
}

export function emptyRole(): Role {
  const t = now();
  return {
    id: newId("role"),
    company: "",
    title: "",
    location: "",
    work_mode: null,
    start_month: null,
    end_month: null,
    is_current: false,
    created_at: t,
    updated_at: t,
  };
}

export function emptyEntry(): Entry {
  return { id: newId("entry"), title: "", org: "", dates: "", details: "" };
}

/* ------------------------------------------------------------------ */
/* Reading files: tolerant of missing fields, strict about the format  */
/* ------------------------------------------------------------------ */

export class MemoryFileError extends Error {}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 50_000): string => (typeof v === "string" ? v.slice(0, max) : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const month = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const m = /^(\d{4})-(0[1-9]|1[0-2])/.exec(v);
  return m ? `${m[1]}-${m[2]}` : null;
};
const id = (v: unknown, prefix: string): string => (typeof v === "string" && v ? v.slice(0, 64) : newId(prefix));

const KINDS: AtomKind[] = ["bullet", "outcome", "skill", "tool"];
const PROMPTS: RolePrompt[] = ["did", "wins", "tools"];
const MODES: WorkMode[] = ["onsite", "hybrid", "remote"];

/** Older file versions are upgraded one step at a time. Key = version being upgraded FROM. */
const MIGRATIONS: Record<number, (file: Obj) => Obj> = {
  // 1: (f) => ({ ...f, version: 2, newField: ... }),
};

function migrate(raw: Obj): Obj {
  let file = raw;
  let v = typeof file.version === "number" ? file.version : NaN;
  if (!Number.isInteger(v) || v < 1) throw new MemoryFileError("This file has no valid version number.");
  if (v > CURRENT_VERSION) {
    throw new MemoryFileError(
      `This file was made by a newer version of Resume Memory (format ${v}). Refresh the page to get the latest version, then try again.`,
    );
  }
  while (v < CURRENT_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new MemoryFileError(`Can't upgrade a format ${v} file.`);
    file = step(file);
    v = file.version as number;
  }
  return file;
}

/** Parse the text of a memory file. Throws MemoryFileError with a readable message. */
export function parseMemoryFile(text: string): MemoryFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new MemoryFileError("That file isn't valid JSON. Pick the .json memory file you downloaded from this site.");
  }
  if (!isObj(raw) || raw.format !== FORMAT) {
    throw new MemoryFileError("That doesn't look like a Resume Memory file. Pick the .json file you downloaded from this site.");
  }
  return normalize(migrate(raw));
}

/** Coerce a (current-version) object into a well-formed MemoryFile. */
export function normalize(f: Obj): MemoryFile {
  const base = emptyMemory();
  const p = isObj(f.profile) ? f.profile : {};
  const a = isObj(f.about) ? f.about : {};
  const s = isObj(f.sections) ? f.sections : {};

  const roles: Role[] = arr(f.roles)
    .filter(isObj)
    .map((r): Role => ({
      id: id(r.id, "role"),
      company: str(r.company, 300),
      title: str(r.title, 300),
      location: str(r.location, 300),
      work_mode: MODES.includes(r.work_mode as WorkMode) ? (r.work_mode as WorkMode) : null,
      start_month: month(r.start_month),
      end_month: month(r.end_month),
      is_current: r.is_current === true,
      created_at: str(r.created_at) || base.created_at,
      updated_at: str(r.updated_at) || base.created_at,
    }));
  const roleIds = new Set(roles.map((r) => r.id));

  const notes: Note[] = arr(f.notes)
    .filter(isObj)
    .filter((n) => roleIds.has(n.role_id as string) && PROMPTS.includes(n.prompt as RolePrompt))
    .map((n): Note => ({
      id: id(n.id, "note"),
      role_id: n.role_id as string,
      prompt: n.prompt as RolePrompt,
      body: str(n.body),
      created_at: str(n.created_at) || base.created_at,
      updated_at: str(n.updated_at) || base.created_at,
    }));

  const atoms: Atom[] = arr(f.atoms)
    .filter(isObj)
    .filter((x) => KINDS.includes(x.kind as AtomKind) && typeof x.text === "string" && x.text.trim())
    .filter((x) => x.role_id == null || roleIds.has(x.role_id as string))
    .map((x): Atom => ({
      id: id(x.id, "atom"),
      role_id: (x.role_id as string | null | undefined) ?? null,
      kind: x.kind as AtomKind,
      text: str(x.text, 600),
      status: x.status === "proposed" ? "proposed" : "confirmed",
      origin: x.origin === "ai" ? "ai" : "manual",
      source_note_id: strOrNull(x.source_note_id),
      evidence: strOrNull(x.evidence),
      review_note: strOrNull(x.review_note),
      confirmed_at: strOrNull(x.confirmed_at),
      created_at: str(x.created_at) || base.created_at,
      updated_at: str(x.updated_at) || base.created_at,
    }));

  const sections = { ...base.sections };
  for (const key of LIST_SECTIONS) {
    sections[key] = arr(s[key])
      .filter(isObj)
      .map((e): Entry => ({
        id: id(e.id, "entry"),
        title: str(e.title, 300),
        org: str(e.org, 300),
        dates: str(e.dates, 100),
        details: str(e.details, 5000),
      }));
  }

  return {
    ...base,
    created_at: str(f.created_at) || base.created_at,
    updated_at: str(f.updated_at) || base.updated_at,
    profile: {
      name: str(p.name, 200),
      email: str(p.email, 200),
      phone: str(p.phone, 100),
      location: str(p.location, 200),
      links: arr(p.links).filter((l): l is string => typeof l === "string").slice(0, 5),
    },
    about: {
      work_process: str(a.work_process),
      motivation: str(a.motivation),
      hobbies: str(a.hobbies),
    },
    roles,
    notes,
    atoms,
    sections,
    extras: EXTRA_SECTIONS.filter((k) => arr(f.extras).includes(k)),
    drafts: arr(f.drafts),
  };
}

export function serialize(m: MemoryFile): string {
  return JSON.stringify(m, null, 2);
}
