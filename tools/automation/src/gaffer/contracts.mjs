import { TaskState, WorkerClass } from "./constants.mjs";

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
}

function assertStringArray(value, name, { allowEmpty = true } = {}) {
  if (
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    value.some((x) => typeof x !== "string" || x.trim() === "")
  ) {
    throw new TypeError(
      `${name} must be ${allowEmpty ? "an" : "a non-empty"} array of non-empty strings`,
    );
  }
}

export function validateTaskContract(task) {
  if (!task || typeof task !== "object")
    throw new TypeError("task must be an object");
  assertNonEmptyString(task.id, "task.id");
  assertNonEmptyString(task.objective, "task.objective");
  assertStringArray(task.acceptance ?? [], "task.acceptance");
  assertStringArray(task.ownedPaths ?? [], "task.ownedPaths");
  assertStringArray(task.dependencies ?? [], "task.dependencies");
  assertStringArray(task.verification ?? [], "task.verification");

  if (
    task.workerClass &&
    !Object.values(WorkerClass).includes(task.workerClass)
  ) {
    throw new TypeError(`task.workerClass is invalid: ${task.workerClass}`);
  }
  if (task.state && !Object.values(TaskState).includes(task.state)) {
    throw new TypeError(`task.state is invalid: ${task.state}`);
  }
  return task;
}

export function normalizeTaskContract(task) {
  validateTaskContract(task);
  return Object.freeze({
    id: task.id,
    objective: task.objective,
    acceptance: [...(task.acceptance ?? [])],
    ownedPaths: [...(task.ownedPaths ?? [])],
    interfaces: [...(task.interfaces ?? [])],
    constraints: [...(task.constraints ?? [])],
    verification: [...(task.verification ?? [])],
    context: [...(task.context ?? [])],
    dependencies: [...(task.dependencies ?? [])],
    risk: task.risk ?? "normal",
    workerClass: task.workerClass ?? null,
    state: task.state ?? TaskState.PENDING,
    metadata: { ...(task.metadata ?? {}) },
  });
}

export function validateWorkerResult(result) {
  if (!result || typeof result !== "object")
    throw new TypeError("worker result must be an object");
  if (!["complete", "partial", "blocked", "failed"].includes(result.status)) {
    throw new TypeError(`Invalid worker result status: ${result.status}`);
  }
  assertStringArray(result.changedFiles ?? [], "result.changedFiles");
  return result;
}
