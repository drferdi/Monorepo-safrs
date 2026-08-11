/** Shared SAFRS task ownership helpers (Node). Mirror of check_task_ownership.py rules. */
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

export const MUTATION_ACTIVE = new Set([
  "CLAIMED",
  "PLANNED",
  "EXECUTING",
  "VERIFYING",
  "REVIEW",
  "BLOCKED",
  "CONFLICT",
]);

export const TERMINAL = new Set([
  "MERGED",
  "CLOSED",
  "ABORTED",
  "SUPERSEDED",
  "FAILED",
]);

export const ALL_STATES = new Set([
  "PROPOSED",
  "CLAIMED",
  "PLANNED",
  "EXECUTING",
  "VERIFYING",
  "REVIEW",
  "MERGED",
  "CLOSED",
  "BLOCKED",
  "CONFLICT",
  "FAILED",
  "ABORTED",
  "SUPERSEDED",
]);

export const RISKS = new Set(["R0", "R1", "R2", "R3"]);

export const TRANSITIONS = {
  CLAIMED: ["PLANNED", "EXECUTING", "BLOCKED", "ABORTED", "SUPERSEDED"],
  PLANNED: ["EXECUTING", "BLOCKED", "ABORTED", "SUPERSEDED"],
  EXECUTING: [
    "VERIFYING",
    "BLOCKED",
    "CONFLICT",
    "FAILED",
    "ABORTED",
    "SUPERSEDED",
  ],
  VERIFYING: [
    "REVIEW",
    "EXECUTING",
    "FAILED",
    "BLOCKED",
    "ABORTED",
    "SUPERSEDED",
  ],
  REVIEW: ["MERGED", "EXECUTING", "BLOCKED", "ABORTED", "SUPERSEDED"],
  BLOCKED: ["CLAIMED", "PLANNED", "EXECUTING", "ABORTED", "SUPERSEDED"],
  CONFLICT: ["EXECUTING", "ABORTED", "SUPERSEDED"],
  FAILED: ["EXECUTING", "ABORTED", "SUPERSEDED"],
  MERGED: ["CLOSED"],
  PROPOSED: ["CLAIMED", "ABORTED", "SUPERSEDED"],
  CLOSED: [],
  ABORTED: [],
  SUPERSEDED: [],
};

const ISO_Z_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;
const WILDCARD_RE = /[*?[\]!]/u;
const SECRET_NAME_RE = /(?:TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL|AUTH)/iu;
const SECRET_ASSIGNMENT_RE =
  /\b[A-Z0-9_]*(?:PASSWORD|TOKEN|KEY|SECRET|CREDENTIAL|AUTH)[A-Z0-9_]*=\S+/iu;
const CREDENTIAL_URL_RE = /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@[^\s]+/iu;
const CREDENTIAL_LITERAL_RE =
  /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|(?:sk|rk|pk)-(?:live|test)-[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16})\b/iu;
const CREDENTIAL_PATH_RE =
  /(?:^|\/)(?:\.env(?:\..+)?|.*credentials.*|.*\.pem|.*\.p12|.*\.pfx|id_ed25519.*)$/iu;

export function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/u, "Z");
}

export function emptyRegistry() {
  return { version: 1, tasks: [] };
}

export function normalizePrefix(raw, context = "scope", repositoryRoot = null) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`${context}: scope prefix must be a non-empty string`);
  }
  let value = raw.trim().replaceAll("\\", "/");
  const directoryScope = value.endsWith("/");
  while (value.includes("//")) {
    value = value.replaceAll("//", "/");
  }
  if (
    value.startsWith("/") ||
    /^[A-Za-z]:\//u.test(value) ||
    value.startsWith("//")
  ) {
    throw new Error(`${context}: absolute paths are forbidden (${raw})`);
  }
  if (value.split("/").includes("..")) {
    throw new Error(`${context}: ".." segments are forbidden (${raw})`);
  }
  if (WILDCARD_RE.test(value)) {
    throw new Error(
      `${context}: wildcards and negative patterns are forbidden (${raw})`,
    );
  }
  if (value === "" || value === ".") {
    throw new Error(`${context}: empty or "." scope is forbidden`);
  }
  const parts = value.split("/").filter((part) => part && part !== ".");
  value = `${parts.join("/")}${directoryScope ? "/" : ""}`;
  if (repositoryRoot) {
    const target = resolve(repositoryRoot, value);
    if (existsSync(target)) {
      const isDirectory = statSync(target).isDirectory();
      if (isDirectory && !directoryScope) {
        throw new Error(
          `${context}: existing directory scopes must end with "/"`,
        );
      }
      if (!isDirectory && directoryScope) {
        throw new Error(`${context}: file scopes must not end with "/"`);
      }
    }
  }
  return value;
}

export function prefixesOverlap(left, right) {
  left = left.toLocaleLowerCase("en-US");
  right = right.toLocaleLowerCase("en-US");
  if (left === right) {
    return true;
  }
  if (left.endsWith("/") && right.startsWith(left)) {
    return true;
  }
  if (right.endsWith("/") && left.startsWith(right)) {
    return true;
  }
  return false;
}

export function findOverlapConflicts(tasks) {
  const active = tasks.filter((task) => MUTATION_ACTIVE.has(task.state));
  const conflicts = [];
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const left = active[i];
      const right = active[j];
      for (const leftScope of left.scope_prefixes) {
        for (const rightScope of right.scope_prefixes) {
          if (prefixesOverlap(leftScope, rightScope)) {
            conflicts.push({
              left_id: left.id,
              right_id: right.id,
              left_scope: leftScope,
              right_scope: rightScope,
            });
          }
        }
      }
    }
  }
  return conflicts;
}

export function parseIso(value) {
  if (typeof value !== "string" || !ISO_Z_RE.test(value)) {
    throw new Error(`timestamp must be valid ISO-8601 UTC: ${value}`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`timestamp must be valid ISO-8601 UTC: ${value}`);
  }
  return parsed;
}

function assertNoSecretAssignment(value, context) {
  if (
    typeof value === "string" &&
    (SECRET_ASSIGNMENT_RE.test(value) ||
      CREDENTIAL_URL_RE.test(value) ||
      CREDENTIAL_LITERAL_RE.test(value))
  ) {
    throw new Error(`${context}: secret-like value is forbidden`);
  }
}

export function validateTaskShape(
  task,
  { requireNotesLimit = true, repositoryRoot = null } = {},
) {
  if (!task || typeof task !== "object") {
    throw new Error("task must be an object");
  }
  if (typeof task.id !== "string" || !task.id.trim()) {
    throw new Error("id must be a non-empty string");
  }
  assertNoSecretAssignment(task.id, "id");
  if (typeof task.title !== "string" || !task.title.trim()) {
    throw new Error(`${task.id}: title must be non-empty`);
  }
  if (task.title.length > 200) {
    throw new Error(`${task.id}: title exceeds 200 characters`);
  }
  assertNoSecretAssignment(task.title, `${task.id}: title`);
  if (!ALL_STATES.has(task.state)) {
    throw new Error(`${task.id}: invalid state ${task.state}`);
  }
  if (!RISKS.has(task.risk)) {
    throw new Error(`${task.id}: invalid risk ${task.risk}`);
  }
  if (task.risk === "R0" && MUTATION_ACTIVE.has(task.state)) {
    throw new Error(`${task.id}: R0 tasks cannot be mutation-active`);
  }
  if (!Array.isArray(task.scope_prefixes) || task.scope_prefixes.length === 0) {
    throw new Error(`${task.id}: scope_prefixes must be a non-empty array`);
  }
  task.scope_prefixes = task.scope_prefixes.map((scope, index) =>
    normalizePrefix(
      scope,
      `${task.id} scope_prefixes[${index}]`,
      repositoryRoot,
    ),
  );
  if (
    !Array.isArray(task.allowed_tools) ||
    task.allowed_tools.some((item) => typeof item !== "string")
  ) {
    throw new Error(`${task.id}: allowed_tools must be an array of strings`);
  }
  for (const tool of task.allowed_tools) {
    assertNoSecretAssignment(tool, `${task.id}: allowed_tools`);
  }
  if (typeof task.owner_id !== "string" || !task.owner_id.trim()) {
    throw new Error(`${task.id}: owner_id must be non-empty`);
  }
  if (typeof task.owner_label !== "string" || !task.owner_label.trim()) {
    throw new Error(`${task.id}: owner_label must be non-empty`);
  }
  assertNoSecretAssignment(task.owner_id, `${task.id}: owner_id`);
  assertNoSecretAssignment(task.owner_label, `${task.id}: owner_label`);
  if (typeof task.worktree_id !== "string" || !task.worktree_id.trim()) {
    throw new Error(`${task.id}: worktree_id must be non-empty`);
  }
  const worktreeParts = task.worktree_id.replaceAll("\\", "/").split("/");
  if (
    task.worktree_id.startsWith("/") ||
    /^[A-Za-z]:\//u.test(task.worktree_id) ||
    worktreeParts.some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(
      `${task.id}: worktree_id must be a safe Git-common-relative id`,
    );
  }
  for (const field of ["claimed_at", "updated_at"]) {
    try {
      parseIso(task[field]);
    } catch {
      throw new Error(`${task.id}: ${field} must be valid ISO-8601 UTC`);
    }
  }
  if (parseIso(task.updated_at) < parseIso(task.claimed_at)) {
    throw new Error(`${task.id}: updated_at must be >= claimed_at`);
  }
  if (task.expires_at != null) {
    try {
      parseIso(task.expires_at);
    } catch {
      throw new Error(
        `${task.id}: expires_at must be valid ISO-8601 UTC or null`,
      );
    }
  }
  if (task.notes != null) {
    if (typeof task.notes !== "string") {
      throw new Error(`${task.id}: notes must be a string`);
    }
    if (requireNotesLimit && task.notes.length > 500) {
      throw new Error(`${task.id}: notes exceeds 500 characters`);
    }
    assertNoSecretAssignment(task.notes, `${task.id}: notes`);
  }
  return task;
}

export function validateRegistry(
  data,
  { now = new Date(), repositoryRoot = null, enforceOperational = true } = {},
) {
  if (!data || typeof data !== "object") {
    throw new Error("registry root must be an object");
  }
  if (data.version !== 1) {
    throw new Error("version must be 1");
  }
  if (!Array.isArray(data.tasks)) {
    throw new Error("tasks must be an array");
  }
  const seen = new Set();
  for (const task of data.tasks) {
    validateTaskShape(task, { repositoryRoot });
    if (seen.has(task.id)) {
      throw new Error(`duplicate task id ${task.id}`);
    }
    seen.add(task.id);
  }
  if (enforceOperational) {
    for (const task of data.tasks) {
      if (
        MUTATION_ACTIVE.has(task.state) &&
        task.expires_at &&
        parseIso(task.expires_at) < now
      ) {
        throw new Error(
          `task ${task.id}: mutation-active task expired at ${task.expires_at}`,
        );
      }
    }
    const conflicts = findOverlapConflicts(data.tasks);
    if (conflicts.length > 0) {
      const first = conflicts[0];
      throw new Error(
        `mutation-active overlap between ${first.left_id} (${first.left_scope}) and ${first.right_id} (${first.right_scope})`,
      );
    }
  }
  return data;
}

export function canTransition(from, to) {
  const allowed = TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

export function closeTargetState(current) {
  if (current === "MERGED") {
    return "CLOSED";
  }
  if (
    MUTATION_ACTIVE.has(current) ||
    current === "FAILED" ||
    current === "PROPOSED"
  ) {
    return "ABORTED";
  }
  throw new Error(`cannot close task in state ${current}`);
}

export function redactText(value) {
  let text = String(value ?? "");
  text = text.replace(
    /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@[^\s]+/giu,
    "[URL_REDACTED]",
  );
  text = text.replace(
    /\b([A-Z0-9_]*(?:PASSWORD|TOKEN|KEY|SECRET|CREDENTIAL|AUTH)[A-Z0-9_]*)=([^\s]+)/giu,
    "$1=[REDACTED]",
  );
  text = text.replace(
    /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|(?:sk|rk|pk)-(?:live|test)-[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16})\b/giu,
    "[CREDENTIAL_REDACTED]",
  );
  return text;
}

export function redactNotes(notes) {
  if (notes == null) {
    return notes;
  }
  if (SECRET_NAME_RE.test(notes) || /=[^\s]+/u.test(notes)) {
    const redacted = redactText(notes);
    if (redacted !== notes || SECRET_NAME_RE.test(notes)) {
      return "[redacted]";
    }
  }
  return redactText(notes);
}

export function redactPath(pathValue) {
  const normalized = String(pathValue ?? "").replaceAll("\\", "/");
  if (CREDENTIAL_PATH_RE.test(normalized)) {
    return "[redacted-path]";
  }
  return normalized;
}

export function sanitizePublicValue(value, key = "") {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePublicValue(item, key));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        sanitizePublicValue(childValue, childKey),
      ]),
    );
  }
  if (typeof value !== "string") {
    return value;
  }
  if (key === "scope_prefixes" || key === "worktree_id") {
    return redactText(redactPath(value));
  }
  return redactText(value);
}

export function publicTask(task) {
  return sanitizePublicValue({ ...task, notes: redactNotes(task.notes) });
}
