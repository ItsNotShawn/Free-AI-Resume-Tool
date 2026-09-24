export type AtomKind = "bullet" | "outcome" | "skill" | "tool";
export type AtomStatus = "proposed" | "confirmed";
export type AtomOrigin = "manual" | "ai";

export type Role = {
  id: string;
  user_id: string;
  company: string;
  title: string;
  location: string | null;
  start_month: string | null; // "YYYY-MM-01"
  end_month: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
};

export type Atom = {
  id: string;
  user_id: string;
  role_id: string;
  kind: AtomKind;
  text: string;
  status: AtomStatus;
  origin: AtomOrigin;
  source_note_id: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export const ATOM_KINDS: { kind: AtomKind; label: string; hint: string; placeholder: string }[] = [
  {
    kind: "bullet",
    label: "What you did",
    hint: "Responsibilities and work, in your own words.",
    placeholder: "Led migration of billing service from monolith to separate service\nOnboarded and mentored 3 new engineers",
  },
  {
    kind: "outcome",
    label: "Results",
    hint: "Outcomes and numbers you can stand behind.",
    placeholder: "Cut monthly infra cost by about 20%\nReduced support tickets for invoicing by half",
  },
  {
    kind: "skill",
    label: "Skills",
    hint: "One per line.",
    placeholder: "Project management\nStakeholder communication",
  },
  {
    kind: "tool",
    label: "Tools & tech",
    hint: "One per line.",
    placeholder: "PostgreSQL\nFigma",
  },
];

export const KIND_LABEL: Record<AtomKind, string> = Object.fromEntries(
  ATOM_KINDS.map((k) => [k.kind, k.label]),
) as Record<AtomKind, string>;
