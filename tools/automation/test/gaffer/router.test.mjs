import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkerClass } from '../../src/gaffer/constants.mjs';
import { resolveWorker, assertNoSilentSubstitution } from '../../src/gaffer/router.mjs';

test('router chooses cheapest certified worker in requested class', () => {
  const chosen = resolveWorker({
    requestedClass: WorkerClass.ECONOMY,
    availableWorkers: [
      { id: 'b', classes: [WorkerClass.ECONOMY], expectedCost: 2, certified: true },
      { id: 'a', classes: [WorkerClass.ECONOMY], expectedCost: 1, certified: true },
    ],
  });
  assert.equal(chosen.id, 'a');
});

test('router rejects unsupported class', () => {
  assert.throws(() => resolveWorker({
    requestedClass: WorkerClass.STRONG,
    availableWorkers: [{ id: 'cheap', classes: [WorkerClass.ECONOMY] }],
  }), /No certified worker/);
});

test('silent worker class substitution is forbidden', () => {
  assert.throws(() => assertNoSilentSubstitution(WorkerClass.ECONOMY, WorkerClass.STRONG), /substitution/i);
});
