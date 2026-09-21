import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildManifest, finalizeManifest } from '../../src/evidence.mjs';
import { buildLeaseEvent, scopeDigest } from '../../src/leases.mjs';
import { createSafrsPorts } from '../../src/gaffer/safrs-ports.mjs';

const ROOT = process.cwd();
const CAPSULE = 'academic/academic-smartboard';
const NOW = '2026-09-20T15:00:00Z';
const VALID_CONTRACT = {
  accountable_human: 'chief@sentrahai.com',
  approval_policy: {
    R0: 'none',
    R1: 'automatic_gates_only',
    R2: 'independent_or_code_owner',
    R3: 'protected_environment_human',
  },
  base_ref: 'refs/heads/main',
  base_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  budgets: {
    attempts: 2,
    changed_files: 10,
    concurrent_children: 1,
    diff_lines: 500,
    model_calls: 200,
    network_requests: 1,
    retries: 3,
    runtime_minutes: 60,
    spend: 'unmetered',
    tool_calls: 500,
  },
  created_at: '2026-09-20T00:00:00Z',
  data_classification: 'internal',
  declared_risk: 'R1',
  expires_at: '2026-09-21T00:00:00Z',
  isolation_profile: {
    disposable_resources: [],
    egress: 'denied',
    requires_worktree: true,
    runner_class: 'test',
  },
  network: 'denied',
  objective: 'Exercise the Gaffer SAFRS port adapter.',
  operations: ['repo.branch', 'repo.modify_scoped'],
  read_scopes: ['projects/academic/academic-smartboard/'],
  requested_by_evidence: {
    event_id: 'test-event',
    url: 'https://github.com/example/repository/issues/1',
  },
  requester: 'chief@sentrahai.com',
  rollback: {
    cleanup: 'delete-test-branch',
    preservation: 'preserve-test-artifacts',
    revert: 'revert-test-change',
    target_contract_ids: [],
  },
  schema_version: 1,
  task_id: 'TASK-20260920-GAFFER-PORTS-TEST',
  tools: [
    { id: 'git', subcommands: ['branch', 'diff', 'status'] },
    { id: 'local-filesystem', subcommands: [] },
  ],
  verification_profile: [
    'safrs.contract',
    'safrs.lease',
    'safrs.risk',
    'safrs.budgets',
    'safrs.verification',
    'safrs.review',
    'safrs.evidence',
    'safrs.platform',
  ],
  write_scopes: ['tools/automation/src/gaffer/'],
};
const ACCEPT_CONTRACT = {
  ...VALID_CONTRACT,
  read_scopes: ['docs/'],
  write_scopes: ['README.md'],
};

function baseProvider(overrides = {}) {
  return {
    rootPlan: async () => ({ route: 'SOLO' }),
    rootImplement: async () => ({ changedFiles: [] }),
    rootAccept: async () => ({ accepted: true }),
    audit: async () => ({ verdict: 'SHIP' }),
    executeWorker: async () => ({
      status: 'complete',
      changedFiles: ['tools/automation/src/gaffer/example.mjs'],
    }),
    ...overrides,
  };
}

function makePorts(overrides = {}) {
  const controlDirectory = mkdtempSync(
    path.join(os.tmpdir(), 'gaffer-safrs-control-'),
  );
  return createSafrsPorts({
    repositoryRoot: ROOT,
    capsuleSelector: CAPSULE,
    providerPorts: baseProvider(),
    workerRegistry: [
      {
        id: 'codex-economy',
        adapterId: 'codex',
        classes: ['ECONOMY'],
        certified: true,
        expectedCost: 1,
      },
      {
        id: 'droid-strong',
        adapterId: 'droid',
        classes: ['STRONG'],
        certified: true,
        expectedCost: 1,
      },
      {
        id: 'uncertified-strong',
        adapterId: 'claude',
        classes: ['STRONG'],
        certified: false,
        expectedCost: 1,
      },
    ],
    controlDirectory,
    runRepositoryVerification: async () => ({ passed: true }),
    runStandaloneVerification: async () => ({
      passed: true,
      result: { id: CAPSULE },
    }),
    ...overrides,
  });
}

function validEvidence({
  contractDigest = 'c'.repeat(64),
  effectiveRisk = 'R1',
} = {}) {
  return finalizeManifest(
    buildManifest({
      manifest_id: 'MANIFEST-GAFFER-TEST',
      task_id: 'TASK-20260920-GAFFER-PORTS-TEST',
      run_id: 'RUN-GAFFER-TEST',
      contract_digest: contractDigest,
      base_sha: 'a'.repeat(40),
      head_sha: 'b'.repeat(40),
      diff_digest: 'd'.repeat(64),
      effective_risk: effectiveRisk,
      risk_reasons: ['test'],
      created_at: NOW,
    }),
  );
}

function validLease() {
  const scopePrefixes = ['tools/automation/src/gaffer/'];
  return buildLeaseEvent({
    schema_version: 1,
    event_id: 'lease-event-1',
    sequence: 1,
    event_type: 'CLAIM',
    task_id: 'TASK-20260920-GAFFER-PORTS-TEST',
    lease_id: 'LEASE-GAFFER-TEST',
    actor: 'luna',
    worktree_id: 'main',
    scope_prefixes: scopePrefixes,
    scope_digest: scopeDigest(scopePrefixes),
    occurred_at: NOW,
    authority_run_url: null,
    fencing_token: 1,
    previous_state: null,
    next_state: 'CLAIMED',
    expires_at: '2026-09-21T00:00:00Z',
  });
}

test('requires a strict domain/capsule selector and resolves the validated capsule', async () => {
  assert.throws(
    () =>
      createSafrsPorts({
        repositoryRoot: ROOT,
        providerPorts: baseProvider(),
        workerRegistry: [],
      }),
    /capsule selector/i,
  );

  const ports = makePorts();
  const project = await ports.discoverProject({ intent: 'inspect', context: {} });
  assert.equal(project.id, CAPSULE);
  assert.equal(project.contract.id, CAPSULE);

  await assert.rejects(
    () =>
      ports.discoverProject({
        intent: 'inspect',
        context: { projectSelector: 'projects/academic/academic-smartboard' },
      }),
    /domain\/capsule/i,
  );

  await assert.rejects(
    () =>
      ports.discoverProject({
        intent: 'inspect',
        context: { projectSelector: 'internal/golden-path' },
      }),
    (error) => error.code === 'PROJECT_SELECTOR_MISMATCH',
  );
});

test('authorization fails closed without a TaskContractV1 preimage', async () => {
  const ports = makePorts();
  await assert.deepEqual(
    await ports.authorize({ intent: 'change', project: null, context: {} }),
    { allowed: false, reason: 'contract_missing' },
  );
});

test('authorization compiles the contract, runs the guard, and exposes monotonic risk', async () => {
  const ports = makePorts();
  const result = await ports.authorize({
    intent: 'change',
    project: { id: CAPSULE },
    context: {
      taskContract: VALID_CONTRACT,
      guardEvent: {
        type: 'write',
        paths: ['tools/automation/src/gaffer/example.mjs'],
      },
    },
  });

  assert.equal(result.allowed, true);
  assert.equal(result.highRisk, true);
  assert.equal(result.contract.effective_risk, 'R2');
  assert.equal(typeof result.contractDigest, 'string');
});

test('worker listing excludes disabled, uncertified, and Droid adapters', async () => {
  const ports = makePorts();
  const workers = await ports.listAvailableWorkers({
    requestedClass: 'ECONOMY',
    task: {},
    project: { id: CAPSULE },
  });

  assert.deepEqual(workers.map((worker) => worker.id), ['codex-economy']);
});

test('required root and audit callbacks throw when absent', () => {
  for (const missing of ['rootPlan', 'rootImplement', 'rootAccept', 'audit']) {
    const provider = baseProvider();
    delete provider[missing];
    assert.throws(
      () =>
        createSafrsPorts({
          repositoryRoot: ROOT,
          capsuleSelector: CAPSULE,
          providerPorts: provider,
          workerRegistry: [],
        }),
      new RegExp(`'${missing}'`),
    );
  }
});

test('fails closed when the SAFRS control plane cannot be resolved', () => {
  const temporaryRoot = mkdtempSync(
    path.join(os.tmpdir(), 'gaffer-no-control-plane-'),
  );
  assert.throws(
    () =>
      createSafrsPorts({
        repositoryRoot: temporaryRoot,
        capsuleSelector: CAPSULE,
        providerPorts: baseProvider(),
        workerRegistry: [],
        compileContext: {},
      }),
    /control plane/i,
  );
});

test('worker execution requires a valid lease and preserves scope/guard checks', async () => {
  const ports = makePorts();
  const task = {
    id: 'TASK-20260920-GAFFER-PORTS-TEST',
    ownedPaths: ['tools/automation/src/gaffer/'],
    plannedChangedFiles: ['tools/automation/src/gaffer/example.mjs'],
    metadata: { taskContract: VALID_CONTRACT },
  };
  await ports.authorize({ context: { taskContract: VALID_CONTRACT } });
  const context = {
    taskContract: VALID_CONTRACT,
    lease: {
      local: {
        task_id: task.id,
        actor: 'luna',
        worktree_id: 'main',
        fencing_token: 1,
        scope_prefixes: ['tools/automation/src/gaffer/'],
      },
      remoteEvents: [validLease()],
      now: NOW,
    },
  };

  await assert.rejects(
    () =>
      ports.executeWorker({
        worker: { id: 'codex-economy', adapterId: 'codex', classes: ['ECONOMY'], certified: true },
        workerClass: 'ECONOMY',
        task,
        project: { id: CAPSULE },
        context: {},
      }),
    (error) => error.code === 'BLOCKED_REQUIREMENT',
  );

  const result = await ports.executeWorker({
    worker: { id: 'codex-economy', adapterId: 'codex', classes: ['ECONOMY'], certified: true },
    workerClass: 'ECONOMY',
    task,
    project: { id: CAPSULE },
    context,
  });
  assert.equal(result.status, 'complete');

  const outOfScope = makePorts({
    providerPorts: baseProvider({
      executeWorker: async () => ({
        status: 'complete',
        changedFiles: ['README.md'],
      }),
    }),
  });
  await outOfScope.authorize({ context: { taskContract: VALID_CONTRACT } });
  await assert.rejects(
    () =>
      outOfScope.executeWorker({
        worker: { id: 'codex-economy', adapterId: 'codex', classes: ['ECONOMY'], certified: true },
        workerClass: 'ECONOMY',
        task,
        project: { id: CAPSULE },
        context,
      }),
    (error) => error.code === 'SCOPE_VIOLATION',
  );
});

test('worker execution rejects a lease owned by another task', async () => {
  const ports = makePorts();
  const task = {
    id: 'TASK-20260920-GAFFER-PORTS-TEST',
    ownedPaths: ['tools/automation/src/gaffer/'],
    plannedChangedFiles: ['tools/automation/src/gaffer/example.mjs'],
    metadata: { taskContract: VALID_CONTRACT },
  };
  await ports.authorize({ context: { taskContract: VALID_CONTRACT } });
  await assert.rejects(
    () =>
      ports.executeWorker({
        worker: {
          id: 'codex-economy',
          adapterId: 'codex',
          classes: ['ECONOMY'],
          certified: true,
        },
        workerClass: 'ECONOMY',
        task,
        project: { id: CAPSULE },
        context: {
          taskContract: VALID_CONTRACT,
          lease: {
            local: {
              task_id: 'TASK-OTHER',
              actor: 'luna',
              worktree_id: 'main',
              fencing_token: 1,
              scope_prefixes: ['tools/automation/src/gaffer/'],
            },
            remoteEvents: [validLease()],
            now: NOW,
          },
        },
      }),
    (error) => error.code === 'BLOCKED_REQUIREMENT',
  );
});

test('worker execution rejects direct Droid or uncertified bypass before provider execution', async () => {
  let providerCalls = 0;
  const ports = makePorts({
    providerPorts: baseProvider({
      executeWorker: async () => {
        providerCalls += 1;
        return { status: 'complete', changedFiles: [] };
      },
    }),
  });
  const task = {
    id: 'TASK-20260920-GAFFER-PORTS-TEST',
    ownedPaths: ['tools/automation/src/gaffer/'],
    plannedChangedFiles: ['tools/automation/src/gaffer/example.mjs'],
    metadata: { taskContract: VALID_CONTRACT },
  };
  await ports.authorize({ context: { taskContract: VALID_CONTRACT } });
  const context = {
    taskContract: VALID_CONTRACT,
    lease: {
      local: {
        task_id: task.id,
        actor: 'luna',
        worktree_id: 'main',
        fencing_token: 1,
        scope_prefixes: ['tools/automation/src/gaffer/'],
      },
      remoteEvents: [validLease()],
      now: NOW,
    },
  };

  await assert.rejects(
    () =>
      ports.executeWorker({
        worker: {
          id: 'droid-strong',
          adapterId: 'droid',
          classes: ['STRONG'],
          certified: true,
        },
        workerClass: 'STRONG',
        task,
        project: { id: CAPSULE },
        context,
      }),
    (error) => error.code === 'ADAPTER_UNAVAILABLE',
  );
  assert.equal(providerCalls, 0);

  await assert.rejects(
    () =>
      ports.executeWorker({
        worker: {
          id: 'codex-unregistered',
          adapterId: 'codex',
          classes: ['ECONOMY'],
          certified: true,
        },
        workerClass: 'ECONOMY',
        task,
        project: { id: CAPSULE },
        context,
      }),
    (error) => error.code === 'ADAPTER_UNAVAILABLE',
  );
  assert.equal(providerCalls, 0);

  await assert.rejects(
    () =>
      ports.executeWorker({
        worker: {
          id: 'codex-economy',
          adapterId: 'codex',
          classes: ['ECONOMY'],
          certified: true,
        },
        workerClass: 'ECONOMY',
        task: {
          ...task,
          plannedChangedFiles: ['README.md'],
        },
        project: { id: CAPSULE },
        context,
      }),
    (error) => error.code === 'SCOPE_VIOLATION',
  );
  assert.equal(providerCalls, 0);
});

test('verification combines gates, evidence, repository verification, and extraction', async () => {
  let repositoryCalls = 0;
  let standaloneCalls = 0;
  const ports = makePorts({
    runRepositoryVerification: async () => {
      repositoryCalls += 1;
      return { passed: true };
    },
    runStandaloneVerification: async () => {
      standaloneCalls += 1;
      return { passed: true, result: { id: CAPSULE } };
    },
  });

  const evidenceManifest = validEvidence();
  const result = await ports.verify({
    mode: 'FINAL',
    intent: 'verify',
    project: { id: CAPSULE },
    plan: { evidenceManifest },
    authorization: { contract: VALID_CONTRACT },
  });

  assert.equal(result.passed, true);
  assert.equal(repositoryCalls, 1);
  assert.equal(standaloneCalls, 1);
  assert.equal(result.evidence.valid, true);
  assert.equal(Object.keys(result.gates).length, 8);
});

test('verification blocks a missing or tampered evidence manifest', async () => {
  const ports = makePorts();
  const missing = await ports.verify({
    mode: 'FINAL',
    project: { id: CAPSULE },
    plan: {},
  });
  assert.equal(missing.passed, false);
  assert.match(missing.errors.join(' '), /evidence/i);

  const tampered = validEvidence();
  tampered.manifest_id = 'TAMPERED';
  const result = await ports.verify({
    mode: 'FINAL',
    project: { id: CAPSULE },
    plan: { evidenceManifest: tampered },
  });
  assert.equal(result.passed, false);
  assert.equal(result.evidence.valid, false);
});

test('root acceptance requires verified evidence before delegating semantic acceptance', async () => {
  let acceptedCalls = 0;
  const ports = makePorts({
    providerPorts: baseProvider({
      rootAccept: async () => {
        acceptedCalls += 1;
        return { accepted: true };
      },
    }),
  });

  const blocked = await ports.rootAccept({
    project: { id: CAPSULE },
    verification: { passed: false },
  });
  assert.deepEqual(blocked, { accepted: false, reason: 'verification_failed' });
  assert.equal(acceptedCalls, 0);

  const authorization = await ports.authorize({
    context: {
      taskContract: ACCEPT_CONTRACT,
      headSha: 'b'.repeat(40),
      diffDigest: 'd'.repeat(64),
    },
  });
  const accepted = await ports.rootAccept({
    intent: 'accept',
    project: { id: CAPSULE },
    plan: {},
    verification: {
      passed: true,
      evidenceManifest: validEvidence({
        contractDigest: authorization.contractDigest,
      }),
      evidence: { valid: true },
    },
  });
  assert.deepEqual(accepted, { accepted: true });
  assert.equal(acceptedCalls, 1);
});

test('root acceptance rejects a valid manifest without a current task binding', async () => {
  const ports = makePorts();
  const result = await ports.rootAccept({
    project: { id: CAPSULE },
    verification: {
      passed: true,
      evidenceManifest: validEvidence(),
      evidence: { valid: true },
    },
  });
  assert.deepEqual(result, {
    accepted: false,
    reason: 'evidence_binding_mismatch',
  });
});

test('root acceptance rejects forged same-task contract bindings', async () => {
  const ports = makePorts();
  const authorization = await ports.authorize({
    context: {
      taskContract: ACCEPT_CONTRACT,
      headSha: 'b'.repeat(40),
      diffDigest: 'd'.repeat(64),
    },
  });
  const result = await ports.rootAccept({
    project: { id: CAPSULE },
    verification: {
      passed: true,
      evidenceManifest: validEvidence({
        contractDigest: `${authorization.contractDigest.slice(0, -1)}0`,
      }),
    },
  });
  assert.deepEqual(result, {
    accepted: false,
    reason: 'evidence_binding_mismatch',
  });
});
