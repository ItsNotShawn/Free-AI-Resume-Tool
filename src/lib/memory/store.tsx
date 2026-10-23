import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_FILENAME, emptyMemory, MemoryFileError, normalize, now, parseMemoryFile, serialize, type MemoryFile } from "./schema";

/**
 * Holds the open memory file in React state.
 *
 * A working copy is autosaved to this browser's localStorage so a refresh or a
 * closed tab doesn't lose work. That copy never leaves the device. "dirty"
 * means there are changes the user hasn't downloaded into their file yet.
 */

const STORAGE_KEY = "resume-memory:working-copy";

type Saved = { memory: unknown; dirty: boolean; filename?: string };

function readWorkingCopy(): { memory: MemoryFile; dirty: boolean; filename: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    if (!saved || typeof saved !== "object" || typeof saved.memory !== "object" || saved.memory === null) return null;
    return {
      memory: normalize(saved.memory as Record<string, unknown>),
      dirty: saved.dirty === true,
      filename: typeof saved.filename === "string" && saved.filename ? saved.filename : DEFAULT_FILENAME,
    };
  } catch {
    return null;
  }
}

function writeWorkingCopy(value: Saved | null): boolean {
  try {
    if (value === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

type Store = {
  memory: MemoryFile | null;
  /** Changes not yet downloaded into the user's file. */
  dirty: boolean;
  /** False if this browser refused to keep a working copy (private mode, storage full). */
  autosaveOk: boolean;
  filename: string;
  /** Apply a change. The updater gets the current file and returns the new one. */
  update: (fn: (m: MemoryFile) => MemoryFile) => void;
  startNew: () => void;
  open: (file: File) => Promise<void>;
  download: () => void;
  /** Close the file and remove the working copy from this browser. */
  clear: () => void;
};

const Ctx = createContext<Store | null>(null);

export function MemoryProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(readWorkingCopy, []);
  const [memory, setMemory] = useState<MemoryFile | null>(initial?.memory ?? null);
  const [dirty, setDirty] = useState(initial?.dirty ?? false);
  const [filename, setFilename] = useState(initial?.filename ?? DEFAULT_FILENAME);
  const [autosaveOk, setAutosaveOk] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  // Autosave the working copy shortly after each change.
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setAutosaveOk(memory === null ? writeWorkingCopy(null) : writeWorkingCopy({ memory, dirty, filename }));
    }, 300);
    return () => window.clearTimeout(timer.current);
  }, [memory, dirty, filename]);

  // Flush immediately if the tab is being hidden or closed.
  useEffect(() => {
    const flush = () => {
      if (memory) writeWorkingCopy({ memory, dirty, filename });
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [memory, dirty, filename]);

  const update = useCallback((fn: (m: MemoryFile) => MemoryFile) => {
    setMemory((m) => (m ? { ...fn(m), updated_at: now() } : m));
    setDirty(true);
  }, []);

  const startNew = useCallback(() => {
    setMemory(emptyMemory());
    setFilename(DEFAULT_FILENAME);
    setDirty(true);
  }, []);

  const open = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) throw new MemoryFileError("That file is too big to be a memory file (over 10 MB).");
    const text = await file.text();
    const parsed = parseMemoryFile(text);
    setMemory(parsed);
    setFilename(file.name.toLowerCase().endsWith(".json") ? file.name : DEFAULT_FILENAME);
    setDirty(false);
  }, []);

  const download = useCallback(() => {
    if (!memory) return;
    const blob = new Blob([serialize(memory)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setDirty(false);
  }, [memory, filename]);

  const clear = useCallback(() => {
    setMemory(null);
    setDirty(false);
    setFilename(DEFAULT_FILENAME);
    writeWorkingCopy(null);
  }, []);

  const value = useMemo<Store>(
    () => ({ memory, dirty, autosaveOk, filename, update, startNew, open, download, clear }),
    [memory, dirty, autosaveOk, filename, update, startNew, open, download, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside <MemoryProvider>");
  return s;
}

/** For screens that only make sense with a file open. */
export function useMemoryFile(): Store & { memory: MemoryFile } {
  const s = useStore();
  if (!s.memory) throw new Error("No memory file open");
  return s as Store & { memory: MemoryFile };
}
