import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = new URL('../', import.meta.url);
async function inventory(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async entry => {
    const target = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    const relative = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? inventory(target, relative) : [{ path: relative, sha256: createHash('sha256').update(await readFile(target)).digest('hex') }];
  }))).flat().sort((a, b) => a.path.localeCompare(b.path));
}
test('every public path is preserved and only reviewed runtime bundles change bytes', async () => {
  const expected = JSON.parse(await readFile(new URL('refactor-evidence/baseline-output.json', root), 'utf8'));
  const actual = await inventory(new URL('site/', root));
  // Reinsert only the audited unused WordPress emoji rule to prove the rest of the homepage is byte-identical.
  const html = await readFile(new URL('site/index.html', root), 'utf8');
  const removed = await readFile(new URL('refactor-evidence/removed-emoji-style.txt', root), 'utf8');
  const restored = html.replace('<style id="wp-block-library-inline-css">', removed + '<style id="wp-block-library-inline-css">')
    // Gaffer approved desktop/mobile beta access; remove only the exact added navigation markup for historical comparison.
    .replace('<div class="d-flex align-items-center justify-content-end gap-3" data-login-actions><a class="btn btn-outline-dark rounded-pill px-3" href="https://beta.sentrapedia.com/sign-in">Masuk</a>\n', '')
    .replace('<a href="https://beta.sentrapedia.com/apply" data-request-access>Ajukan akses</a>\n', '')
    .replace(' </div><!-- login-actions -->\n', '')
    .replace('<li class="menu-item" data-login-mobile><a href="https://beta.sentrapedia.com/sign-in">Masuk</a></li>\n', '')
    .replace('<li class="menu-item" data-request-mobile><a href="https://beta.sentrapedia.com/apply">Ajukan akses</a></li>\n', '')
    // Gaffer explicitly removed the directional caption on 2026-10-23; preserve the historical baseline.
    .replace('<h3 id="capability-explorer-title">Sepuluh kemampuan.<br>Satu ruang kerja.</h3></div>', '$&<p>3 ke kanan · 3 turun<br>3 ke kanan · 1 turun.</p>');
  actual.find(entry => entry.path === 'index.html').sha256 = createHash('sha256').update(restored).digest('hex');
  assert.deepEqual(actual.map(entry => entry.path), expected.map(entry => entry.path));
  const runtime = new Set(['media/design-audit.js', 'media/hero-workspace.js', 'media/capability-explorer.js', 'media/clinical-video.js', 'media/workflow-playback.js']);
  assert.deepEqual(actual.filter(entry => !runtime.has(entry.path)), expected.filter(entry => !runtime.has(entry.path)));
});
