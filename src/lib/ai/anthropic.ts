/**
 * One forced tool call to Claude, made straight from the browser with the
 * user's own key. Nothing goes through any server of ours. The page's
 * Content-Security-Policy only allows connections to api.anthropic.com.
 *
 * Kept behind this small interface so other providers can be added later.
 */

const API_URL = "https://api.anthropic.com/v1/messages";

export class AIError extends Error {
  constructor(
    message: string,
    readonly kind: "no-key" | "bad-key" | "no-credit" | "busy" | "model" | "network" | "other" = "other",
  ) {
    super(message);
  }
}

export type ToolSpec = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export async function callTool(opts: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  tool: ToolSpec;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<Record<string, unknown>> {
  const apiKey = opts.apiKey.trim();
  if (!apiKey) throw new AIError("Add your Anthropic API key first.", "no-key");

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        // Required by Anthropic for calls made directly from a web page.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens ?? 2048,
        system: opts.system,
        tools: [opts.tool],
        tool_choice: { type: "tool", name: opts.tool.name },
        messages: [{ role: "user", content: opts.user }],
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
      referrerPolicy: "no-referrer",
      credentials: "omit",
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    throw new AIError(
      timedOut ? "The AI took too long to respond. Try again." : "Couldn't reach Anthropic. Check your connection and try again.",
      "network",
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let detail = "";
    try {
      detail = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? "";
    } catch {
      /* not JSON */
    }
    if (res.status === 401) throw new AIError("Anthropic didn't accept that API key. Check it and add it again.", "bad-key");
    if (res.status === 403) throw new AIError(`Anthropic refused the request${detail ? `: ${detail}` : "."}`, "bad-key");
    if (/credit balance/i.test(detail)) {
      throw new AIError("Your Anthropic account is out of credit. Add credit in the Anthropic console, then try again.", "no-credit");
    }
    if (res.status === 404) throw new AIError(`The model "${opts.model}" wasn't found. Check the model in Settings.`, "model");
    if (res.status === 429 || res.status === 529) throw new AIError("Anthropic is busy or rate-limiting this key. Wait a minute and try again.", "busy");
    throw new AIError(`Anthropic returned an error (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}.`);
  }

  const data = (await res.json()) as {
    stop_reason?: string;
    content?: { type: string; name?: string; input?: unknown }[];
  };
  if (data.stop_reason === "max_tokens") {
    throw new AIError("The AI's answer was cut off. Try again, or shorten what you said.");
  }
  const call = data.content?.find((c) => c.type === "tool_use" && c.name === opts.tool.name);
  if (!call || typeof call.input !== "object" || call.input === null) {
    throw new AIError("The AI returned something unexpected. Try again.");
  }
  return call.input as Record<string, unknown>;
}
