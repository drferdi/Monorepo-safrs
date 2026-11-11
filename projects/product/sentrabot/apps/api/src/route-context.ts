import type { AdapterContext } from "@sentrabot/adapter-kit";
import type { Actor } from "@sentrabot/contracts";

/** Adapter context for a computer-scoped operation started by an authenticated actor. */
export function computerContext(actor: Actor, botId: string, operationId: string): AdapterContext {
  return {
    operationId,
    traceId: operationId,
    workspaceId: actor.workspaceId,
    userId: actor.userId,
    botId,
    signal: new AbortController().signal,
  };
}
