import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('intro keeps the neuron and wordmark beside a product film and a decorative workspace simulation', async () => {
  const html = await readFile(new URL('../source/index.html', import.meta.url), 'utf8');
  const intro = html.slice(html.indexOf('<section id="intro"'), html.indexOf('<section id="home-text"'));
  assert.match(intro, /class="hero-stage-logo"[^>]*src="\/assets\/brand\/favicon\.png"/);
  assert.match(intro, /<h1 class="hero-stage-wordmark">Sentrapedia<\/h1>/);
  assert.doesNotMatch(intro, /hero-copy|hero-cta|Konteks klinis tertata|Lihat Alur Kerja/);
  assert.doesNotMatch(intro, /sentrapedia-hero\.webm|hero-showcase/);
  assert.match(intro, /<div class="hero-workspace-stage" role="img" aria-label="Film singkat ruang kerja Sentrapedia[^"]*dokter\."/);
  assert.match(intro, /<div class="hero-workspace-film" aria-hidden="true">\s*<video muted playsinline preload="auto" poster="\/media\/clinical-product\/workspace\.png" tabindex="-1"><source src="\/media\/hero-film\.mp4" type="video\/mp4"><\/video>/);
  assert.match(intro, /<div class="hero-workspace-frame" aria-hidden="true">\s*<div class="hw-screen">\s*<svg class="hw-cursor" data-hw="cursor"[^>]*aria-hidden="true">/);
  assert.match(intro, /<button type="button" class="hero-workspace-toggle" aria-label="Jeda simulasi" aria-pressed="false" hidden>Jeda<\/button>/);
  assert.match(intro, /Film produk dan simulasi visual · kasus sintetis · keputusan dokter/);
  for (const label of ['Diagnosis Banding (DDx)', 'Catatan Klinis (SOAP)', 'Surat Rujukan', 'Draf lokal', 'Belum diisi:', 'Tinjau sebelum digunakan']) {
    assert.ok(intro.includes(label), label);
  }
  assert.ok(html.includes('<link rel="stylesheet" href="/media/hero-workspace.css">'));
  assert.ok(html.includes('<script src="/media/hero-workspace.js" defer></script>'));
});

test('closed workflows expose keyboard operable controls', async () => {
  const html = await readFile(new URL('../source/index.html', import.meta.url), 'utf8');
  const cards = html.slice(html.indexOf('id="projectCards"'), html.indexOf('</section>', html.indexOf('id="projectCards"')));
  const closed = [...cards.matchAll(/<div class="proj-card"[^>]*>\s*<div class="card-closed"([^>]*)>/g)];
  assert.equal(closed.length, 5);
  for (const [, attributes] of closed) {
    assert.match(attributes, /role="button"/);
    assert.match(attributes, /tabindex="0"/);
    assert.match(attributes, /aria-expanded="false"/);
  }
});
