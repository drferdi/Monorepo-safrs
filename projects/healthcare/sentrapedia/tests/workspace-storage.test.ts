// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { useReducer } from "react";
import { workspaceStorageKeys, clearUnreadableStorage } from "../src/lib/workspace-storage";
import { restoreFromStorage } from "../src/lib/workspace-session";
import { initialWorkspace, storageKey, unreadableKey, workspaceReducer } from "../src/lib/workspace";
import { useWorkspacePersistence } from "../src/components/workspace-hooks";

afterEach(() => { cleanup(); localStorage.clear(); });
const notify = () => undefined;
describe("principal-owned persistence", () => {
  it("rejects non-principals rather than falling back to the legacy key", () => {
    for (const id of ["", "../user_a", "user_a/b", "someone@example.test"]) expect(() => workspaceStorageKeys(id)).toThrow();
    expect(workspaceStorageKeys("user_a")).not.toEqual(workspaceStorageKeys("user_b"));
  });
  it("restores only the principal and never auto-loads legacy records", () => {
    localStorage.setItem(storageKey, JSON.stringify({ ...initialWorkspace, settings: { ...initialWorkspace.settings, name: "Legacy" } }));
    const a = workspaceStorageKeys("user_a"), b = workspaceStorageKeys("user_b");
    localStorage.setItem(b.storageKey, JSON.stringify({ ...initialWorkspace, settings: { ...initialWorkspace.settings, name: "Private B" } }));
    expect(restoreFromStorage(localStorage, a).workspace.settings.name).not.toBe("Private B");
    expect(restoreFromStorage(localStorage, a).workspace.settings.name).not.toBe("Legacy");
    expect(restoreFromStorage(localStorage, b).workspace.settings.name).toBe("Private B");
    expect(localStorage.getItem(storageKey)).toContain("Legacy");
  });
  it("backs up broken A under A and clears only A's backup", () => {
    const a = workspaceStorageKeys("user_a"), b = workspaceStorageKeys("user_b");
    localStorage.setItem(a.storageKey, "broken A"); localStorage.setItem(b.unreadableKey, "broken B"); localStorage.setItem(unreadableKey, "legacy");
    expect(restoreFromStorage(localStorage, a).unreadable).toBe("broken A");
    expect(localStorage.getItem(a.unreadableKey)).toBe("broken A");
    clearUnreadableStorage(localStorage, a);
    expect(localStorage.getItem(a.unreadableKey)).toBeNull();
    expect(localStorage.getItem(a.storageKey)).toBe("broken A");
    expect(localStorage.getItem(b.unreadableKey)).toBe("broken B");
    expect(localStorage.getItem(unreadableKey)).toBe("legacy");
  });
  it("does not overwrite unreadable input with seed data during hydration", async () => {
    const keys = workspaceStorageKeys("user_a"); localStorage.setItem(keys.storageKey, "broken A");
    const hook = renderHook(() => { const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace); return useWorkspacePersistence(state, dispatch, notify, keys); });
    await waitFor(() => expect(hook.result.current.restoring).toBe(false));
    expect(localStorage.getItem(keys.storageKey)).toBe("broken A");
    expect(hook.result.current.unreadable).toBe("broken A");
  });
});
