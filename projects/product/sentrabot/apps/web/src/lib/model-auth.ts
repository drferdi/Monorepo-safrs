import type { ModelCatalogEntry } from "@sentrabot/contracts";
import { waitForModelOAuthCompletion } from "@sentrabot/core";
import { rpc } from "./rpc";

export type { ModelCatalogEntry, ModelCredential, ModelOAuthBegin } from "@sentrabot/contracts";
export { cancelModelOAuthAttempt, finishModelOAuthAttempt } from "@sentrabot/core";

/** English fallback auth hint for a catalog entry (localize at the UI call site). */
export function providerHint(entry: ModelCatalogEntry) {
  if (entry.authHint) return entry.authHint;
  if (entry.signIn !== undefined) return "Sign in";
  if (entry.auth === "oauth") return "Skip or deploy key";
  return "API key";
}

export async function waitForModelOAuth(loginId: string, signal?: AbortSignal) {
  return waitForModelOAuthCompletion(() => rpc.models.completeOAuth({ loginId }, { signal }), {
    signal,
  });
}
