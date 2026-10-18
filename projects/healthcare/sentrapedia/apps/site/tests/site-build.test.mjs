import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('a clean build produces the whole site from source and static files alone', async () => {
  const out = await mkdtemp(path.join(os.tmpdir(), 'sentrapedia-site-'));
  const template = await readFile(path.join(root, 'source/index.html'));
  try {
    execFileSync(process.execPath, [path.join(root, 'scripts/transform.mjs'), out], { stdio: 'pipe' });
    assert.deepEqual(await readFile(path.join(root, 'source/index.html')), template, 'the build must not write back into source/');
    const manifest = JSON.parse(await readFile(path.join(root, 'reference/design-integrity.json'), 'utf8'));
    for (const entry of manifest.files) assert.equal(digest(await readFile(path.join(out, entry.path))), entry.sha256, entry.path);
    for (const page of ['index.html', 'faq/index.html', 'privasi/index.html', 'ruang-kerja/index.html', 'sejarah-sentra/index.html']) {
      assert.match(await readFile(path.join(out, page), 'utf8'), /<title>/, page);
    }
    await readFile(path.join(out, 'assets/brand/favicon.png'));
    await readFile(path.join(out, 'public/child.png'));
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
