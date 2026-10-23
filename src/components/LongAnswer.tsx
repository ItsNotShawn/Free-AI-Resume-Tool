import { useEffect, useId, useRef, useState } from "react";

/**
 * A big text box with an optional "Dictate" button that uses the browser's
 * built-in speech recognition (Chrome, Edge, Safari; not Firefox). Spoken
 * words are appended to whatever is already typed.
 */

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function LongAnswer({
  label,
  value,
  onChange,
  placeholder,
  rows = 8,
  hideLabel = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hideLabel?: boolean;
}) {
  const id = useId();
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const supported = useRef(getRecognition() !== null).current;
  const recRef = useRef<Recognition | null>(null);
  const wantListening = useRef(false);
  // Keep the latest value/onChange for the speech callbacks.
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };

  useEffect(
    () => () => {
      wantListening.current = false;
      recRef.current?.stop();
    },
    [],
  );

  function append(chunk: string) {
    const clean = chunk.trim();
    if (!clean) return;
    const prev = latest.current.value;
    const sep = prev && !/\s$/.test(prev) ? " " : "";
    const next = `${prev}${sep}${clean}`;
    // Update the ref now so a second result before re-render doesn't overwrite this one.
    latest.current = { ...latest.current, value: next };
    latest.current.onChange(next);
  }

  function start() {
    const Ctor = getRecognition();
    if (!Ctor) return;
    setMicError(null);
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finals = "";
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finals += ` ${r[0].transcript}`;
        else pending += r[0].transcript;
      }
      append(finals);
      setInterim(pending);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      wantListening.current = false;
      setMicError(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Microphone access is blocked. Allow it for this site in your browser settings, or use your keyboard's mic button instead."
          : `Dictation stopped (${e.error}). You can keep typing.`,
      );
    };
    // Browsers end recognition after a pause; restart until the user taps Stop.
    rec.onend = () => {
      setInterim("");
      if (wantListening.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through */
        }
      }
      setListening(false);
    };
    recRef.current = rec;
    wantListening.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      wantListening.current = false;
      setMicError("Couldn't start dictation. You can keep typing.");
    }
  }

  function stop() {
    wantListening.current = false;
    recRef.current?.stop();
    setListening(false);
  }

  return (
    <div>
      <div className={`mb-1 flex items-end justify-between gap-3 ${hideLabel ? "justify-end" : ""}`}>
        <label htmlFor={id} className={hideLabel ? "sr-only" : "label mb-0"}>
          {label}
        </label>
        {supported && (
          <button
            type="button"
            onClick={listening ? stop : start}
            aria-pressed={listening}
            className={listening ? "btn-danger px-3 py-1.5 text-sm" : "btn-secondary px-3 py-1.5 text-sm"}
          >
            <MicIcon />
            {listening ? "Stop" : "Dictate"}
          </button>
        )}
      </div>
      <textarea
        id={id}
        className="input min-h-40 leading-relaxed"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {listening && (
        <p className="mt-1 text-sm text-red-700 dark:text-red-300" aria-live="polite">
          Listening… {interim && <span className="muted italic">{interim}</span>}
        </p>
      )}
      {micError && <p className="mt-1 text-sm text-red-700 dark:text-red-300">{micError}</p>}
    </div>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="7" y="2.5" width="6" height="10" rx="3" />
      <path d="M4 9.5a6 6 0 0 0 12 0M10 15.5V18" strokeLinecap="round" />
    </svg>
  );
}
