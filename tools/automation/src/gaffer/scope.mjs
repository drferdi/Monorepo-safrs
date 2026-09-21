import path from "node:path";

function normalize(p) {
  return path.posix
    .normalize(String(p).replaceAll("\\", "/"))
    .replace(/^\.\//, "");
}

export function assertChangedFilesWithinScope(changedFiles, ownedPaths) {
  const allowed = ownedPaths.map(normalize);
  const violations = changedFiles.map(normalize).filter((changed) => {
    return !allowed.some(
      (owned) =>
        changed === owned || changed.startsWith(`${owned.replace(/\/$/, "")}/`),
    );
  });
  if (violations.length) {
    const error = new Error(`Scope violation: ${violations.join(", ")}`);
    error.code = "SCOPE_VIOLATION";
    error.violations = violations;
    throw error;
  }
  return true;
}
