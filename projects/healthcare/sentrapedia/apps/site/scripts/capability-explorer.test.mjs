import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from './serve.mjs';

test('ten capability stops follow the requested right down right down route', async () => {
  const { capabilityPath } = await import('../assets/capability-explorer.js');
  assert.equal(typeof capabilityPath, 'function', 'the rail exposes its two-axis route model');
  assert.deepEqual(capabilityPath(), [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [3, 3], [4, 3], [5, 3], [5, 4]]);
});

test('eight raster scenes become readable HTML and SVG mechanisms without device-frame media', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const html = await (await fetch('http://127.0.0.1:' + server.address().port)).text();
    const explorer = html.slice(html.indexOf('class="clinical-capability-viewport"'), html.indexOf('id="clinical-principles"'));
    const panels = [...explorer.matchAll(/<figure class="capability-live-visual" data-capability-live="([a-z0-9-]+)"[\s\S]*?<\/figure>/g)];
    assert.equal(panels.length, 8, 'every formerly raster scene renders a real HTML/SVG panel');
    assert.equal(new Set(panels.map(panel => panel[1])).size, 8, 'each capability retains a distinct mechanism');
    for (const [markup, name] of panels) {
      assert.match(markup, /<svg[^>]*data-live-route[\s\S]*?<path[^>]*data-live-path/, name + ' includes a drawable SVG route');
      assert.match(markup, /class="capability-live-card/, name + ' keeps its labels as HTML text');
      assert.doesNotMatch(markup, /<img|<video/, name + ' is not a softened bitmap or video');
    }
    assert.match(explorer, />Draf diagnosis</);
    assert.match(explorer, />Referensi kode</);
    assert.match(explorer, />Tinjauan klinisi</);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('each live panel keeps its feature-specific clinical workflow labels', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const html = await (await fetch(base)).text();
    const explorer = html.slice(html.indexOf('class="clinical-capability-viewport"'), html.indexOf('id="clinical-principles"'));
    const figures = [...explorer.matchAll(/<figure class="capability-live-visual" data-capability-live="([a-z0-9-]+)"[\s\S]*?<\/figure>/g)];
    assert.equal(figures.length, 8, 'eight panels expose live HTML text');
    assert.equal([...explorer.matchAll(/data-feature-anatomy="/g)].length, 2, 'the other two panels use accessible anatomy figures');
    const expected = [
      ['cockpit', 'Riwayat &amp; antrean'], ['document-studio', 'Anamnesis'],
      ['fast-assessment', 'Edukasi'], ['icd10', 'Tinjauan klinisi'],
      ['ambient-scribing', 'Scribe Note'], ['power-navigation', 'Ctrl + J'],
      ['privacy', 'Pemeriksaan PII'], ['library', 'Pedoman']
    ];
    for (const [slug, label] of expected) {
      const figure = figures.find(match => match[1] === slug)?.[0];
      assert.ok(figure, slug + ' is served');
      assert.ok(figure.includes(label), slug + ' retains its own relevant label');
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('capability explorer serves readable no-JS content without capability image or video loading', async () => {
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
    assert.equal([...explorer.matchAll(/data-capability-live=/g)].length, 8, 'eight static HTML/SVG panels load without JavaScript');
    assert.doesNotMatch(explorer, /class="capability-feature-image"|data-capability-video|class="capability-motion-poster"/, 'no active capability bitmap or decoder masks live text');
    assert.match(explorer, /<li>Edukasi Pasien<\/li>\s*<\/ol><\/div><\/div>/, 'the sixth output stays inside the complete Fast Assessment copy');
    assert.match(explorer, /data-capability-pause[^>]*hidden/);
    assert.match(explorer, /aria-live="polite"/);
    for (const asset of ['capability-explorer.css', 'capability-explorer.js']) {
      const local = await fetch('http://127.0.0.1:' + server.address().port + '/media/' + asset);
      assert.equal(local.status, 200, asset + ' is served locally');
      assert.deepEqual(new Uint8Array(await local.arrayBuffer()), new Uint8Array(await readFile(new URL('../assets/' + asset, import.meta.url))), asset + ' served bytes match authored input');
    }
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

test('each scene retains three relevant explanation beats', async () => {
  const { capabilityExplainSteps } = await import('../assets/capability-explorer.js');
  const steps = capabilityExplainSteps();
  assert.equal(steps.length, 10);
  assert.ok(steps.every(scene => scene.length === 3 && scene.every(label => label.length > 2)));
  assert.deepEqual(steps[3], ['Gejala', 'DDx', 'Edukasi']);
  assert.deepEqual(steps[9], ['Pedoman', 'Obat', 'ICD-10']);
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
