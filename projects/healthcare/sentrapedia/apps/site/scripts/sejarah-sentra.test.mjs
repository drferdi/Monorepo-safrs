import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from './serve.mjs';

test('Sentra history is linked from the homepage and keeps physician authority explicit', async () => {
  const home = await readFile(new URL('../source/index.html', import.meta.url), 'utf8');
  const history = await readFile(new URL('../source/sejarah-sentra/index.html', import.meta.url), 'utf8');
  assert.match(home, /href="\/sejarah-sentra\/">Tentang Sentra<\/a>/);
  assert.match(history, /<time datetime="2025-02">Februari 2025<\/time>/);
  assert.match(history, /RSIA Melinda DHAI/);
  assert.match(history, /dr\. Ferdi Iskandar merintis Sentra/);
  assert.match(history, /ditulis oleh dr\. Ferdi Iskandar/);
  assert.match(history, /Keputusan tetap di tangan dokter/);
  assert.match(history, /href="https:\/\/ferdiiskandar\.com\/kisah-sentra"/);
  for (const page of ['privasi', 'ketentuan']) {
    const legal = await readFile(new URL(`../source/${page}/index.html`, import.meta.url), 'utf8');
    assert.match(legal, /tulisan pendiri tentang sejarah Sentra/);
    assert.doesNotMatch(legal, /Satu-satunya tautan keluar|satu tautan keluar/);
  }
});

test('the head menu opens the history and the story names its contributors', async () => {
  const home = await readFile(new URL('../source/index.html', import.meta.url), 'utf8');
  const history = await readFile(new URL('../source/sejarah-sentra/index.html', import.meta.url), 'utf8');
  assert.equal((home.match(/href="\/sejarah-sentra\/">Sejarah Sentra<\/a>/g) ?? []).length, 2);
  assert.match(history, /dr\. Novia Dwi Anggraini/);
  assert.match(history, /Joseph Arianto/);
  assert.match(history, /Liaison Officer/);
});

test('the built history route and local stylesheet are served', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;
    const [page, stylesheet, home] = await Promise.all([
      fetch(`${base}/sejarah-sentra/`),
      fetch(`${base}/media/sejarah-sentra.css`),
      fetch(base),
    ]);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Dari ruang praktik/);
    assert.equal(stylesheet.status, 200);
    assert.match(await stylesheet.text(), /prefers-reduced-motion/);
    assert.match(await home.text(), /href="\/sejarah-sentra\/">Tentang Sentra<\/a>/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
