import { validUserId } from "./auth/policy";

export type WorkspaceStorageKeys = { storageKey: string; unreadableKey: string };
export function workspaceStorageKeys(userId: string): WorkspaceStorageKeys {
  if (!validUserId(userId) && userId !== "local-development") throw new Error("Invalid workspace principal");
  const storageKey = `sentrapedia-workspace-v2:${userId}`;
  return { storageKey, unreadableKey: `${storageKey}:unreadable` };
}
export function clearUnreadableStorage(storage: Pick<Storage, "removeItem">, keys: WorkspaceStorageKeys) {
  storage.removeItem(keys.unreadableKey);
}
