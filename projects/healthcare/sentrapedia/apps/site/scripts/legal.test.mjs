import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createServer } from './serve.mjs';

const pages = ['privasi', 'ketentuan', 'penafian'];

test('legal pages serve their source, cross-link each other and stay local', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const css = await (await fetch(base + '/media/legal.css')).text();
    for (const page of pages) {
      const source = await fs.readFile(new URL(`../source/${page}/index.html`, import.meta.url), 'utf8');
      for (const route of [`/${page}/`, `/${page}`]) {
        const response = await fetch(base + route);
        assert.equal(response.status, 200, route);
        assert.match(response.headers.get('content-type'), /text\/html/);
        assert.equal(await response.text(), source);
      }
      assert.match(source, /<title>[^<]+ — Sentrapedia<\/title>/);
      assert.match(source, /<h1 id="legal-title" tabindex="-1">/);
      assert.match(source, /Versi 1\.0 · Berlaku 16 Oktober 2026/);
      assert.match(source, /kewenangan dokter yang menangani|Kebijakan Privasi/);
      const ids = new Set([...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
      assert.equal(ids.size, [...source.matchAll(/\bid="/g)].length, `${page}: duplicate ids`);
      const toc = source.match(/<nav class="legal-toc"[\s\S]*?<\/nav>/)[0];
      const entries = [...toc.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
      assert.ok(entries.length >= 8, `${page}: ${entries.length} articles`);
      for (const id of entries) {
        assert.ok(ids.has(id), `${page}: #${id}`);
        assert.match(source, new RegExp(`<article id="${id}" class="legal-article" aria-labelledby="${id}-title">`));
        assert.ok(ids.has(`${id}-title`), `${page}: #${id}-title`);
      }
      for (const other of pages.filter(candidate => candidate !== page)) {
        assert.match(source, new RegExp(`href="/${other}/"`), `${page} links ${other}`);
      }
      const targets = new Set([
        ...[...source.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]),
        ...[...css.matchAll(/url\('([^']+)'\)/g)].map(match => match[1]),
      ]);
      for (const target of targets) {
        const url = new URL(target, `${base}/${page}/`);
        assert.equal(url.origin, base, `${page} must not require external assets: ${target}`);
        const response = await fetch(url);
        assert.equal(response.status, 200, target);
        if (url.hash) {
          const html = await response.text();
          assert.ok(html.includes(`id="${url.hash.slice(1)}"`), target);
        } else {
          await response.arrayBuffer();
        }
      }
    }
    const homepage = await (await fetch(base)).text();
    const footer = homepage.slice(homepage.lastIndexOf('<footer'));
    for (const page of pages) assert.match(footer, new RegExp(`<a href="/${page}/">`), `homepage footer links ${page}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
