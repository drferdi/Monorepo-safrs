import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createServer } from './serve.mjs';

test('FAQ route serves its source, accessible native disclosures and local dependencies', async () => {
  const source = await fs.readFile(new URL('../source/faq/index.html', import.meta.url), 'utf8');
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ['/faq/', '/faq']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get('content-type'), /text\/html/);
      assert.equal(await response.text(), source);
    }
    const disclosures = [...source.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)];
    assert.ok(disclosures.length >= 7);
    const summaries = disclosures.map(([, body]) => {
      assert.match(body, /^\s*<summary>[\s\S]*?<\/summary>\s*<div class="faq-answer">/);
      return body.match(/<span class="faq-question">([^<]+)<\/span>/)[1];
    });
    assert.equal(new Set(summaries).size, summaries.length);
    const cssResponse = await fetch(base + '/media/faq.css');
    const css = await cssResponse.text();
    const targets = new Set([
      ...[...source.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]),
      ...[...css.matchAll(/url\('([^']+)'\)/g)].map(match => match[1]),
    ]);
    for (const target of targets) {
      const url = new URL(target, base + '/faq/');
      assert.equal(url.origin, base, 'FAQ must not require external assets');
      const response = await fetch(url);
      assert.equal(response.status, 200, target);
      if (url.hash) {
        const html = await response.text();
        assert.ok(html.includes(`id="${url.hash.slice(1)}"`), target);
      } else {
        await response.arrayBuffer();
      }
    }
    const homepage = await fetch(base);
    const html = await homepage.text();
    assert.match(html, /href="#clinical-faq">FAQ<\/a>/);
    assert.ok(html.indexOf('id="clinical-principles"') < html.indexOf('id="clinical-faq"'));
    assert.ok(html.indexOf('id="clinical-faq"') < html.indexOf('class="clinical-closing clinical-measure"'));
    assert.equal((html.match(/<details\b/g) || []).length, disclosures.length);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
