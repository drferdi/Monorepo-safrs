import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('the clinical-workspace intro puts a transparent anatomy cutout in the left column', async () => {
  const html = await readFile(path.join(siteRoot, 'source/ruang-kerja/index.html'), 'utf8');
  const section = html.match(/<section id="home-text"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.ok(section, 'home-text section exists');
  const leftColumn = section.slice(section.indexOf('<div class="col-md-3'), section.indexOf('<div class="col-md-9'));
  assert.match(leftColumn, /human-anatomy-cutout\.png/);
  assert.doesNotMatch(section, /human-anatomy-video|human-anatomy-stage|human-anatomy-heading|human-anatomy-foot/);
  assert.match(leftColumn, /class="human-anatomy-toggle"/);
  assert.match(section, /Ruang kerja klinis <br>untuk dokter Indonesia\./);
});

test('motion stays still while offscreen, paused, or reduced', async () => {
  const { shouldPlayAnatomy } = await import('../assets/human-anatomy.js');
  assert.equal(shouldPlayAnatomy({ visible: true, paused: false, reduced: false }), true);
  assert.equal(shouldPlayAnatomy({ visible: false, paused: false, reduced: false }), false);
  assert.equal(shouldPlayAnatomy({ visible: true, paused: true, reduced: false }), false);
  assert.equal(shouldPlayAnatomy({ visible: true, paused: false, reduced: true }), false);
});

test('reduced motion keeps the cutout still', async () => {
  const css = await readFile(path.join(siteRoot, 'assets/human-anatomy.css'), 'utf8');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?#home-text \.human-anatomy img \{[\s\S]*?animation: none;/);
});

test('the anatomy does not rely on the opaque film or dark card', async () => {
  const css = await readFile(path.join(siteRoot, 'assets/human-anatomy.css'), 'utf8');
  const js = await readFile(path.join(siteRoot, 'assets/human-anatomy.js'), 'utf8');
  assert.doesNotMatch(css, /background:\s*#11191b/);
  assert.doesNotMatch(js, /\.play\(/);
});
