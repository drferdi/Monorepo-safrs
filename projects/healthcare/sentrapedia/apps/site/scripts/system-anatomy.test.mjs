import test from 'node:test';
import assert from 'node:assert/strict';
import { anatomyLayers, anatomyTargets } from '../assets/system-anatomy-model.js';

test('initial anatomy separates every functional assembly into visible tiers', () => {
  const pose = anatomyTargets(null);
  assert.equal(pose.base, 0);
  assert.equal(pose.board, 24);
  assert.equal(pose.context, 92);
  assert.equal(pose.processor, 132);
  assert.equal(pose.knowledge, 108);
  assert.equal(pose.document, 68);
  assert.equal(new Set(anatomyLayers.filter(layer => layer.stage !== null).map(layer => pose[layer.id])).size, 4);
});

test('feature selection focuses its assembly while the others return to their board mounts', () => {
  const focused = anatomyTargets(2);
  assert.equal(focused.knowledge, 108);
  assert.equal(focused.context, 24);
  assert.equal(focused.processor, 24);
  assert.equal(focused.document, 24);
  assert.deepEqual(anatomyTargets(null), { base: 0, board: 24, context: 92, processor: 132, knowledge: 108, document: 68 });
});

test('invalid selections cannot silently target a different feature', () => {
  for (const value of [-1, 4, .5, '2', undefined]) assert.throws(() => anatomyTargets(value), RangeError);
});
