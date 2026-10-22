const REPO_URL = "https://github.com/ItsNotShawn/MasterResumeSite";

const STEPS = [
  {
    title: "Tell it about each job once",
    body: "Type or dictate a long ramble about what you did. The AI splits it into small facts, and you confirm which ones are true.",
  },
  {
    title: "Paste a job posting",
    body: "Get a resume draft built only from your confirmed facts. Every line shows which facts it came from, and anything that doesn't match is flagged.",
  },
  {
    title: "Keep your memory file",
    body: "Everything lives in one file you download and keep. Open it again next time to pick up where you left off.",
  },
];

export function Home() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-2xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24">
        <h1 className="text-4xl font-semibold tracking-tight">Resume Memory</h1>
        <p className="mt-4 text-lg text-stone-600 dark:text-stone-400">
          Tell it your real experience once. Paste a job posting later and get a
          targeted resume built only from what you actually did.
        </p>

        <p className="mt-6 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          Free, forever. Your data stays on your device, and you use your own AI key.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled
            className="rounded-md bg-stone-900 px-5 py-2.5 text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900"
          >
            Start a new memory
          </button>
          <button
            type="button"
            disabled
            className="rounded-md border border-stone-300 px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700"
          >
            Open my memory file
          </button>
        </div>
        <p className="mt-2 text-sm text-stone-500">
          Starting and opening memory files arrives in the next update.
        </p>

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
                  <p className="mt-1 text-stone-600 dark:text-stone-400">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase">Your data</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-stone-600 dark:text-stone-400">
            <li>No accounts, no sign-up, no tracking or analytics.</li>
            <li>Your career memory is a file on your device. This site has no server and stores nothing.</li>
            <li>
              AI requests go straight from your browser to Anthropic using your own API key.
              You pay Anthropic only for the requests you make.
            </li>
            <li>No paid tiers, no ads, no limits.</li>
          </ul>
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
