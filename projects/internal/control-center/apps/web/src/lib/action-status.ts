import type { ActionStatus } from "./control-center.ts";
import { RUNNABLE_IDS } from "./exec/commands.ts";

/**
 * One source of truth for whether an action can run from this board: the
 * allowlist. The catalog never asserts availability by hand again.
 */
export function actionStatus(id: string): ActionStatus {
  return RUNNABLE_IDS.has(id) ? "available" : "unavailable";
}
