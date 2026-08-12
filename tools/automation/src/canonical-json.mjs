import { createHash } from "node:crypto";

/**
 * Canonical JSON per the SAFRS automation plan: UTF-8, lexicographically
 * sorted object keys (code-unit order), preserved array order, no
 * insignificant whitespace, no trailing newline in the in-memory form.
 * Stored files append exactly one trailing newline (see writeForm).
 * Non-JSON values fail closed — a silent coercion would change digests.
 */

function serialize(value, seen) {
  if (value === null) {
    return "null";
  }
  const type = typeof value;
  if (type === "string") {
    return JSON.stringify(value);
  }
  if (type === "boolean") {
    return value ? "true" : "false";
  }
  if (type === "number") {
    // Engines spell floats differently (Python 1.2e-07 vs Node 1.2e-7),
    // which would fork digests — only safe integers are canonical.
    if (!Number.isSafeInteger(value)) {
      throw new TypeError(
        `canonical JSON accepts only safe integers, got: ${String(value)}`,
      );
    }
    return JSON.stringify(value);
  }
  if (type === "object") {
    if (seen.has(value)) {
      throw new TypeError("canonical JSON rejects circular references");
    }
    seen.add(value);
    let result;
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          throw new TypeError("canonical JSON rejects sparse arrays");
        }
      }
      result = `[${value.map((entry) => serialize(entry, seen)).join(",")}]`;
    } else {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        // Date, Map, Set, class instances would silently serialize as "{}"
        // and collide digests; only plain objects carry canonical meaning.
        throw new TypeError("canonical JSON rejects non-plain objects");
      }
      const keys = Object.keys(value).sort();
      result = `{${keys
        .map((key) => `${JSON.stringify(key)}:${serialize(value[key], seen)}`)
        .join(",")}}`;
    }
    seen.delete(value);
    return result;
  }
  throw new TypeError(`canonical JSON rejects value of type ${type}`);
}

export function canonicalize(value) {
  return serialize(value, new Set());
}

export function digestCanonical(value) {
  return createHash("sha256").update(canonicalize(value), "utf8").digest("hex");
}

/** Stored-file form: canonical text plus exactly one trailing newline. */
export function writeForm(value) {
  return `${canonicalize(value)}\n`;
}
