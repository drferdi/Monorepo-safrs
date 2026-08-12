import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { canonicalize, digestCanonical } from "../src/canonical-json.mjs";

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

test("object keys sort lexicographically at every depth, array order is preserved", () => {
  const value = {
    zulu: { b: 1, a: 2 },
    alpha: [3, 1, 2],
    mike: [{ y: true, x: false }],
  };
  assert.equal(
    canonicalize(value),
    '{"alpha":[3,1,2],"mike":[{"x":false,"y":true}],"zulu":{"a":2,"b":1}}',
  );
});

test("canonical form contains no insignificant whitespace and no trailing newline", () => {
  const canonical = canonicalize({ a: [1, { b: "c d" }] });
  assert.equal(canonical, '{"a":[1,{"b":"c d"}]}');
  assert.doesNotMatch(canonical, /\n/u);
});

test("digest is lowercase sha-256 hex of the canonical UTF-8 text", () => {
  const value = { b: "nilai", a: ["x", "ü", "日本"] };
  const canonical = canonicalize(value);
  const digest = digestCanonical(value);
  assert.equal(digest, sha256(canonical));
  assert.match(digest, /^[0-9a-f]{64}$/u);
});

test("digest is independent of input key order", () => {
  assert.equal(
    digestCanonical({ a: 1, b: { d: 4, c: 3 } }),
    digestCanonical({ b: { c: 3, d: 4 }, a: 1 }),
  );
});

test("known vector pins cross-platform stability", () => {
  // Byte-for-byte expectation; any serializer drift on any OS breaks this.
  const canonical = canonicalize({
    task_id: "TASK-20260813-EXAMPLE",
    schema_version: 1,
    scopes: ["a/", "b.txt"],
  });
  assert.equal(
    canonical,
    '{"schema_version":1,"scopes":["a/","b.txt"],"task_id":"TASK-20260813-EXAMPLE"}',
  );
  assert.equal(
    digestCanonical({ schema_version: 1 }),
    sha256('{"schema_version":1}'),
  );
});

test("non-JSON values fail closed", () => {
  for (const bad of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    undefined,
    () => {},
    Symbol("x"),
    10n,
  ]) {
    assert.throws(() => canonicalize(bad), /canonical/iu);
    assert.throws(() => canonicalize({ key: bad }), /canonical/iu);
  }
});

test("circular references fail closed instead of recursing forever", () => {
  const value = { a: 1 };
  value.self = value;
  assert.throws(() => canonicalize(value), /circular/iu);
});

test("prototype pollution keys are treated as plain data", () => {
  const value = JSON.parse('{"__proto__": {"x": 1}, "a": 2}');
  assert.equal(canonicalize(value), '{"__proto__":{"x":1},"a":2}');
});
