import { useRef, useState, type ChangeEvent } from "react";
import { Link, navigate } from "@/router";
import { useStore } from "@/lib/memory/store";
import { MemoryFileError } from "@/lib/memory/schema";
import { Notice } from "@/components/ui";
import { WhereYourDataGoes } from "@/components/WhereYourDataGoes";

const REPO_URL = "https://github.com/ItsNotShawn/Free-AI-Resume-Tool";

const STEPS = [
  {
    title: "Answer a few questions at a time",
    body: "It walks you through your jobs, education, certifications, skills and more, one short question per screen. Talk or type your answers.",
  },
  {
    title: "Confirm the facts",
    body: "The AI turns your answers into small facts about your experience. You decide which ones are true. Nothing counts until you confirm it.",
  },
  {
    title: "Paste a job posting",
    body: "Get a resume built only from your confirmed facts. Every line shows where it came from, and anything that doesn't match is flagged.",
  },
];

export function Home() {
  const { memory, startNew, open, dirty } = useStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState<null | "new" | "open">(null);

  function doStartNew() {
    startNew();
    navigate("/setup/contact");
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      await open(file);
      navigate("/memory");
    } catch (err) {
      setError(err instanceof MemoryFileError ? err.message : "Couldn't open that file.");
    }
  }

  function requestNew() {
    if (memory && dirty) setConfirmReplace("new");
    else doStartNew();
  }

  function requestOpen() {
    if (memory && dirty) setConfirmReplace("open");
    else fileInput.current?.click();
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-2xl px-4 pt-14 pb-12 sm:px-6 sm:pt-24">
        <h1 className="text-4xl font-semibold tracking-tight">Resume Memory</h1>
        <p className="muted mt-4 text-lg">
          Tell it your real experience once. Paste a job posting later and get a targeted resume built only from what you
          actually did.
        </p>

        <div className="mt-6">
          <Notice tone="ok">
            <strong className="font-semibold">Free, forever. Nothing is stored on our end.</strong> Your information lives in a
            file on your device, and the AI runs on your own key.
          </Notice>
        </div>

        {memory && (
          <div className="card mt-8">
            <p className="font-medium">You have a memory file open in this browser.</p>
            <p className="muted mt-1 text-sm">
              {memory.profile.name ? `${memory.profile.name} · ` : ""}
              {memory.roles.length} {memory.roles.length === 1 ? "job" : "jobs"}
              {dirty ? " · has changes you haven't downloaded" : ""}
            </p>
            <Link to="/memory" className="btn-primary mt-4">
              Continue where you left off
            </Link>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" className={memory ? "btn-secondary" : "btn-primary"} onClick={requestNew}>
            Start a new memory
          </button>
          <button type="button" className="btn-secondary" onClick={requestOpen}>
            Open my memory file
          </button>
          <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
        </div>

        {confirmReplace && (
          <div className="mt-4">
            <Notice tone="warn">
              <p>The file open in this browser has changes you haven't downloaded. If you continue, they'll be lost.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/memory" className="btn-secondary px-3 py-1.5 text-sm">
                  Go back and download it
                </Link>
                <button
                  type="button"
                  className="btn-danger px-3 py-1.5 text-sm"
                  onClick={() => {
                    const what = confirmReplace;
                    setConfirmReplace(null);
                    if (what === "new") doStartNew();
                    else fileInput.current?.click();
                  }}
                >
                  Continue anyway
                </button>
              </div>
            </Notice>
          </div>
        )}

        {error && (
          <div className="mt-4">
            <Notice tone="error">{error}</Notice>
          </div>
        )}

        <section className="mt-14">
          <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase">How it works</h2>
          <ol className="mt-4 space-y-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone-300 text-sm dark:border-stone-700">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-medium">{s.title}</h3>
                  <p className="muted mt-1">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase">Where your information goes</h2>
          <div className="mt-4">
            <WhereYourDataGoes />
          </div>
          <p className="muted mt-4 text-sm">No paid tiers, no ads, no sign-up, no limits.</p>
        </section>
      </main>

      <footer className="border-t border-stone-200 dark:border-stone-800">
        <div className="mx-auto max-w-2xl px-4 py-6 text-sm text-stone-500 sm:px-6">
          Open source.{" "}
          <a href={REPO_URL} className="underline hover:no-underline" rel="noreferrer" target="_blank">
            View the code on GitHub
          </a>
          .
        </div>
      </footer>
    </div>
  );
}
