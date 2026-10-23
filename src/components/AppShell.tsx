import type { ReactNode } from "react";
import { Link } from "@/router";
import { useStore } from "@/lib/memory/store";

/** Header + "download your file" banner for every screen once a file is open. */
export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const { memory, dirty, download, autosaveOk } = useStore();
  const width = wide ? "max-w-4xl" : "max-w-2xl";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-stone-200 dark:border-stone-800">
        <div className={`mx-auto flex ${width} flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6`}>
          <Link to={memory ? "/memory" : "/"} className="font-semibold">
            Resume Memory
          </Link>
          {memory && (
            <nav className="flex items-center gap-4 text-sm">
              <Link to="/memory" className="hover:underline">
                Overview
              </Link>
              <Link to="/setup" className="hover:underline">
                Guided setup
              </Link>
            </nav>
          )}
        </div>
      </header>

      {memory && dirty && (
        <div className="sticky top-0 z-10 border-b border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <div className={`mx-auto flex ${width} flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6`}>
            <p className="text-sm text-amber-900 dark:text-amber-100">
              {autosaveOk
                ? "You have changes that aren't in your memory file yet."
                : "This browser can't keep a backup copy. Download your file before you close this tab."}
            </p>
            <button type="button" onClick={download} className="btn-primary px-3 py-1.5 text-sm">
              Download your memory file
            </button>
          </div>
        </div>
      )}

      <main className={`mx-auto w-full ${width} flex-1 px-4 py-8 sm:px-6`}>{children}</main>

      <footer className="border-t border-stone-200 dark:border-stone-800">
        <div className={`mx-auto ${width} flex flex-wrap gap-x-4 gap-y-1 px-4 py-5 text-sm text-stone-500 sm:px-6`}>
          <span>Free. Nothing is stored on our end.</span>
          <Link to="/privacy" className="underline hover:no-underline">
            Where your data goes
          </Link>
          <a href="https://github.com/ItsNotShawn/Free-AI-Resume-Tool" className="underline hover:no-underline" rel="noreferrer" target="_blank">
            Source code
          </a>
        </div>
      </footer>
    </div>
  );
}
