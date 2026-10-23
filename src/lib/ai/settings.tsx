import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_MODEL } from "./config";

/**
 * The user's own Anthropic API key and the shared model setting.
 *
 * The key is held in memory only (gone when the tab closes) unless the user
 * ticks "Remember on this device", which saves it in this browser's
 * localStorage. It is never written into the memory file and is only ever
 * sent to api.anthropic.com.
 */

const KEY_STORAGE = "resume-memory:anthropic-key";
const MODEL_STORAGE = "resume-memory:model";

function read(k: string): string {
  try {
    return localStorage.getItem(k) ?? "";
  } catch {
    return "";
  }
}

function write(k: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* storage blocked: the key still works for this tab */
  }
}

type AISettings = {
  apiKey: string;
  remembered: boolean;
  model: string;
  setKey: (key: string, remember: boolean) => void;
  forgetKey: () => void;
  setModel: (model: string) => void;
};

const Ctx = createContext<AISettings | null>(null);

export function AISettingsProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState(() => read(KEY_STORAGE));
  const [remembered, setRemembered] = useState(() => read(KEY_STORAGE) !== "");
  const [model, setModelState] = useState(() => read(MODEL_STORAGE) || DEFAULT_MODEL);

  const setKey = useCallback((key: string, remember: boolean) => {
    const clean = key.trim();
    setApiKey(clean);
    setRemembered(remember);
    write(KEY_STORAGE, remember && clean ? clean : null);
  }, []);

  const forgetKey = useCallback(() => {
    setApiKey("");
    setRemembered(false);
    write(KEY_STORAGE, null);
  }, []);

  const setModel = useCallback((m: string) => {
    const clean = m.trim() || DEFAULT_MODEL;
    setModelState(clean);
    write(MODEL_STORAGE, clean === DEFAULT_MODEL ? null : clean);
  }, []);

  const value = useMemo(
    () => ({ apiKey, remembered, model, setKey, forgetKey, setModel }),
    [apiKey, remembered, model, setKey, forgetKey, setModel],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAISettings(): AISettings {
  const s = useContext(Ctx);
  if (!s) throw new Error("useAISettings must be used inside <AISettingsProvider>");
  return s;
}

/** "sk-ant-api03-…AbCd" for showing which key is in use without revealing it. */
export function maskKey(key: string): string {
  if (key.length < 12) return "••••";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}
