import test from 'node:test';
import assert from 'node:assert/strict';
import { Route, WorkerClass } from '../../src/gaffer/constants.mjs';
import { selectExecutionRoute, classifyWorker } from '../../src/gaffer/classifier.mjs';

test('small local task routes SOLO', () => {
  assert.equal(selectExecutionRoute({ estimatedUnits: 1, blastRadius: 'local' }), Route.SOLO);
});

test('separable multi-unit task routes DECOMPOSE', () => {
  assert.equal(selectExecutionRoute({ estimatedUnits: 3, separable: true }), Route.DECOMPOSE);
});

test('bounded testable task selects ECONOMY', () => {
  assert.equal(classifyWorker({ ownedPaths: ['src/x.ts'], verification: ['pnpm test'], architectureSettled: true }), WorkerClass.ECONOMY);
});

test('high-risk task selects STRONG', () => {
  assert.equal(classifyWorker({ ownedPaths: ['src/auth.ts'], verification: ['pnpm test'], riskTags: ['auth'] }), WorkerClass.STRONG);
});
