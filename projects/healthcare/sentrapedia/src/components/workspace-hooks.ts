"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type Dispatch } from "react";
import { storageKey, type Workspace, type WorkspaceAction } from "../lib/workspace";
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
export function useWorkspacePersistence(state: Workspace, dispatch: Dispatch<WorkspaceAction>, notify: (text: string, tone?: "error") => void) {
  const [storageError, setStorageError] = useState("");
  // Saved text that failed validation at load; kept (memory and unreadableKey) so it can be downloaded instead of lost.
  const [unreadable, setUnreadable] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  const hydrated = useRef(false);
  useEffect(() => { try { const restored = restoreFromStorage(localStorage); const notice = restored.notice; if (notice) queueMicrotask(() => notify(notice, "error")); queueMicrotask(() => setUnreadable(restored.unreadable)); dispatch({ type: "restore", state: restored.workspace }); } catch { queueMicrotask(() => notify("Penyimpanan browser tidak tersedia. Perubahan hanya bertahan selama sesi ini.", "error")); } finally { queueMicrotask(() => setRestoring(false)); } }, [notify, dispatch]);
  useEffect(() => { if (!hydrated.current) { hydrated.current = true; return; } const error = saveLocalWorkspace(state, (raw) => localStorage.setItem(storageKey, raw)); queueMicrotask(() => setStorageError(error ?? "")); }, [state]);
  return { storageError, unreadable, setUnreadable, restoring };
}
