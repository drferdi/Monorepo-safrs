import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function filesUnder(directory) {
  const found = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await filesUnder(relative));
    else found.push(relative);
  }
  return found;
}

test('migration closure matches its manifest and excludes private state', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'docs/migration-manifest.json'), 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(manifest.files.length > 100);
  const expected = new Set();
  for (const entry of manifest.files) {
    assert.doesNotMatch(entry.path, /(^|\/)(?:\.git|node_modules|hts-cache|cookies\.txt|\.env[^/]*)($|\/)/i);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    expected.add(entry.path);
    assert.equal(digest(await readFile(path.join(root, entry.path))), entry.sha256, entry.path);
  }
  const actual = (await Promise.all(['source', 'assets', 'site', 'reference', 'scripts'].map(filesUnder))).flat()
    .filter(file => file !== 'reference/verification.json');
  assert.deepEqual(actual.sort(), [...expected].sort());
  for (const name of ['node_modules', 'cookies.txt', '.env', '.env.local', 'hts-cache']) {
    await assert.rejects(stat(path.join(root, name)), { code: 'ENOENT' });
  }
});
