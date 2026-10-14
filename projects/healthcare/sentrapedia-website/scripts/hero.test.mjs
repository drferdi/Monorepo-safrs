import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('intro presents only the neuron and Sentrapedia wordmark', async () => {
  const html = await readFile(new URL('../source/index.html', import.meta.url), 'utf8');
  const intro = html.slice(html.indexOf('<section id="intro"'), html.indexOf('<section id="home-text"'));
  assert.match(intro, /class="hero-stage-logo"[^>]*src="\/assets\/brand\/favicon\.png"/);
  assert.match(intro, /<h1 class="hero-stage-wordmark">Sentrapedia<\/h1>/);
  assert.doesNotMatch(intro, /hero-copy|hero-cta|Konteks klinis tertata|Lihat Alur Kerja/);
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
