/**
 * Repository-relative scope handling. Mirrors the semantics enforced by
 * tools/safrs/check_task_ownership.py: POSIX prefixes, trailing "/" marks a
 * directory scope, matching is case-insensitive because Windows filesystems
 * are.
 */

const WILDCARD = /[*?[\]]/u;

export function normalizeScope(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new TypeError("scope must be a non-empty string");
  }
  let value = raw.trim().replaceAll("\\", "/");
  const directoryScope = value.endsWith("/");
  while (value.includes("//")) {
    value = value.replaceAll("//", "/");
  }
  if (value.startsWith("/") || /^[A-Za-z]:/u.test(value)) {
    // Covers absolute, drive-absolute (C:/x), and drive-relative (C:x) forms.
    throw new TypeError(`scope must be repository-relative: ${raw}`);
  }
  if (WILDCARD.test(value) || value.includes("!")) {
    throw new TypeError(
      `scope must not contain wildcards or negations: ${raw}`,
    );
  }
  const parts = value.split("/").filter((part) => part !== "" && part !== ".");
  if (parts.some((part) => part === "..")) {
    throw new TypeError(`scope must not escape the repository: ${raw}`);
  }
  if (parts.length === 0) {
    throw new TypeError("empty or root scope is forbidden");
  }
  return parts.join("/") + (directoryScope ? "/" : "");
}

export function scopesOverlap(left, right) {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  if (a === b) {
    return true;
  }
  if (a.endsWith("/") && b.startsWith(a)) {
    return true;
  }
  if (b.endsWith("/") && a.startsWith(b)) {
    return true;
  }
  return false;
}

/** Returns [{casefolded, variants}] for scopes that differ only by case. */
export function detectCaseCollisions(scopes) {
  const byFold = new Map();
  for (const scope of scopes) {
    const fold = scope.toLowerCase();
    const variants = byFold.get(fold) ?? new Set();
    variants.add(scope);
    byFold.set(fold, variants);
  }
  return [...byFold.entries()]
    .filter(([, variants]) => variants.size > 1)
    .map(([casefolded, variants]) => ({
      casefolded,
      variants: [...variants].sort(),
    }));
}
