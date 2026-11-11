import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('homepage renderer preserves the served document and rejects missing or reordered live panels', async () => {
  const { renderHomepage } = await import('../scripts/render-homepage.mjs');
  const source = await readFile(new URL('../source/index.html', import.meta.url), 'utf8');
  const baseline = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');
  assert.equal(renderHomepage(source), baseline);
  const missing = source.replace(/<!-- capability-live:cockpit:start -->[\s\S]*?<!-- capability-live:cockpit:end -->/, '');
  assert.throws(() => renderHomepage(missing), /Incomplete capability panel fragments/);
  assert.throws(() => renderHomepage(source.replaceAll('capability-live:cockpit:', 'capability-live:unknown:')), /Capability panel order changed/);
  assert.throws(() => renderHomepage(source.replace('<!-- clinical-note:start -->', '')), /exactly one clinical note/);
});
