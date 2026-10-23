import { useState } from "react";
import { AIError } from "@/lib/ai/anthropic";
import { useAISettings } from "@/lib/ai/settings";
import { KeyPanel } from "./KeyPanel";
import { LongAnswer } from "./LongAnswer";
import { Notice } from "./ui";

/**
 * "Say it instead": a dictation box plus a button that has the AI sort what
 * was said into the form below. `onFill` does the AI call and applies the
 * results; it returns a short summary for the confirmation message.
 */
export function SpeakToFill({
  title,
  prompt,
  placeholder,
  value,
  onChange,
  onFill,
  buttonLabel = "Fill in the fields",
  defaultOpen = true,
}: {
  title: string;
  prompt: string;
  placeholder: string;
  /** The transcript is controlled by the caller so it can be saved if wanted. */
  value: string;
  onChange: (v: string) => void;
  onFill: (transcript: string, creds: { apiKey: string; model: string }) => Promise<string>;
  buttonLabel?: string;
  defaultOpen?: boolean;
}) {
  const { apiKey, model } = useAISettings();
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [needKey, setNeedKey] = useState(false);

  async function run() {
    if (!apiKey) {
      setNeedKey(true);
      return;
    }
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const summary = await onFill(value.trim(), { apiKey, model });
      setDone(summary);
    } catch (e) {
      if (e instanceof AIError && (e.kind === "no-key" || e.kind === "bad-key")) setNeedKey(true);
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn-secondary w-full" onClick={() => setOpen(true)}>
        {title}
      </button>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border-2 border-dashed border-stone-300 p-4 dark:border-stone-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="muted mt-1 text-sm">{prompt}</p>
        </div>
        <button type="button" className="btn-quiet shrink-0 text-sm" onClick={() => setOpen(false)}>
          Hide
        </button>
      </div>
      <LongAnswer label="What you said" hideLabel rows={4} value={value} onChange={onChange} placeholder={placeholder} />
      <button type="button" className="btn-primary w-full sm:w-auto" disabled={busy || value.trim().length < 5} onClick={run}>
        {busy ? "Filling in…" : buttonLabel}
      </button>
      {error && <Notice tone="error">{error}</Notice>}
      {needKey && (
        <KeyPanel
          compact
          onSaved={() => {
            setNeedKey(false);
            setError(null);
          }}
        />
      )}
      {done && <Notice tone="ok">{done}</Notice>}
    </section>
  );
}
