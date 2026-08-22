import type { AgentRecord } from "./control-center.ts";

export type AgentRow = AgentRecord & {
  /** True when the May column came from .safrs/policy.json, not from prose. */
  fromPolicy: boolean;
};

/**
 * Join the catalog prose with the live policy. The policy owns the May column
 * for roles it records; everything else keeps the catalog text, marked so the
 * reader can tell an observed authority from a described one.
 */
export function mergeAgentRows(
  catalog: AgentRecord[],
  roles: Record<string, string[]>,
): AgentRow[] {
  return catalog.map((agent) => {
    const capabilities = agent.kind === "role" ? roles[agent.id] : undefined;
    if (capabilities && capabilities.length > 0) {
      return { ...agent, may: capabilities.join(", "), fromPolicy: true };
    }
    return { ...agent, fromPolicy: false };
  });
}
