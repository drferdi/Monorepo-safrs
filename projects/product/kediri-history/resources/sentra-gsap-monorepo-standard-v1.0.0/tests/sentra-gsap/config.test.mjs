import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeConfig, resolveAutoCommand } from '../../scripts/sentra-gsap/lib/config.mjs';

test('mergeConfig keeps strict defaults while accepting nested overrides', () => {
  const result = mergeConfig({ browser: { routes: ['/','/work'] }, thresholds: { cls: 0.05 } });
  assert.equal(result.requiredGates.browser, true);
  assert.equal(result.requiredGates.independentVisualReview, true);
  assert.deepEqual(result.browser.routes, ['/', '/work']);
  assert.equal(result.thresholds.cls, 0.05);
  assert.equal(result.thresholds.horizontalOverflowPx, 2);
});

test('resolveAutoCommand finds common script aliases', () => {
  const scripts = { 'check:types': 'tsc --noEmit', lint: 'eslint .', build: 'next build' };
  assert.equal(resolveAutoCommand('typecheck', 'auto', scripts, 'pnpm'), 'pnpm run check:types');
  assert.equal(resolveAutoCommand('lint', 'auto', scripts, 'pnpm'), 'pnpm run lint');
  assert.equal(resolveAutoCommand('test', 'auto', scripts, 'pnpm'), null);
});
