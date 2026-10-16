import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from './serve.mjs';

test('ten capability stops follow the requested right down right down route', async () => {
  const { capabilityPath } = await import('../assets/capability-explorer.js');
  assert.equal(typeof capabilityPath, 'function', 'the rail exposes its two-axis route model');
  assert.deepEqual(capabilityPath(), [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [3, 3], [4, 3], [5, 3], [5, 4]]);
});

test('each capability serves its own lightweight feature illustration rather than repeating a generic visual', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const html = await (await fetch(base)).text();
    const explorer = html.slice(html.indexOf('class="clinical-capability-viewport"'), html.indexOf('id="clinical-principles"'));
    const figures = [...explorer.matchAll(/<img class="capability-feature-image" src="([^"]+)"[^>]*alt="([^"]+)"/g)];
    assert.equal(figures.length, 8, 'eight panels have dedicated accessible raster illustrations');
    assert.equal([...explorer.matchAll(/data-feature-anatomy="/g)].length, 2, 'the other two panels use accessible anatomy figures');
    assert.equal(new Set(figures.map(figure => figure[1])).size, 8, 'feature assets are not reused across panels');
    const payloads = new Set();
    for (const [, source, description] of figures) {
      assert.ok(description.length > 30, 'each illustration describes its feature');
      const response = await fetch(base + source);
      assert.equal(response.status, 200, source);
      assert.equal(response.headers.get('content-type'), 'image/webp');
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.ok(bytes.length < 350_000, source + ' stays within the illustration transfer budget');
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      assert.deepEqual(bytes, await readFile(new URL('../assets/' + source.slice('/media/'.length), import.meta.url)));
      payloads.add(bytes.toString('base64'));
    }
    assert.equal(payloads.size, 8, 'different filenames must also contain different image content');
    assert.equal([...explorer.matchAll(/data-capability-video /g)].length, 1, 'all features share one background video decoder');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('capability explorer serves readable no-JS content and lazy shared media', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch('http://127.0.0.1:' + server.address().port);
    assert.equal(response.status, 200);
    const html = await response.text();
    const explorer = html.slice(html.indexOf('class="clinical-capability-viewport"'), html.indexOf('id="clinical-principles"'));
    assert.match(explorer, /Sepuluh kemampuan\.<br>\s*Satu ruang kerja\./, 'approved explorer heading is served');
    assert.equal([...explorer.matchAll(/class="clinical-capability"/g)].length, 10);
    assert.equal([...explorer.matchAll(/class="capability-detail"/g)].length, 10);
    assert.doesNotMatch(explorer, /class="capability-detail"[^>]*\bhidden\b/, 'all feature bodies remain available without JavaScript');
    assert.match(explorer, /class="capability-rail-window"[^>]*tabindex="0"/, 'horizontal rail has a keyboard-operable viewport');
    assert.doesNotMatch(explorer, /capability-navigation|capability-accordion|<header class="capability-heading"/, 'no generic sidebar or inherited sticky header remains');
    assert.equal([...explorer.matchAll(/data-capability-shared-visual/g)].length, 8, 'raster panels retain the shared video while SVG anatomy moves its own parts');
    assert.equal([...explorer.matchAll(/class="capability-motion-poster" src="\/media\/capability-flow-poster\.jpg"[^>]*loading="lazy"/g)].length, 8, 'raster backgrounds reserve lightweight actual-clip posters without eager image loading');
    assert.match(explorer, /<li>Edukasi Pasien<\/li>\s*<\/ol><\/div><\/div>/, 'the sixth output stays inside the complete Fast Assessment copy');
    assert.match(explorer, /data-capability-video[^>]*muted[^>]*loop[^>]*playsinline[^>]*preload="none"/);
    assert.match(explorer, /data-source="\/media\/capability-flow\.mp4"/);
    const video = explorer.match(/<video data-capability-video[\s\S]*?<\/video>/)?.[0];
    assert.ok(video);
    assert.doesNotMatch(video, /\ssrc=|<source/, 'media is not requested before the controller checks visibility and motion preferences');
    assert.match(explorer, /data-capability-pause[^>]*hidden/);
    assert.match(explorer, /aria-live="polite"/);
    for (const asset of ['capability-explorer.css', 'capability-explorer.js', 'capability-flow-poster.jpg']) {
      const local = await fetch('http://127.0.0.1:' + server.address().port + '/media/' + asset);
      assert.equal(local.status, 200, asset + ' is served locally');
      assert.deepEqual(new Uint8Array(await local.arrayBuffer()), new Uint8Array(await readFile(new URL('../assets/' + asset, import.meta.url))), asset + ' served bytes match authored input');
    }
    const clip = await fetch('http://127.0.0.1:' + server.address().port + '/media/capability-flow.mp4', { headers: { Range: 'bytes=0-31' } });
    assert.equal(clip.status, 206);
    assert.equal(clip.headers.get('content-type'), 'video/mp4');
    const source = await readFile(new URL('../assets/capability-flow.mp4', import.meta.url));
    assert.deepEqual(new Uint8Array(await clip.arrayBuffer()), new Uint8Array(source.subarray(0, 32)));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('capability keyboard navigation wraps and supports direct endpoints', async () => {
  const { capabilitySelection } = await import('../assets/capability-explorer.js');
  assert.equal(capabilitySelection(0, 'ArrowUp', 10), 9);
  assert.equal(capabilitySelection(9, 'ArrowDown', 10), 0);
  assert.equal(capabilitySelection(4, 'ArrowRight', 10), 5);
  assert.equal(capabilitySelection(4, 'ArrowLeft', 10), 3);
  assert.equal(capabilitySelection(4, 'Home', 10), 0);
  assert.equal(capabilitySelection(4, 'End', 10), 9);
  assert.equal(capabilitySelection(4, 'Enter', 10), null);
});

test('native viewport follows its active panel without clipping fractions or constraining other layouts', async () => {
  const { capabilityViewportHeight } = await import('../assets/capability-explorer.js');
  assert.equal(capabilityViewportHeight('native', 451.2, 0), 452);
  assert.equal(capabilityViewportHeight('native', 814.6, 15), 830);
  assert.equal(capabilityViewportHeight('stack', 451.2, 0), null);
  assert.equal(capabilityViewportHeight('pinned', 451.2, 0), null);
});

test('layout refresh waits for settling frames, replaces obsolete work and can flush before navigation', async () => {
  const { settledCapabilityRefresh } = await import('../assets/capability-explorer.js');
  const frames = new Map();
  let id = 0;
  let refreshed = 0;
  const tick = () => {
    const ready = [...frames.values()];
    frames.clear();
    ready.forEach(callback => callback());
  };
  const refresh = settledCapabilityRefresh(() => { refreshed++; }, callback => { frames.set(++id, callback); return id; }, frame => frames.delete(frame));
  refresh.queue();
  tick();
  assert.equal(refreshed, 0, 'one frame does not refresh during sibling layout updates');
  refresh.queue();
  tick();
  assert.equal(refreshed, 0, 'a replacement discards the old second frame');
  tick();
  assert.equal(refreshed, 1);
  refresh.queue();
  refresh.cancel();
  tick();
  tick();
  assert.equal(refreshed, 1, 'context cleanup cancels obsolete work');
  refresh.queue();
  refresh.flush();
  assert.equal(refreshed, 2, 'navigation consumes pending geometry refresh synchronously');
  tick();
  tick();
  assert.equal(refreshed, 2, 'a flush leaves no delayed duplicate');
});
