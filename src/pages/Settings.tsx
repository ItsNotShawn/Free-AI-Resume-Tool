import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { KeyPanel } from "@/components/KeyPanel";
import { DEFAULT_MODEL } from "@/lib/ai/config";
import { useAISettings } from "@/lib/ai/settings";

export function Settings() {
  const { model, setModel } = useAISettings();
  const [draft, setDraft] = useState(model);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">AI settings</h1>
      <p className="muted mt-2">The AI features use your own Anthropic account. Nothing goes through us.</p>
      <div className="mt-6">
        <KeyPanel />
      </div>

      <section className="card mt-6 space-y-3">
        <h2 className="font-semibold">Model</h2>
        <p className="muted text-sm">
          Every AI step uses this one model. The default, {DEFAULT_MODEL}, is a good balance of quality and cost. Only change it
          if you know the model ID you want.
        </p>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setModel(draft);
            setDraft(draft.trim() || DEFAULT_MODEL);
          }}
        >
          <label htmlFor="model" className="sr-only">
            Model ID
          </label>
          <input id="model" className="input font-mono text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} />
          <button type="submit" className="btn-secondary" disabled={draft.trim() === model}>
            Save
          </button>
        </form>
        {model !== DEFAULT_MODEL && (
          <button
            type="button"
            className="btn-quiet text-sm"
            onClick={() => {
              setModel(DEFAULT_MODEL);
              setDraft(DEFAULT_MODEL);
            }}
          >
            Reset to {DEFAULT_MODEL}
          </button>
        )}
      </section>
    </AppShell>
  );
}
