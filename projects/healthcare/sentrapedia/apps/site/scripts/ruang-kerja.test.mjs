import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from './serve.mjs';

test('clinical workspace intro lives on its own navigable page', async () => {
  const home = await readFile(new URL('../source/index.html', import.meta.url), 'utf8');
  const workspace = await readFile(new URL('../source/ruang-kerja/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(home, /<section id="home-text"|Ruang kerja klinis <br>untuk dokter Indonesia\./);
  assert.match(home, /href="\/ruang-kerja\/"[^>]*>Fitur<\/a>/);
  assert.match(workspace, /<main[^>]*>[\s\S]*?<section id="home-text"/);
  assert.match(workspace, /Ruang kerja klinis[\s\S]*?untuk dokter Indonesia\./);
  assert.match(workspace, /human-anatomy-cutout\.png/);
  for (const heading of ['Fokus pada dokter', 'Konteks yang utuh', 'Dokumen terarah']) {
    assert.ok(workspace.includes(heading), heading);
  }
});

test('the standalone clinical workspace page is served by the built site', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/ruang-kerja/`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Ruang kerja klinis[\s\S]*?untuk dokter Indonesia\./);
  } finally {
    server.close();
  }
});
