/**
 * "Never invent" guard for GENERATED resumes. Pure functions, no I/O.
 *
 * Structure the model cannot touch (filled from the database in code):
 *  - job titles, employers, locations, dates  → straight from `roles`
 *  - skills section                            → exact text of cited skill/tool atoms
 *
 * Every bullet the model writes must cite confirmed facts from the SAME role.
 * Each bullet is checked against the facts it cites:
 *
 *  REMOVED (never shown as part of the resume):
 *   - cites no facts, cites a fact that doesn't exist, or a fact from another job
 *   - empty / overlong / duplicate
 *  FLAGGED (shown highlighted with the reason, for the user to fix or remove):
 *   - a number that isn't in the cited facts
 *   - an estimate in the facts ("about 8 months") stated as exact
 *   - a named term (tool, product, acronym, proper noun) not in the cited facts
 *   - a word taken from the job posting that appears in none of the user's facts
 *   - a leadership/ownership verb ("led", "managed", "owned") the cited facts don't use
 */

import type { AtomKind } from "@/lib/types";
import { HEDGE, noteNumbers, normalize, numbersIn, STOPWORDS, tokens } from "./verify";

export type FactForGen = { id: string; role_id: string; kind: AtomKind; text: string };
export type RoleForGen = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  start_month: string | null;
  end_month: string | null;
  is_current: boolean;
};

/** What the model returns (short IDs, e.g. R1 / F7). */
export type ModelDraft = {
  roles: { role: string; bullets: { text: string; facts: string[] }[] }[];
  skills: string[];
};

export type DraftBullet = { text: string; atom_ids: string[]; flags: string[] };
export type DraftRole = RoleForGen & { role_id: string; bullets: DraftBullet[] };
export type DraftContent = {
  version: 1;
  roles: DraftRole[];
  skills: { atom_id: string; text: string }[];
  removed: { text: string; reason: string }[];
};

export const MAX_BULLETS_PER_ROLE = 8;
export const MAX_SKILLS = 20;
const MAX_BULLET = 400;

/** Words resumes and job posts share constantly; never worth flagging on their own. */
const GENERIC = new Set(
  (
    "team teams work worked working across cross functional stakeholders stakeholder customer customers client clients " +
    "product products project projects company business process processes system systems service services support " +
    "quality delivery deliver delivered improve improved improving ensure ensured drive drove driving develop developed " +
    "development build built building design designed designing manage managed managing lead led leading create created " +
    "including within using used new key high large multiple various daily weekly monthly internal external " +
    "role roles responsible responsibilities experience strong ability skills skill tools tool environment solutions solution " +
    "results result impact partner partnered collaborate collaborated collaboration communication operations operational " +
    "requirements goals plans planning strategy strategic initiatives initiative program programs data reporting reports"
  ).split(" "),
);

/** Very light stemming so "migrated"/"migration"/"migrations" can match. */
function stem(w: string): string {
  let s = w.toLowerCase().replace(/'s$/, "");
  for (const suf of ["ations", "ation", "ments", "ment", "ings", "ing", "ers", "er", "ies", "ied", "ed", "es", "s", "ly"]) {
    if (s.length - suf.length >= 3 && s.endsWith(suf)) {
      s = s.slice(0, -suf.length);
      break;
    }
  }
  return s;
}

function stemSet(text: string): Set<string> {
  return new Set(tokens(text).map(stem));
}

/** Is this word covered by the allowed words? Also accepts a shortening ("infra" → "infrastructure"). */
function covered(word: string, allowed: Set<string>): boolean {
  const s = stem(word);
  if (allowed.has(s)) return true;
  for (const a of allowed) if (a.length >= 5 && s.startsWith(a)) return true;
  return false;
}

/**
 * Terms that look like names or technologies: capitalized mid-sentence,
 * all caps, or containing digits/symbols (e.g. "Kubernetes", "AWS", "C++", "S3").
 */
function namedTerms(text: string): string[] {
  const words = text.split(/\s+/).map((w) => w.replace(/^[("'“‘\[]+|[)"'”’\].,;:!?]+$/g, ""));
  const out: string[] = [];
  words.forEach((w, i) => {
    if (!w || /^\d+([.,]\d+)?%?$/.test(w)) return; // plain numbers are handled by the number check
    const looksNamed =
      (i > 0 && /^[A-Z][a-zA-Z]/.test(w)) || /^[A-Z]{2,}s?$/.test(w) || /[A-Za-z][0-9+#]|[0-9][A-Za-z]|\w\.\w/.test(w);
    if (looksNamed) out.push(w);
  });
  return out;
}

/** Words that claim leadership or ownership. Each must be backed by the cited facts. */
const SENIORITY: Record<string, string> = {
  led: "lead", lead: "lead", leading: "lead", leads: "lead",
  managed: "manag", manage: "manag", managing: "manag", manager: "manag",
  directed: "direct", headed: "head", spearheaded: "spearhead", supervised: "supervis",
  oversaw: "oversaw", overseeing: "oversee", owned: "own", owning: "own",
  architected: "architect", founded: "found", mentored: "mentor", mentoring: "mentor",
};

function seniorityRoots(text: string): Set<string> {
  const out = new Set<string>();
  for (const t of tokens(text)) if (SENIORITY[t]) out.add(SENIORITY[t]);
  return out;
}

export function groundDraft(input: {
  model: ModelDraft;
  roles: RoleForGen[]; // display order
  roleShort: Map<string, string>; // "R1" → role uuid
  factShort: Map<string, FactForGen>; // "F1" → fact
  jobText: string;
}): DraftContent {
  const { model, roles, roleShort, factShort, jobText } = input;
  const removed: DraftContent["removed"] = [];
  const allFactStems = new Set<string>();
  for (const f of factShort.values()) for (const s of stemSet(f.text)) allFactStems.add(s);
  const jobStems = stemSet(jobText);

  const bulletsByRole = new Map<string, DraftBullet[]>();
  const seen = new Set<string>();

  for (const r of model.roles ?? []) {
    const roleId = roleShort.get(String(r.role ?? "").trim());
    for (const b of r.bullets ?? []) {
      const text = String(b.text ?? "").replace(/\s+/g, " ").trim().replace(/\.$/, "");
      const cites = [...new Set((b.facts ?? []).map((x) => String(x).trim()))];
      const reject = (reason: string) => text && removed.push({ text, reason });

      if (!roleId) { reject("Refers to a job that isn't in your library."); continue; }
      if (!text) continue;
      if (text.length > MAX_BULLET) { reject("Too long."); continue; }
      if (cites.length === 0) { reject("Doesn't cite any of your facts."); continue; }
      const facts = cites.map((c) => factShort.get(c));
      if (facts.some((f) => !f)) { reject("Cites a fact that doesn't exist."); continue; }
      const cited = facts as FactForGen[];
      if (cited.some((f) => f.role_id !== roleId)) { reject("Cites a fact from a different job."); continue; }
      const key = normalize(text);
      if (seen.has(key)) { reject("Duplicate line."); continue; }
      const list = bulletsByRole.get(roleId) ?? [];
      if (list.length >= MAX_BULLETS_PER_ROLE) { reject("Too many lines for one job."); continue; }

      // ---- grounding against the cited facts ----
      const citedText = cited.map((f) => f.text).join(" \n ");
      const role = roles.find((x) => x.id === roleId)!;
      const allowedStems = stemSet(`${citedText} ${role.title} ${role.company} ${role.location ?? ""}`);
      const flags: string[] = [];

      const nums = noteNumbers(citedText);
      const newNums = numbersIn(text).filter((n) => !nums.has(n));
      if (newNums.length) {
        flags.push(`Number${newNums.length > 1 ? "s" : ""} not in the cited facts: ${newNums.join(", ")}.`);
      }
      if (numbersIn(text).length && HEDGE.test(normalize(citedText)) && !HEDGE.test(normalize(text))) {
        flags.push("Your fact is an estimate, but this line states it as exact.");
      }

      const factRoots = seniorityRoots(citedText);
      const claimed = tokens(text).filter((t) => SENIORITY[t] && !factRoots.has(SENIORITY[t]));
      if (claimed.length) {
        flags.push(`Says "${claimed[0]}", but the cited facts don't say you ${claimed[0] === "led" || claimed[0] === "lead" ? "led" : "did"} that. Use your own verb unless it's true.`);
      }

      const newNamed = [...new Set(namedTerms(text).filter((t) => {
        const parts = tokens(t).map(stem);
        return parts.length > 0 && parts.some((p) => !covered(p, allowedStems));
      }))];
      if (newNamed.length) {
        flags.push(`Mentions ${newNamed.map((t) => `"${t}"`).join(", ")}, which ${newNamed.length > 1 ? "aren't" : "isn't"} in the cited facts.`);
      }

      const fromJob = [...new Set(tokens(text).filter((t) => {
        return t.length >= 4 && !/^\d/.test(t) && !STOPWORDS.has(t) && !GENERIC.has(t) &&
          !covered(t, allowedStems) && !covered(t, allFactStems) && jobStems.has(stem(t)) &&
          !newNamed.some((n) => normalize(n).includes(t));
      }))];
      if (fromJob.length) {
        flags.push(`Uses ${fromJob.map((t) => `"${t}"`).join(", ")} from the job posting, which none of your facts mention.`);
      }

      seen.add(key);
      list.push({ text, atom_ids: cited.map((f) => f.id), flags });
      bulletsByRole.set(roleId, list);
    }
  }

  // Skills: only confirmed skill/tool facts, shown with the user's own wording.
  const skills: DraftContent["skills"] = [];
  const seenSkill = new Set<string>();
  for (const short of model.skills ?? []) {
    const f = factShort.get(String(short).trim());
    if (!f || (f.kind !== "skill" && f.kind !== "tool")) continue;
    const k = normalize(f.text);
    if (seenSkill.has(k) || skills.length >= MAX_SKILLS) continue;
    seenSkill.add(k);
    skills.push({ atom_id: f.id, text: f.text });
  }

  return {
    version: 1,
    roles: roles.map((r) => ({ ...r, role_id: r.id, bullets: bulletsByRole.get(r.id) ?? [] })),
    skills,
    removed,
  };
}

/** Every atom a draft relies on (for draft_atoms / "what was used"). */
export function usedAtomIds(d: DraftContent): string[] {
  const ids = new Set<string>();
  for (const r of d.roles) for (const b of r.bullets) for (const id of b.atom_ids) ids.add(id);
  for (const s of d.skills) ids.add(s.atom_id);
  return [...ids];
}
