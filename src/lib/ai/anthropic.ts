import { claudeModel } from "./config";

/**
 * One forced tool call to Claude, returning the tool's JSON input.
 * Shared by structuring (M3) and generation (M4). Server-side only.
 */

const API_URL = "https://api.anthropic.com/v1/messages";

export class AIError extends Error {}

export type ToolSpec = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export async function callTool(opts: {
  system: string;
  user: string;
  tool: ToolSpec;
  maxTokens?: number;
  timeoutMs?: number;
  logTag: string;
}): Promise<{ input: Record<string, unknown>; model: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new AIError("AI isn't set up: ANTHROPIC_API_KEY is missing from .env.local.");
  }
  const model = claudeModel();

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
        model,
        max_tokens: opts.maxTokens ?? 4096,
        system: opts.system,
        tools: [opts.tool],
        tool_choice: { type: "tool", name: opts.tool.name },
        messages: [{ role: "user", content: opts.user }],
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 55_000),
      cache: "no-store",
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    throw new AIError(
      timedOut
        ? "The AI took too long to respond. Try again."
        : "Couldn't reach the AI service. Check your connection and try again.",
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[${opts.logTag}] Anthropic API error`, res.status, body.slice(0, 500));
    if (res.status === 401) throw new AIError("The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.");
    if (res.status === 404) throw new AIError("The configured AI model wasn't found. Check ANTHROPIC_MODEL.");
    if (res.status === 429 || res.status === 529) throw new AIError("The AI service is busy. Wait a minute and try again.");
    let detail = "";
    try {
      detail = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? "";
    } catch {
      /* not JSON */
    }
    throw new AIError(`The AI service returned an error (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}. Try again.`);
  }

  const data = (await res.json()) as {
    stop_reason?: string;
    content?: { type: string; name?: string; input?: unknown }[];
  };
  const call = data.content?.find((c) => c.type === "tool_use" && c.name === opts.tool.name);
  if (!call || typeof call.input !== "object" || call.input === null) {
    console.error(`[${opts.logTag}] unexpected response shape`, JSON.stringify(data).slice(0, 500));
    throw new AIError("The AI returned something unexpected. Try again.");
  }
  if (data.stop_reason === "max_tokens") {
    console.error(`[${opts.logTag}] response cut off at max_tokens`);
    throw new AIError("The AI's answer was cut off. Try again, or shorten the input.");
  }
  return { input: call.input as Record<string, unknown>, model };
}
