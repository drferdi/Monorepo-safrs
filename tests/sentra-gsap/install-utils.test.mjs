import test from 'node:test';
import assert from 'node:assert/strict';
import { upsertManagedBlock, patchPackageScripts } from '../../scripts/sentra-gsap/lib/install-utils.mjs';

test('managed block insertion is idempotent and preserves surrounding text', () => {
  const original = '# Existing\nDo not change me.\n';
  const once = upsertManagedBlock(original, 'SENTRA-GSAP', 'RULE=1');
  const twice = upsertManagedBlock(once, 'SENTRA-GSAP', 'RULE=2');
  assert.match(twice, /# Existing/);
  assert.match(twice, /Do not change me\./);
  assert.doesNotMatch(twice, /RULE=1/);
  assert.match(twice, /RULE=2/);
  assert.equal((twice.match(/BEGIN SENTRA-GSAP/g) || []).length, 1);
});

test('package script patch adds Sentra scripts without removing existing scripts', () => {
  const input = { name: 'repo', scripts: { build: 'turbo build' } };
  const output = patchPackageScripts(input);
  assert.equal(output.scripts.build, 'turbo build');
  assert.equal(output.scripts['sentra:gsap:verify'], 'node scripts/sentra-gsap/verify.mjs');
  assert.equal(output.scripts['sentra:gsap:qa'], 'node scripts/sentra-gsap/browser-qa.mjs');
});
