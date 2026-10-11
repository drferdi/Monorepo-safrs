import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test('renderer permits its exact bootstrap shim without enabling arbitrary inline scripts', () => {
  const html = readFileSync(new URL('../desktop/renderer/index.html', import.meta.url), 'utf8');
  const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/u)?.[1];
  assert.ok(policy);
  const scripts = policy.split(';').find((directive) => directive.trim().startsWith('script-src'));
  assert.ok(scripts);
  assert.ok(!scripts.includes("'unsafe-inline'") && !scripts.includes("'unsafe-eval'"));
  for (const match of html.matchAll(/<script>(.*?)<\/script>/gsu)) {
    const hash = createHash('sha256').update(match[1]).digest('base64');
    assert.ok(scripts.includes(`'sha256-${hash}'`), 'Inline bootstrap must have an exact CSP hash');
  }
});
