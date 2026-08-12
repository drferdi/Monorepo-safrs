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

test("timestamp pattern rejects impossible calendar and clock values", () => {
  const schema = context.schemas["task-contract"];
  const valid = compileTaskContract(loadInput("valid-r1"), context).contract;
  for (const bad of [
    "2026-99-99T99:99:99Z",
    "2026-13-01T00:00:00Z",
    "2026-01-32T00:00:00Z",
    "2026-01-01T24:00:00Z",
    "2026-01-01T00:60:00Z",
  ]) {
    const mutated = { ...valid, created_at: bad };
    assert.equal(
      validateAgainstSchema(schema, mutated).errors.length > 0,
      true,
      bad,
    );
  }
});

test("approval-record schema binds required fields per kind", () => {
  const schema = context.schemas["approval-record"];
  const base = {
    schema_version: 1,
    approval_id: "APR-1",
    kind: "R2_CODE_OWNER",
    task_id: "TASK-20260813-DEMO-R2",
    contract_digest: "a".repeat(64),
    subject_sha: "b".repeat(40),
    diff_digest: "c".repeat(64),
    operation_digest: null,
    target_environment: null,
    idempotency_key: null,
    reviewer_identity: "chief",
    reviewer_authority: "code-owner",
    author_identity: "agent",
    issued_at: "2026-08-13T00:00:00Z",
    expires_at: "2026-08-14T00:00:00Z",
    source_event_url: "https://github.com/x",
    source_event_id: "ev-1",
    revoked_at: null,
    approval_digest: "d".repeat(64),
  };
  assert.deepEqual(validateAgainstSchema(schema, base).errors, []);

  const r2NullDiff = { ...base, diff_digest: null };
  assert.equal(
    validateAgainstSchema(schema, r2NullDiff).errors.length > 0,
    true,
  );

  const r3 = {
    ...base,
    kind: "R3_EXECUTION",
    operation_digest: "e".repeat(64),
    target_environment: "simulation",
    idempotency_key: "idem-1",
  };
  assert.deepEqual(validateAgainstSchema(schema, r3).errors, []);

  for (const strip of [
    "operation_digest",
    "target_environment",
    "idempotency_key",
  ]) {
    const broken = { ...r3, [strip]: null };
    assert.equal(
      validateAgainstSchema(schema, broken).errors.length > 0,
      true,
      strip,
    );
  }
});

test("run-contract schema requires evidence when state is COMPLETED", () => {
  const schema = context.schemas["run-contract"];
  const base = {
    schema_version: 1,
    run_id: "RUN-1",
    task_id: "TASK-20260813-DEMO-R1",
    contract_digest: "a".repeat(64),
    attempt_id: 1,
    provider: "test",
    adapter_version: "1",
    actor_identity: "agent",
    base_sha: "b".repeat(40),
    head_sha: null,
    branch: "safrs/x",
    worktree_id: "worktrees/x",
    lease_id: "L-1",
    fencing_token: 1,
    runner_class: "disposable-ci",
    started_at: "2026-08-13T00:00:00Z",
    deadline_at: "2026-08-13T01:00:00Z",
    budget_snapshot: {},
    grants_digest: "c".repeat(64),
    heartbeat_at: "2026-08-13T00:30:00Z",
    state: "EXECUTING",
    stop_reason: null,
    evidence_uri: null,
    evidence_digest: null,
  };
  assert.deepEqual(validateAgainstSchema(schema, base).errors, []);

  const completedNoEvidence = { ...base, state: "COMPLETED" };
  assert.equal(
    validateAgainstSchema(schema, completedNoEvidence).errors.length > 0,
    true,
  );

  const completedWithEvidence = {
    ...base,
    state: "COMPLETED",
    evidence_uri: "evidence/manifest.json",
    evidence_digest: "d".repeat(64),
  };
  assert.deepEqual(
    validateAgainstSchema(schema, completedWithEvidence).errors,
    [],
  );
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
