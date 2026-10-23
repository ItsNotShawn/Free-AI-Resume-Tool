import { useId, useState } from "react";
import { ANTHROPIC_CONSOLE_URL, ANTHROPIC_PRICING_URL } from "@/lib/ai/config";
import { maskKey, useAISettings } from "@/lib/ai/settings";

/** Add, remember or forget the user's own Anthropic API key. */
export function KeyPanel({ onSaved, compact = false }: { onSaved?: () => void; compact?: boolean }) {
  const { apiKey, remembered, setKey, forgetKey } = useAISettings();
  const [draft, setDraft] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  function save() {
    const k = draft.trim();
    if (!k.startsWith("sk-ant-")) {
      setError('That doesn\'t look like an Anthropic API key. They start with "sk-ant-".');
      return;
    }
    setError(null);
    setKey(k, remember);
    setDraft("");
    onSaved?.();
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-semibold">Your Anthropic API key</h2>
        <p className="muted mt-1 text-sm">
          The AI features run on your own Anthropic account, so this tool stays free and we never pay for or see your requests.
        </p>
      </div>

      {apiKey ? (
        <div className="space-y-3">
          <p>
            Key added: <code className="rounded bg-stone-100 px-1.5 py-0.5 text-sm dark:bg-stone-800">{maskKey(apiKey)}</code>
          </p>
          <p className="muted text-sm">
            {remembered
              ? "Remembered on this device (saved in this browser's storage)."
              : "Kept only while this tab is open. You'll need to add it again next time."}
          </p>
          <button type="button" className="btn-danger" onClick={forgetKey}>
            Forget key
          </button>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div>
            <label htmlFor={id} className="label">
              Paste your key
            </label>
            <input
              id={id}
              className="input font-mono text-sm"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="sk-ant-…"
            />
          </div>
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-0.5 h-5 w-5" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>
              Remember on this device
              <span className="muted block text-sm">Only tick this on your own device. You can forget it any time.</span>
            </span>
          </label>
          {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
          <button type="submit" className="btn-primary" disabled={!draft.trim()}>
            Use this key
          </button>
        </form>
      )}

      {!compact && <KeyFacts />}
      {compact && (
        <details className="text-sm">
          <summary className="cursor-pointer underline">Where does my key go? How do I get one?</summary>
          <div className="mt-3">
            <KeyFacts />
          </div>
        </details>
      )}
    </div>
  );
}

function KeyFacts() {
  return (
    <ul className="muted list-disc space-y-2 pl-5 text-sm">
      <li>
        <strong className="font-medium text-stone-900 dark:text-stone-100">Where it goes:</strong> only to Anthropic
        (api.anthropic.com), straight from your browser with each request. It's never put in your memory file and never sent
        anywhere else. This site blocks connections to every other server.
      </li>
      <li>
        <strong className="font-medium text-stone-900 dark:text-stone-100">How to get one:</strong> sign in at the{" "}
        <a href={ANTHROPIC_CONSOLE_URL} target="_blank" rel="noreferrer" className="underline">
          Anthropic console
        </a>
        , add a little credit under Billing, then create a key under API keys. Setting a monthly spend limit there is a good
        idea.
      </li>
      <li>
        <strong className="font-medium text-stone-900 dark:text-stone-100">What it costs:</strong> you pay Anthropic per
        request. Filling in fields from speech is well under a cent. Turning a job's answers into facts or building a resume is
        roughly a few cents. See{" "}
        <a href={ANTHROPIC_PRICING_URL} target="_blank" rel="noreferrer" className="underline">
          Anthropic's pricing
        </a>
        .
      </li>
    </ul>
  );
}
