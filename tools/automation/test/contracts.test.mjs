import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

import { digestCanonical } from "../src/canonical-json.mjs";
import {
  compileTaskContract,
  loadCompileContext,
  validateAgainstSchema,
} from "../src/contracts.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const fixturesRoot = join(repositoryRoot, "tests/fixtures/automation");
const context = loadCompileContext(repositoryRoot);

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadInput(name) {
  return loadJson(join(fixturesRoot, "inputs", `${name}.json`));
}

test("every valid fixture compiles, digests, and passes the task-contract schema", () => {
  for (const name of ["valid-r0", "valid-r1", "valid-r2", "valid-r3"]) {
    const { contract, contractDigest } = compileTaskContract(
      loadInput(name),
      context,
    );
    const { contract_digest, ...withoutDigest } = contract;
    assert.equal(contract_digest, contractDigest, name);
    assert.equal(contractDigest, digestCanonical(withoutDigest), name);
    const verdict = validateAgainstSchema(
      context.schemas["task-contract"],
      contract,
    );
    assert.deepEqual(verdict.errors, [], name);
  }
});

test("compilation is deterministic: same input, same digest, key order irrelevant", () => {
  const input = loadInput("valid-r1");
  const first = compileTaskContract(input, context).contractDigest;
  const reordered = Object.fromEntries(Object.entries(input).reverse());
  const second = compileTaskContract(reordered, context).contractDigest;
  assert.equal(first, second);
});

test("computed risk is monotonic per fixture expectations", () => {
  assert.equal(
    compileTaskContract(loadInput("valid-r0"), context).contract.effective_risk,
    "R0",
  );
  assert.equal(
    compileTaskContract(loadInput("valid-r1"), context).contract.effective_risk,
    "R1",
  );
  const r2 = compileTaskContract(loadInput("valid-r2"), context).contract;
  assert.equal(r2.effective_risk, "R2");
  assert.equal(r2.risk_reasons.length > 0, true);
  assert.equal(
    compileTaskContract(loadInput("valid-r3"), context).contract.effective_risk,
    "R3",
  );
});

test("every invalid fixture is rejected with its declared reason", () => {
  const invalidDirectory = join(fixturesRoot, "invalid");
  const fixtures = readdirSync(invalidDirectory).filter((file) =>
    file.endsWith(".json"),
  );
  assert.equal(fixtures.length >= 12, true, "expected the named fixture set");
  for (const file of fixtures) {
    const fixture = loadJson(join(invalidDirectory, file));
    const input = { ...loadInput(fixture.base), ...fixture.patch };
    assert.throws(
      () => compileTaskContract(input, context),
      new RegExp(fixture.expect_error, "iu"),
      file,
    );
  }
});

test("schema validator enforces required, additionalProperties, pattern, enum, anyOf", () => {
  const schema = context.schemas["task-contract"];
  const valid = compileTaskContract(loadInput("valid-r1"), context).contract;

  const missing = { ...valid };
  delete missing.objective;
  assert.equal(
    validateAgainstSchema(schema, missing).errors.some((error) =>
      /objective/u.test(error),
    ),
    true,
  );

  const extra = { ...valid, smuggled: true };
  assert.equal(validateAgainstSchema(schema, extra).errors.length > 0, true);

  const badPattern = { ...valid, base_sha: "not-a-sha" };
  assert.equal(
    validateAgainstSchema(schema, badPattern).errors.length > 0,
    true,
  );

  const badEnum = { ...valid, effective_risk: "R9" };
  assert.equal(validateAgainstSchema(schema, badEnum).errors.length > 0, true);

  const badAnyOf = { ...valid, network: "wide-open" };
  assert.equal(validateAgainstSchema(schema, badAnyOf).errors.length > 0, true);
});

test("all seven schema files load and declare additionalProperties false", () => {
  const names = [
    "task-contract",
    "run-contract",
    "lease-event",
    "approval-record",
    "evidence-manifest",
    "operation-contract",
    "platform-attestation",
  ];
  for (const name of names) {
    const schema = context.schemas[name];
    assert.ok(schema, name);
    assert.equal(schema.additionalProperties, false, name);
    assert.equal(
      schema.$schema,
      "https://json-schema.org/draft/2020-12/schema",
    );
  }
});
