import { TaskState } from "./constants.mjs";

const allowedTransitions = new Map([
  [
    TaskState.PENDING,
    new Set([TaskState.READY, TaskState.BLOCKED, TaskState.CANCELLED]),
  ],
  [
    TaskState.READY,
    new Set([TaskState.RUNNING, TaskState.BLOCKED, TaskState.CANCELLED]),
  ],
  [
    TaskState.RUNNING,
    new Set([
      TaskState.VERIFYING,
      TaskState.FAILED,
      TaskState.BLOCKED,
      TaskState.CANCELLED,
    ]),
  ],
  [
    TaskState.VERIFYING,
    new Set([TaskState.VERIFIED, TaskState.FAILED, TaskState.BLOCKED]),
  ],
  [TaskState.VERIFIED, new Set()],
  [
    TaskState.FAILED,
    new Set([TaskState.READY, TaskState.BLOCKED, TaskState.CANCELLED]),
  ],
  [TaskState.BLOCKED, new Set([TaskState.READY, TaskState.CANCELLED])],
  [TaskState.CANCELLED, new Set()],
]);

export function assertTaskState(value) {
  if (!Object.values(TaskState).includes(value)) {
    throw new Error(`Unknown task state: ${value}`);
  }
}

export function canTransition(from, to) {
  assertTaskState(from);
  assertTaskState(to);
  return allowedTransitions.get(from).has(to);
}

export function transitionTask(task, to, metadata = {}) {
  if (!task || typeof task !== "object")
    throw new TypeError("task must be an object");
  const from = task.state;
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid Gaffer task transition: ${from} -> ${to} for ${task.id ?? "<unknown>"}`,
    );
  }
  return {
    ...task,
    state: to,
    stateMetadata: { ...(task.stateMetadata ?? {}), ...metadata },
  };
}
