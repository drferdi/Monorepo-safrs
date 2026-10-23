"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type Dispatch } from "react";
import { type Workspace, type WorkspaceAction } from "../lib/workspace";
import type { WorkspaceStorageKeys } from "../lib/workspace-storage";
import { restoreFromStorage } from "../lib/workspace-session";
import { saveLocalWorkspace } from "../lib/workflow";
import { smooth } from "./smooth";

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((callback: () => void) => { const media = window.matchMedia(query); media.addEventListener("change", callback); return () => media.removeEventListener("change", callback); }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export function useToast() {
  const [toast, setToast] = useState("");
  const [toastError, setToastError] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((text: string, tone?: "error") => { if (toastTimer.current) clearTimeout(toastTimer.current); setToast(text); setToastError(tone === "error"); toastTimer.current = setTimeout(() => smooth(() => setToast("")), 4500); }, []);
  const dismiss = useCallback(() => { if (toastTimer.current) clearTimeout(toastTimer.current); smooth(() => setToast("")); }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  return { toast, toastError, notify, dismiss };
}

// Restore and save stay in one hook so the restore effect always runs before the first save.
export function useWorkspacePersistence(state: Workspace, dispatch: Dispatch<WorkspaceAction>, notify: (text: string, tone?: "error") => void, keys: WorkspaceStorageKeys) {
  const [storageError, setStorageError] = useState("");
  // Saved text that failed validation at load; kept (memory and unreadableKey) so it can be downloaded instead of lost.
  const [unreadable, setUnreadable] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  const writable = useRef(false);
  const { storageKey, unreadableKey } = keys;
  useEffect(() => {
    let mounted = true;
    writable.current = false;
    try {
      const restored = restoreFromStorage(localStorage, { storageKey, unreadableKey });
      writable.current = restored.notice === null;
      dispatch({ type: "restore", state: restored.workspace });
      queueMicrotask(() => { if (!mounted) return; setUnreadable(restored.unreadable); if (restored.notice) notify(restored.notice, "error"); setRestoring(false); });
    } catch { queueMicrotask(() => { if (!mounted) return; notify("Penyimpanan browser tidak tersedia. Perubahan hanya bertahan selama sesi ini.", "error"); setRestoring(false); }); }
    return () => { mounted = false; writable.current = false; };
  }, [notify, dispatch, storageKey, unreadableKey]);
  useEffect(() => {
    if (restoring || !writable.current) return;
    const error = saveLocalWorkspace(state, raw => localStorage.setItem(storageKey, raw));
    queueMicrotask(() => setStorageError(error ?? ""));
  }, [state, restoring, storageKey]);
  const allowSave = () => { writable.current = true; };
  return { storageError, unreadable, setUnreadable, restoring, allowSave };
}
