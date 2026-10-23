/**
 * Everything in a memory file. All of it lives on the user's device;
 * nothing here is ever sent to a server we run (there isn't one).
 */

export type AtomKind = "bullet" | "outcome" | "skill" | "tool";
export type AtomStatus = "proposed" | "confirmed";
export type AtomOrigin = "manual" | "ai";
export type WorkMode = "onsite" | "hybrid" | "remote";

export type Profile = {
  name: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
};

export type Role = {
  id: string;
  company: string;
  title: string;
  location: string;
  work_mode: WorkMode | null;
  start_month: string | null; // "YYYY-MM"
  end_month: string | null; // "YYYY-MM"
  is_current: boolean;
  created_at: string;
  updated_at: string;
};

/** The questions asked about each job, one chunk at a time. */
export type QuestionPrompt = "did" | "wins" | "tools";
/** "basics" holds what the user said when speaking their company, title and dates. */
export type RolePrompt = "basics" | QuestionPrompt;

/**
 * A raw answer, kept word for word. AI-proposed atoms must quote one of these,
 * which is how the never-invent check knows where a fact came from.
 */
export type Note = {
  id: string;
  role_id: string;
  prompt: RolePrompt;
  body: string;
  created_at: string;
  updated_at: string;
};

/** One small confirmed fact. role_id is null for skills not tied to a job. */
export type Atom = {
  id: string;
  role_id: string | null;
  kind: AtomKind;
  text: string;
  status: AtomStatus;
  origin: AtomOrigin;
  source_note_id: string | null;
  evidence: string | null; // verbatim quote from the source note (AI proposals)
  review_note: string | null; // why the user should double-check this proposal
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Education, certifications and the optional sections share one shape. */
export type Entry = {
  id: string;
  title: string;
  org: string;
  dates: string;
  details: string;
};

export type ListSection = "education" | "certifications" | "projects" | "volunteer" | "awards" | "languages";
export type ExtraSection = "projects" | "volunteer" | "awards" | "languages";

export type About = {
  work_process: string;
  motivation: string;
  hobbies: string;
};

export const ATOM_KINDS: { kind: AtomKind; label: string }[] = [
  { kind: "bullet", label: "What you did" },
  { kind: "outcome", label: "Results" },
  { kind: "skill", label: "Skills" },
  { kind: "tool", label: "Tools & tech" },
];

export const KIND_LABEL: Record<AtomKind, string> = Object.fromEntries(
  ATOM_KINDS.map((k) => [k.kind, k.label]),
) as Record<AtomKind, string>;
