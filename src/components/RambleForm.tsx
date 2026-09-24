"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_NOTE, MIN_NOTE } from "@/lib/ai/limits";
import { SubmitButton } from "./SubmitButton";

// Minimal typings for the browser Web Speech API (Chrome/Edge/Safari; not Firefox).
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
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const PLACEHOLDER = `Just talk or type it all out, in any order. For example:

"At Acme I ran the billing migration. We moved invoicing off the old monolith into its own service in Go with Postgres. I had three engineers with me and it took about 8 months. Afterwards invoice support tickets dropped by roughly half…"

What you worked on, what changed because of it, rough numbers if you know them, and the tools you used.`;

export function RambleForm({
  action,
  defaultValue = "",
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultValue?: string;
}) {
  const [text, setText] = useState(defaultValue);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const wantListening = useRef(false);

  useEffect(() => {
    setSupported(getRecognition() !== null);
    return () => {
      wantListening.current = false;
      recRef.current?.stop();
    };
  }, []);

  function append(chunk: string) {
    const clean = chunk.trim();
    if (!clean) return;
    setText((prev) => (prev && !/\s$/.test(prev) ? `${prev} ${clean}` : `${prev}${clean}`));
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
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) append(r[0].transcript);
        else pending += r[0].transcript;
      }
      setInterim(pending);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      wantListening.current = false;
      setMicError(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Microphone access is blocked. Allow it in your browser's address bar, then try again."
          : `Dictation stopped (${e.error}). You can keep typing.`,
      );
    };
    // Browsers end recognition after a pause; keep going until the user stops.
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
    rec.start();
    setListening(true);
  }

  function stop() {
    wantListening.current = false;
    recRef.current?.stop();
    setListening(false);
  }

  const length = text.trim().length;
  const tooShort = length < MIN_NOTE;
  const tooLong = length > MAX_NOTE;

  return (
    <form action={action} onSubmit={() => listening && stop()} className="space-y-3">
      <textarea
        name="note"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={9}
        maxLength={MAX_NOTE + 1000}
        placeholder={PLACEHOLDER}
        className="block w-full rounded-md border border-stone-300 bg-transparent px-3 py-2 text-sm leading-relaxed dark:border-stone-700"
        aria-label="Describe this role in your own words"
      />
      {interim && <p className="text-sm italic text-stone-400">{interim}…</p>}
      {micError && <p className="text-sm text-red-600">{micError}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {supported ? (
          <button
            type="button"
            onClick={listening ? stop : start}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
              listening
                ? "bg-red-600 text-white hover:bg-red-700"
                : "border border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
            }`}
            aria-pressed={listening}
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${listening ? "animate-pulse bg-white" : "bg-red-600"}`}
              aria-hidden
            />
            {listening ? "Stop dictating" : "Dictate"}
          </button>
        ) : (
          <span className="text-xs text-stone-500">Dictation needs Chrome, Edge or Safari. You can still type or paste.</span>
        )}

        <SubmitButton pendingText="Structuring… (can take 20–30 seconds)">Structure with AI</SubmitButton>

        <span className={`text-xs ${tooLong ? "text-red-600" : "text-stone-500"}`}>
          {tooShort
            ? `${length} characters, at least ${MIN_NOTE} needed`
            : `${length.toLocaleString()} / ${MAX_NOTE.toLocaleString()} characters`}
        </span>
      </div>
      <p className="text-xs text-stone-500">
        Your note is saved as written. The AI only proposes facts; nothing is added to your library until you confirm it.
      </p>
    </form>
  );
}
