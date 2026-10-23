import type { ReactNode } from "react";
import { Link, navigate } from "@/router";
import { useMemoryFile } from "@/lib/memory/store";
import { buildSteps, stepGroup, stepHref, type StepKey } from "@/lib/steps";
import { AppShell } from "./AppShell";

/** One screen of the guided setup: progress, question, answer area, Back / Next. */
export function StepShell({
  step,
  question,
  help,
  children,
  nextLabel = "Next",
  onNext,
  nextDisabled = false,
}: {
  step: StepKey;
  question: string;
  help?: ReactNode;
  children: ReactNode;
  nextLabel?: string;
  /**
   * Runs before moving on. Return a step key to go there instead of the next
   * step (used when the step itself adds steps, e.g. creating jobs).
   */
  onNext?: () => StepKey | void;
  nextDisabled?: boolean;
}) {
  const { memory } = useMemoryFile();
  const steps = buildSteps(memory);
  const i = Math.max(0, steps.indexOf(step));
  const prev = i > 0 ? steps[i - 1] : null;
  const pct = Math.round((i / (steps.length - 1)) * 100);

  const next = i < steps.length - 1 ? steps[i + 1] : null;

  function goNext() {
    const chosen = onNext ? (onNext() as StepKey | undefined) : undefined;
    const target = chosen || next;
    if (target) navigate(stepHref(target));
  }

  return (
    <AppShell>
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-stone-500">
          <span>{stepGroup(step, memory)}</span>
          <span>{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800" aria-hidden="true">
          <div className="h-full rounded-full bg-stone-900 transition-all dark:bg-stone-100" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">{question}</h1>
      {help && <div className="muted mt-2">{help}</div>}

      <div className="mt-6 space-y-5">{children}</div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-stone-200 pt-5 dark:border-stone-800">
        {prev ? (
          <Link to={stepHref(prev)} className="btn-secondary">
            Back
          </Link>
        ) : (
          <Link to="/memory" className="btn-secondary">
            Overview
          </Link>
        )}
        {next && (
          <>
            <button type="button" className="btn-primary" disabled={nextDisabled} onClick={goNext}>
              {nextLabel}
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}
