import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from './serve.mjs';

test('intro keeps the neuron and wordmark beside the decorative workspace simulation', async () => {
  const html = await readFile(new URL('../source/index.html', import.meta.url), 'utf8');
  const intro = html.slice(html.indexOf('<section id="intro"'), html.indexOf('<section id="logo-middle"'));
  assert.match(intro, /class="hero-stage-logo"[^>]*src="\/assets\/brand\/favicon\.png"/);
  assert.match(intro, /<h1 class="hero-stage-wordmark">Sentrapedia<\/h1>/);
  assert.doesNotMatch(intro, /hero-copy|hero-cta|Konteks klinis tertata|Lihat Alur Kerja/);
  assert.doesNotMatch(intro, /sentrapedia-hero\.webm|hero-showcase/);
  assert.match(intro, /<div class="hero-workspace-stage" role="img" aria-label="Simulasi ruang kerja Sentrapedia[^"]*dokter\."/);
  assert.doesNotMatch(intro, /hero-workspace-bridge|hero-workspace-film|\/media\/promo-vid\.mp4/);
  assert.match(intro, /<div class="hero-workspace-frame" aria-hidden="true">\s*<div class="hw-screen">\s*<svg class="hw-cursor" data-hw="cursor"[^>]*aria-hidden="true">/);
  assert.match(intro, /<button type="button" class="hero-workspace-toggle" aria-label="Jeda simulasi" aria-pressed="false" hidden>Jeda<\/button>/);
  assert.match(intro, /Simulasi visual[^<]*kasus sintetis[^<]*keputusan dokter/);
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

test('wordmark film pairs a left video with a typed explanation on the right', async () => {
  const html = await readFile(new URL('../source/index.html', import.meta.url), 'utf8');
  const logo = html.slice(html.indexOf('<section id="logo-middle"'), html.indexOf('<section id="featured-projects"'));
  const film = logo.indexOf('<div id="product-film" class="product-film-layout"');
  const video = logo.indexOf('<video class="product-film-video"', film);
  const copy = logo.indexOf('<div class="product-film-copy"', film);
  const claim = logo.indexOf('class="logo-middle-claim"', film);
  assert.ok(film >= 0 && video > film && copy > video && claim > copy);
  assert.match(logo, /data-film-type="heading"[^>]*>Satu alur, keputusan tetap pada dokter\.<\/span>/);
  assert.match(logo, /data-film-type="body"[^>]*>Dari pertanyaan klinis dan draf catatan hingga peninjauan/);
  assert.equal(html.match(/\/media\/promo-vid\.mp4/g)?.length, 1);
});

test('complete promo stays beneath the large wordmark and outside the hero', async () => {
  const html = await readFile(new URL('../source/index.html', import.meta.url), 'utf8');
  const introStart = html.indexOf('<section id="intro"');
  const logoStart = html.indexOf('<section id="logo-middle"');
  const filmStart = html.indexOf('<div id="product-film"');
  const claimStart = html.indexOf('class="logo-middle-claim"', filmStart);
  const nextSection = html.indexOf('<section id="featured-projects"');
  assert.ok(introStart >= 0 && logoStart > introStart);
  assert.ok(filmStart > logoStart && claimStart > filmStart && nextSection > claimStart);
  const intro = html.slice(introStart, logoStart);
  const film = html.slice(filmStart, claimStart);
  assert.doesNotMatch(intro, /hero-prelude|hero-workspace-full-film|\/media\/promo-vid\.mp4|\/media\/hero-bridge\.mp4/);
  assert.match(film, /<h2[^>]*id="product-film-title"[^>]*>/);
  assert.match(film, /<video[^>]*muted[^>]*playsinline[^>]*><source src="\/media\/promo-vid\.mp4" type="video\/mp4"><\/video>/);
  assert.match(film, /<button[^>]*class="product-film-toggle"[^>]*aria-label="Putar film"[^>]*>Putar<\/button>/);
  assert.match(film, /kasus sintetis/i);
  assert.ok(html.includes('<link rel="stylesheet" href="/media/product-film.css">'));
  assert.ok(html.includes('<script src="/media/product-film.js" defer></script>'));

  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/media/promo-vid.mp4`, { headers: { Range: 'bytes=0-3' } });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('content-type'), 'video/mp4');
    assert.equal((await response.arrayBuffer()).byteLength, 4);
  } finally {
    server.close();
  }
});
