/**
 * "Never invent" guard for AI-proposed atoms. Pure functions, no I/O.
 *
 * The model is told to only use facts from the user's note, but we do not
 * trust that. Every proposal is checked here against the note itself:
 *
 *  1. Evidence: the proposal must quote a span of the note. If the quote
 *     can't be found (even loosely), the proposal is DROPPED.
 *  2. Numbers: every number in the proposed text must appear in the note.
 *     Otherwise it is FLAGGED for the user.
 *  3. Skills/tools: the named skill or tool must appear in the note.
 *     Otherwise it is FLAGGED.
 *  4. Estimates ("about", "roughly") must not become exact figures. FLAGGED.
 *  5. The model's own "needs your input" questions are kept as flags.
 *
 * Flagged items reach the review screen unticked, with the reason shown.
 */

import type { AtomKind } from "@/lib/types";

export type RawProposal = {
  kind: string;
  text: string;
  evidence: string;
  needs_input?: string | null;
};

export type CheckedProposal = {
  kind: AtomKind;
  text: string;
  evidence: string;
  review_note: string | null;
};

export type VerifyResult = {
  kept: CheckedProposal[];
  dropped: { proposal: RawProposal; reason: string }[];
};

const KINDS: AtomKind[] = ["bullet", "outcome", "skill", "tool"];
export const MAX_PROPOSALS = 60;
const MAX_TEXT = 600;

/** Lowercase, unify quotes/dashes, strip thousands separators, collapse whitespace. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Word tokens (letters/digits, keeps things like c++, c#, node.js, 3.5). */
function tokens(s: string): string[] {
  return normalize(s)
    .split(/[^a-z0-9+#.%$]+/)
    .map((t) => t.replace(/^[.]+|[.]+$/g, ""))
    .filter((t) => t.length > 0);
}

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with", "at", "by",
  "from", "as", "is", "was", "were", "be", "been", "it", "that", "this", "i", "we", "my", "our",
]);

/** Share of the evidence's meaningful words that occur in the note. */
function tokenCoverage(evidence: string, noteTokens: Set<string>): number {
  const ev = tokens(evidence).filter((t) => !STOPWORDS.has(t));
  if (ev.length === 0) return 0;
  return ev.filter((t) => noteTokens.has(t)).length / ev.length;
}

/**
 * Numbers mentioned in text: "20%", "3.5", "$1.2m", "1,200", "2023".
 * Returned normalized (no commas, no currency sign) for comparison.
 */
export function numbersIn(s: string): string[] {
  const n = normalize(s);
  const out = new Set<string>();
  for (const m of n.matchAll(/\d+(?:\.\d+)?/g)) out.add(m[0]);
  return [...out];
}

/** Number words people say out loud, so "three engineers" can support "3 engineers". */
const NUMBER_WORDS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7",
  eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", fifteen: "15",
  twenty: "20", thirty: "30", forty: "40", fifty: "50", hundred: "100",
  half: "50", dozen: "12",
};

function noteNumbers(note: string): Set<string> {
  const set = new Set(numbersIn(note));
  for (const t of tokens(note)) {
    if (NUMBER_WORDS[t]) set.add(NUMBER_WORDS[t]);
  }
  return set;
}

/** Is a named skill/tool actually in the note? Exact phrase, or every word present. */
function termInNote(term: string, noteNorm: string, noteTokens: Set<string>): boolean {
  const t = normalize(term);
  if (t && noteNorm.includes(t)) return true;
  const words = tokens(term).filter((w) => !STOPWORDS.has(w));
  return words.length > 0 && words.every((w) => noteTokens.has(w));
}

const HEDGE = /\b(about|around|roughly|approximately|approx|nearly|almost|close to|over|under|more than|less than|up to|at least)\b|~/;

export function verifyProposals(note: string, proposals: RawProposal[]): VerifyResult {
  const noteNorm = normalize(note);
  const noteTokens = new Set(tokens(note));
  const noteNums = noteNumbers(note);
  const kept: CheckedProposal[] = [];
  const dropped: VerifyResult["dropped"] = [];
  const seen = new Set<string>();

  for (const p of proposals.slice(0, MAX_PROPOSALS)) {
    const kind = KINDS.find((k) => k === p.kind);
    const text = (p.text ?? "").replace(/\s+/g, " ").trim();
    const evidence = (p.evidence ?? "").replace(/\s+/g, " ").trim();

    if (!kind) {
      dropped.push({ proposal: p, reason: `unknown kind "${p.kind}"` });
      continue;
    }
    if (!text || text.length > MAX_TEXT) {
      dropped.push({ proposal: p, reason: "empty or too long" });
      continue;
    }
    const key = `${kind}|${normalize(text)}`;
    if (seen.has(key)) {
      dropped.push({ proposal: p, reason: "duplicate" });
      continue;
    }

    // 1. Evidence must come from the note.
    const flags: string[] = [];
    if (!evidence) {
      dropped.push({ proposal: p, reason: "no supporting quote" });
      continue;
    }
    if (!noteNorm.includes(normalize(evidence))) {
      const coverage = tokenCoverage(evidence, noteTokens);
      if (coverage < 0.85) {
        dropped.push({ proposal: p, reason: "quote not found in note" });
        continue;
      }
      flags.push("The supporting quote doesn't match your note word for word. Check it says what you meant.");
    }

    // 2. No numbers the user didn't say.
    const invented = numbersIn(text).filter((n) => !noteNums.has(n));
    if (invented.length > 0) {
      flags.push(`Contains ${invented.length === 1 ? "a number" : "numbers"} not in your note (${invented.join(", ")}). Fix or remove.`);
    }

    // 2b. Don't turn "roughly half" into a flat "50%".
    if (numbersIn(text).length > 0 && HEDGE.test(normalize(evidence)) && !HEDGE.test(normalize(text))) {
      flags.push("Your note gave this as an estimate; the wording drops that. Add \"about\" or confirm the exact figure.");
    }

    // 3. Skills and tools must be named in the note.
    if ((kind === "skill" || kind === "tool") && !termInNote(text, noteNorm, noteTokens)) {
      flags.push(`"${text}" isn't named in your note. Only keep it if you really used it here.`);
    }

    // 4. The model's own uncertainty.
    const q = (p.needs_input ?? "").trim();
    if (q) flags.push(q);

    seen.add(key);
    kept.push({
      kind,
      text,
      evidence: evidence.slice(0, 1000),
      review_note: flags.length ? flags.join(" ").slice(0, 500) : null,
    });
  }

  for (const p of proposals.slice(MAX_PROPOSALS)) {
    dropped.push({ proposal: p, reason: "over the per-note limit" });
  }
  return { kept, dropped };
}
