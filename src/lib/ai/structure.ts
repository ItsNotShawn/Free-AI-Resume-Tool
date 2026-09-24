import { claudeModel } from "./config";
import type { RawProposal } from "./verify";

/**
 * Asks Claude to split one free-form note about a role into proposed atoms.
 * Output is forced through a tool schema so we always get JSON back.
 * Everything returned is still checked by verifyProposals() before storage.
 */

const API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM = `You turn a person's own description of ONE job into small, separate resume facts ("atoms").

Hard rules. Breaking any of these is worse than returning fewer items:
- Use ONLY what the note states. Never add skills, tools, technologies, employers, titles, dates, team sizes, metrics, or outcomes that are not in the note.
- Do not infer. "I was on call" does not mean "incident response" unless they said so. "Wrote docs" does not make "technical writing" a skill.
- Do not upgrade scope or seniority. "Helped with" stays "helped with", not "led". "Was basically running" may be "ran", not "led a team" unless a team they led is described.
- Keep estimates as estimates: "about 8 months", "roughly half". Never turn an estimate into an exact figure.
- Every item MUST include "evidence": an exact, verbatim, contiguous quote copied from the note (3 to 300 characters) that supports it. Copy it character for character. If you cannot quote support for an item, leave the item out.
- If something is worth including but vague (e.g. "made it way faster"), keep the person's claim without inventing a figure and set "needs_input" to one short question (e.g. "How much faster? Add a number if you know it.").
- Ignore anything that is clearly about a different job, and do not produce items for the job title, company name, location, or dates themselves.
- Do not repeat anything already listed under "Already saved for this role".

Kinds:
- "bullet": something they did (responsibility, project, contribution). Write as a concise resume line starting with a verb, no trailing period, in their own terms. Past tense unless the role is current.
- "outcome": a result or impact of their work. Only if the note states the result.
- "skill": a skill they explicitly name (e.g. "SQL", "negotiation", "Spanish"). Use their wording.
- "tool": a named product, language, platform, framework, machine, or piece of equipment they used. Use the name as they said it.

Prefer fewer, accurate items over many padded ones. If the note contains nothing usable, return an empty list.`;

const TOOL = {
  name: "propose_atoms",
  description: "Return the proposed atoms extracted from the note.",
  input_schema: {
    type: "object",
    properties: {
      atoms: {
        type: "array",
        maxItems: 60,
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["bullet", "outcome", "skill", "tool"] },
            text: { type: "string", description: "The atom as it would appear on a resume." },
            evidence: { type: "string", description: "Exact verbatim quote from the note supporting this atom." },
            needs_input: {
              type: ["string", "null"],
              description: "One short question if the user must clarify or add a detail; otherwise null.",
            },
          },
          required: ["kind", "text", "evidence", "needs_input"],
        },
      },
    },
    required: ["atoms"],
  },
} as const;

export type RoleContext = {
  title: string;
  company: string;
  isCurrent: boolean;
  dates: string;
  existing: string[];
};

export class StructuringError extends Error {}

export async function proposeAtoms(note: string, role: RoleContext): Promise<RawProposal[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new StructuringError("AI structuring isn't set up: ANTHROPIC_API_KEY is missing from .env.local.");
  }

  const existing = role.existing.length
    ? role.existing.map((e) => `- ${e}`).join("\n")
    : "(nothing yet)";

  const userMessage = `Role: ${role.title} at ${role.company} (${role.dates}${role.isCurrent ? ", current role" : ""})

Already saved for this role:
${existing}

<note>
${note}
</note>

Extract the atoms using the propose_atoms tool.`;

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: claudeModel(),
        max_tokens: 4096,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: AbortSignal.timeout(55_000),
      cache: "no-store",
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    throw new StructuringError(
      timedOut ? "The AI took too long to respond. Try again, or split a very long note in two." : "Couldn't reach the AI service. Check your connection and try again.",
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[structure] Anthropic API error", res.status, body.slice(0, 500));
    if (res.status === 401) throw new StructuringError("The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.");
    if (res.status === 404) throw new StructuringError("The configured AI model wasn't found. Check ANTHROPIC_MODEL.");
    if (res.status === 429 || res.status === 529) throw new StructuringError("The AI service is busy. Wait a minute and try again.");
    let detail = "";
    try {
      detail = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? "";
    } catch {
      /* not JSON */
    }
    throw new StructuringError(
      `The AI service returned an error (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}. Try again.`,
    );
  }

  const data = (await res.json()) as {
    content?: { type: string; name?: string; input?: { atoms?: unknown } }[];
  };
  const call = data.content?.find((c) => c.type === "tool_use" && c.name === TOOL.name);
  const atoms = call?.input?.atoms;
  if (!Array.isArray(atoms)) {
    console.error("[structure] unexpected response shape", JSON.stringify(data).slice(0, 500));
    throw new StructuringError("The AI returned something unexpected. Try again.");
  }

  return atoms
    .filter((a): a is Record<string, unknown> => typeof a === "object" && a !== null)
    .map((a) => ({
      kind: String(a.kind ?? ""),
      text: String(a.text ?? ""),
      evidence: String(a.evidence ?? ""),
      needs_input: typeof a.needs_input === "string" ? a.needs_input : null,
    }));
}
