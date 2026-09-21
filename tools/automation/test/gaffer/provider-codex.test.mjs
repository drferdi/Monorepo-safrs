import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { Route, WorkerClass, FailureClass } from '../../src/gaffer/constants.mjs';
import { createCodexProvider, executeGafferIntent } from '../../src/gaffer/provider-codex.mjs';
import { buildManifest, finalizeManifest } from '../../src/evidence.mjs';
import { buildLeaseEvent, scopeDigest } from '../../src/leases.mjs';
import { compileTaskContract, loadCompileContext } from '../../src/contracts.mjs';

const ROOT = process.cwd();
const CAPSULE = 'academic/academic-smartboard';
const NOW = '2026-09-20T15:00:00Z';
const TASK_ID = 'TASK-20260920-GAFFER-PHASE3';

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
  objective: 'Exercise Gaffer Phase 3 Codex provider activation.',
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
  root: '.',
  schema_version: 1,
  target_ref: 'refs/heads/main',
  task_id: TASK_ID,
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
  write_scopes: [
    'projects/academic/academic-smartboard/apps/web/src/components/AppShell.tsx',
  ],
};

const compileContext = loadCompileContext(ROOT);
const { contractDigest: COMPILED_CONTRACT_DIGEST } = compileTaskContract(
  VALID_CONTRACT,
  compileContext,
);

function validEvidence({
  taskId = TASK_ID,
  contractDigest = COMPILED_CONTRACT_DIGEST,
  effectiveRisk = 'R1',
} = {}) {
  return finalizeManifest(
    buildManifest({
      manifest_id: 'MANIFEST-GAFFER-PHASE3',
      task_id: taskId,
      run_id: 'RUN-GAFFER-PHASE3',
      contract_digest: contractDigest,
      base_sha: 'a'.repeat(40),
      head_sha: 'b'.repeat(40),
      diff_digest: 'd'.repeat(64),
      effective_risk: effectiveRisk,
      risk_reasons: ['phase 3 verification'],
      created_at: NOW,
    }),
  );
}

function validLease(taskId = TASK_ID) {
  const scopePrefixes = [
    'projects/academic/academic-smartboard/apps/web/src/components/AppShell.tsx',
  ];
  const local = buildLeaseEvent({
    schema_version: 1,
    event_id: 'lease-event-1',
    sequence: 1,
    event_type: 'CLAIM',
    task_id: taskId,
    lease_id: 'LEASE-GAFFER-PHASE3',
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
  return {
    local,
    remoteEvents: [local],
    now: NOW,
  };
}

function testSetup() {
  const controlDirectory = mkdtempSync(
    path.join(os.tmpdir(), 'gaffer-phase3-control-'),
  );
  return { controlDirectory };
}

// --------------------------------------------------------------------------
// PROOF 1: /gaffer receives intent
// --------------------------------------------------------------------------
test('Proof 1: /gaffer receives intent and validates required format', async () => {
  await assert.rejects(
    async () => executeGafferIntent({ intent: '' }),
    (err) => err instanceof TypeError && /intent string is required/u.test(err.message),
  );

  const provider = createCodexProvider();
  const plan = await provider.rootPlan({
    intent: 'Fix navigation regression in smartboard',
    project: { id: CAPSULE, path: `projects/${CAPSULE}` },
    authorization: { allowed: true },
    context: {},
  });
  assert.ok(plan.route, 'Plan must select a route');
  assert.ok(plan.summary.includes('Fix navigation regression'), 'Summary must reflect user intent');
});

// --------------------------------------------------------------------------
// PROOF 2: SOLO works
// --------------------------------------------------------------------------
test('Proof 2: SOLO route works and achieves READY when verification passes', async () => {
  const { controlDirectory } = testSetup();
  let rootImplementCalled = false;

  const result = await executeGafferIntent({
    intent: 'Fix typo in AppShell component',
    capsuleSelector: CAPSULE,
    repositoryRoot: ROOT,
    controlDirectory,
    context: {
      route: Route.SOLO,
      taskContract: VALID_CONTRACT,
      headSha: 'b'.repeat(40),
      diffDigest: 'd'.repeat(64),
      lease: validLease(),
      evidenceManifest: validEvidence(),
    },
    providerOptions: {
      rootImplementProvider: async ({ intent, plan }) => {
        rootImplementCalled = true;
        return {
          status: 'complete',
          changedFiles: [
            'projects/academic/academic-smartboard/apps/web/src/components/AppShell.tsx',
          ],
        };
      },
    },
    portsOverrides: {
      runRepositoryVerification: async () => ({ passed: true }),
      runStandaloneVerification: async () => ({
        passed: true,
        result: { id: CAPSULE },
      }),
    },
  });

  assert.equal(rootImplementCalled, true, 'rootImplement must be invoked on SOLO');
  assert.equal(result.status, 'READY', 'SOLO execution must reach READY');
  assert.equal(result.route, Route.SOLO);
});

// --------------------------------------------------------------------------
// PROOF 3: DECOMPOSE creates bounded tasks
// --------------------------------------------------------------------------
test('Proof 3: DECOMPOSE creates bounded tasks DAG with explicit ownership', async () => {
  const provider = createCodexProvider();
  const plan = await provider.rootPlan({
    intent: 'Migrate progression detail chart and add unit tests',
    project: { id: CAPSULE, path: `projects/${CAPSULE}` },
    authorization: { allowed: true },
    context: {
      isMultiUnit: true,
      tasks: [
        {
          id: TASK_ID,
          title: 'Implement component logic',
          objective: 'Add progression detail chart logic',
          ownedPaths: [
            'projects/academic/academic-smartboard/apps/web/src/components/AppShell.tsx',
          ],
          workerClass: WorkerClass.ECONOMY,
          dependencies: [],
          architectureSettled: true,
        },
      ],
    },
  });

  assert.equal(plan.route, Route.DECOMPOSE);
  assert.equal(plan.tasks.length, 1);
  assert.equal(plan.tasks[0].id, TASK_ID);
  assert.deepEqual(plan.tasks[0].ownedPaths, [
    'projects/academic/academic-smartboard/apps/web/src/components/AppShell.tsx',
  ]);
});

// --------------------------------------------------------------------------
// PROOF 4: Economy succeeds on eligible work
// --------------------------------------------------------------------------
test('Proof 4: Economy worker succeeds on eligible bounded work', async () => {
  const { controlDirectory } = testSetup();
  const dispatchedWorkerClasses = [];

  const task1 = {
    id: TASK_ID,
    title: 'Implement component update',
    objective: 'Update component styling',
    ownedPaths: [
      'projects/academic/academic-smartboard/apps/web/src/components/AppShell.tsx',
    ],
    workerClass: WorkerClass.ECONOMY,
    dependencies: [],
    architectureSettled: true,
    verification: ['test'],
    metadata: { taskContract: VALID_CONTRACT },
  };

  const result = await executeGafferIntent({
    intent: 'Update component styling in smartboard',
    capsuleSelector: CAPSULE,
    repositoryRoot: ROOT,
    controlDirectory,
    context: {
      route: Route.DECOMPOSE,
      tasks: [task1],
      taskContract: VALID_CONTRACT,
      headSha: 'b'.repeat(40),
      diffDigest: 'd'.repeat(64),
      lease: validLease(),
      evidenceManifest: validEvidence(),
    },
    providerOptions: {
      executeWorkerProvider: async ({ workerClass, task }) => {
        dispatchedWorkerClasses.push(workerClass);
        return {
          status: 'complete',
          changedFiles: task.ownedPaths,
          evidenceManifest: validEvidence(),
        };
      },
    },
    portsOverrides: {
      runRepositoryVerification: async () => ({ passed: true }),
      runStandaloneVerification: async () => ({
        passed: true,
        result: { id: CAPSULE },
      }),
    },
  });

  assert.equal(result.status, 'READY');
  assert.deepEqual(dispatchedWorkerClasses, [WorkerClass.ECONOMY]);
});

// --------------------------------------------------------------------------
// PROOF 5: Economy capability mismatch escalates once to Strong
// --------------------------------------------------------------------------
test('Proof 5: Capability mismatch escalates Economy to Strong', async () => {
  const { controlDirectory } = testSetup();
  const dispatchedWorkerClasses = [];
  let verificationAttempt = 0;

  const task1 = {
    id: TASK_ID,
    title: 'Complex state machine refactor',
    objective: 'Refactor complex progression state machine',
    ownedPaths: [
      'projects/academic/academic-smartboard/apps/web/src/components/AppShell.tsx',
    ],
    workerClass: WorkerClass.ECONOMY,
    dependencies: [],
    architectureSettled: true,
    verification: ['test'],
    metadata: { taskContract: VALID_CONTRACT },
  };

  const result = await executeGafferIntent({
    intent: 'Refactor complex progression state machine',
    capsuleSelector: CAPSULE,
    repositoryRoot: ROOT,
    controlDirectory,
    context: {
      route: Route.DECOMPOSE,
      tasks: [task1],
      taskContract: VALID_CONTRACT,
      headSha: 'b'.repeat(40),
      diffDigest: 'd'.repeat(64),
      lease: validLease(),
      evidenceManifest: validEvidence(),
    },
    providerOptions: {
      executeWorkerProvider: async ({ workerClass, task }) => {
        dispatchedWorkerClasses.push(workerClass);
        return {
          status: 'complete',
          changedFiles: task.ownedPaths,
          evidenceManifest: validEvidence(),
        };
      },
    },
    portsOverrides: {
      runRepositoryVerification: async () => {
        verificationAttempt += 1;
        // First attempt (Economy) fails with CAPABILITY_MISMATCH
        if (verificationAttempt === 1) {
          const err = new Error('Model struggled with complex state constraints');
          err.code = FailureClass.CAPABILITY_MISMATCH;
          throw err;
        }
        // Second attempt (Strong) passes
        return { passed: true };
      },
      runStandaloneVerification: async () => ({
        passed: true,
        result: { id: CAPSULE },
      }),
    },
  });

  assert.equal(result.status, 'READY');
  assert.deepEqual(dispatchedWorkerClasses, [
    WorkerClass.ECONOMY,
    WorkerClass.STRONG,
  ], 'Must dispatch to ECONOMY first, then escalate to STRONG');
});

// --------------------------------------------------------------------------
// PROOF 6: SAFRS verification independently validates output
// --------------------------------------------------------------------------
test('Proof 6: SAFRS verification independently validates output and blocks tampered evidence', async () => {
  const { controlDirectory } = testSetup();

  const tamperedManifest = validEvidence({
    taskId: TASK_ID,
    contractDigest: 'invalid-tampered-digest'.padEnd(64, '0'),
  });

  const result = await executeGafferIntent({
    intent: 'Fix component with tampered evidence',
    capsuleSelector: CAPSULE,
    repositoryRoot: ROOT,
    controlDirectory,
    context: {
      route: Route.SOLO,
      taskContract: VALID_CONTRACT,
      headSha: 'b'.repeat(40),
      diffDigest: 'd'.repeat(64),
      lease: validLease(),
      evidenceManifest: tamperedManifest,
    },
    portsOverrides: {
      runRepositoryVerification: async () => ({ passed: true }),
      runStandaloneVerification: async () => ({
        passed: true,
        result: { id: CAPSULE },
      }),
    },
  });

  assert.equal(result.status, 'BLOCKED');
  assert.ok(
    ['verification_failed', 'evidence_binding_mismatch'].includes(result.reason),
    `Reason must be verification_failed or evidence_binding_mismatch, got: ${result.reason}`,
  );
});

// --------------------------------------------------------------------------
// PROOF 7: READY is impossible before gates pass
// --------------------------------------------------------------------------
test('Proof 7: READY is impossible before gates pass', async () => {
  const { controlDirectory } = testSetup();

  // Scenario A: Gate verification throws or fails
  const resultFailVerification = await executeGafferIntent({
    intent: 'Update component but gate fails',
    capsuleSelector: CAPSULE,
    repositoryRoot: ROOT,
    controlDirectory,
    context: {
      route: Route.SOLO,
      taskContract: VALID_CONTRACT,
      headSha: 'b'.repeat(40),
      diffDigest: 'd'.repeat(64),
      lease: validLease(),
      evidenceManifest: validEvidence(),
    },
    portsOverrides: {
      runRepositoryVerification: async () => ({
        passed: false,
        reason: 'pnpm test failed with 3 assertion errors',
      }),
      runStandaloneVerification: async () => ({
        passed: true,
        result: { id: CAPSULE },
      }),
    },
  });

  assert.equal(resultFailVerification.status, 'BLOCKED');
  assert.notEqual(resultFailVerification.status, 'READY');

  // Scenario B: Root acceptance rejects
  const resultFailAcceptance = await executeGafferIntent({
    intent: 'Update component but Root rejects semantics',
    capsuleSelector: CAPSULE,
    repositoryRoot: ROOT,
    controlDirectory,
    context: {
      route: Route.SOLO,
      taskContract: VALID_CONTRACT,
      headSha: 'b'.repeat(40),
      diffDigest: 'd'.repeat(64),
      lease: validLease(),
      evidenceManifest: validEvidence(),
    },
    providerOptions: {
      acceptanceResult: { accepted: false, reason: 'Semantic regression in UX' },
    },
    portsOverrides: {
      runRepositoryVerification: async () => ({ passed: true }),
      runStandaloneVerification: async () => ({
        passed: true,
        result: { id: CAPSULE },
      }),
    },
  });

  assert.equal(resultFailAcceptance.status, 'BLOCKED');
  assert.equal(resultFailAcceptance.reason, 'Semantic regression in UX');
});
