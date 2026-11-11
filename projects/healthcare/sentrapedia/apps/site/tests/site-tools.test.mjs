// Tech-debt row 39: the site's verify script and its tools. Each test runs an unchanged copy of the script in a
// temporary site root, because every script resolves its root from its own location.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function siteCopy(name, files, body) {
  const temp = await mkdtemp(path.join(os.tmpdir(), `sentrapedia-site-${name}-`));
  try {
    for (const file of files) await cp(path.join(root, file), path.join(temp, file), { recursive: true });
    await body(temp);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
async function write(temp, file, content) {
  await mkdir(path.dirname(path.join(temp, file)), { recursive: true });
  await writeFile(path.join(temp, file), content);
}
const run = (temp, script, args = []) => spawnSync(process.execPath, [path.join(temp, script), ...args], { cwd: temp, encoding: 'utf8' });

test('verify passes a fresh build and names a changed presentation file', async () => {
  await siteCopy('verify', ['scripts', 'source', 'static', 'assets', 'reference/design-integrity.json'], async temp => {
    assert.equal(run(temp, 'scripts/transform.mjs').status, 0);
    const clean = run(temp, 'scripts/verify.mjs');
    assert.equal(clean.status, 0, clean.stdout + clean.stderr);
    assert.deepEqual(JSON.parse(clean.stdout).errors, []);
    const [entry] = JSON.parse(await readFile(path.join(temp, 'reference/design-integrity.json'), 'utf8')).files;
    await writeFile(path.join(temp, 'site', entry.path), `${await readFile(path.join(temp, 'site', entry.path), 'utf8')}\n`);
    const changed = run(temp, 'scripts/verify.mjs');
    assert.equal(changed.status, 1);
    assert.ok(JSON.parse(changed.stdout).errors.includes(`Presentation changed: ${entry.path}`));
  });
});

test('install check needs the site sources and refuses any dependency', async () => {
  await siteCopy('install', ['tools/install-check.mjs', 'package.json', 'source/index.html', 'static', 'reference/design-integrity.json'], async temp => {
    assert.equal(run(temp, 'tools/install-check.mjs').status, 0);
    const manifest = JSON.parse(await readFile(path.join(temp, 'package.json'), 'utf8'));
    await writeFile(path.join(temp, 'package.json'), JSON.stringify({ ...manifest, dependencies: { 'left-pad': '1.3.0' } }));
    assert.match(run(temp, 'tools/install-check.mjs').stderr, /must remain dependency-free/);
    await writeFile(path.join(temp, 'package.json'), JSON.stringify(manifest));
    await rm(path.join(temp, 'static'), { recursive: true });
    assert.notEqual(run(temp, 'tools/install-check.mjs').status, 0);
  });
});

test('deploy dry-run accepts the built pages and refuses a legal page without its table of contents', async () => {
  await siteCopy('deploy', ['tools/deploy-dry-run.mjs'], async temp => {
    await write(temp, 'site/index.html', '<title>Sentrapedia</title><a href="#featured-projects">x</a>');
    await write(temp, 'site/faq/index.html', '<title>FAQ</title><details></details>');
    for (const page of ['privasi', 'ketentuan', 'penafian']) await write(temp, `site/${page}/index.html`, '<title>x</title><nav class="legal-toc"></nav>');
    for (const file of ['site/media/design-audit.css', 'site/media/workflows/soap-web.mp4', 'site/assets/brand/favicon.png']) await write(temp, file, '');
    const passed = run(temp, 'tools/deploy-dry-run.mjs');
    assert.equal(passed.status, 0, passed.stderr);
    assert.match(passed.stdout, /no files published/);
    await write(temp, 'site/penafian/index.html', '<title>x</title>');
    assert.match(run(temp, 'tools/deploy-dry-run.mjs').stderr, /penafian output missing/);
  });
});

test('lint syntax-checks authored JavaScript, skips minified files and stops at the first error', async () => {
  await siteCopy('lint', ['tools/lint.mjs'], async temp => {
    for (const directory of ['api', 'assets', 'scripts', 'tests']) await mkdir(path.join(temp, directory), { recursive: true });
    await write(temp, 'scripts/ok.mjs', 'export const ok = 1;\n');
    await write(temp, 'assets/vendor.min.js', 'this is not javascript (\n');
    const passed = run(temp, 'tools/lint.mjs');
    assert.equal(passed.status, 0, passed.stderr);
    assert.match(passed.stdout, /Syntax checked 2 authored JavaScript files/); // ok.mjs and the copied lint.mjs
    await write(temp, 'api/broken.js', 'function (\n');
    assert.notEqual(run(temp, 'tools/lint.mjs').status, 0);
  });
});

test('SPDS check passes the committed documents and reports an unlisted or incomplete document', async () => {
  await siteCopy('spds', ['tools/verify-spds.mjs', 'docs/spds', 'SITE_GENOME.yaml'], async temp => {
    const clean = run(temp, 'tools/verify-spds.mjs');
    assert.equal(clean.status, 0, clean.stdout);
    await write(temp, 'docs/spds/extra.md', '---\ntitle: x\n---\n## Function\n');
    const broken = run(temp, 'tools/verify-spds.mjs');
    assert.equal(broken.status, 1);
    const { errors } = JSON.parse(broken.stdout);
    assert.ok(errors.includes('Not in document_index.md: extra.md'));
    assert.ok(errors.includes('Missing document_id: extra.md'));
  });
});

test('the manifest writer keeps known entries in order, drops deleted files and appends new ones sorted', async () => {
  await siteCopy('manifest', ['tools/write-migration-manifest.mjs'], async temp => {
    for (const file of ['source/b.html', 'source/a.html', 'scripts/z.mjs', 'scripts/c.mjs', 'reference/verification.json']) await write(temp, file, file);
    for (const directory of ['assets', 'static']) await mkdir(path.join(temp, directory), { recursive: true });
    const stale = [{ path: 'source/b.html', sha256: '0'.repeat(64) }, { path: 'source/a.html', sha256: '0'.repeat(64) }, { path: 'source/gone.html', sha256: '0'.repeat(64) }];
    await write(temp, 'docs/migration-manifest.json', JSON.stringify({ schemaVersion: 1, files: stale }));
    const result = run(temp, 'tools/write-migration-manifest.mjs');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /4 files \(2 added, 1 removed\)/);
    const { schemaVersion, files } = JSON.parse(await readFile(path.join(temp, 'docs/migration-manifest.json'), 'utf8'));
    assert.equal(schemaVersion, 1);
    assert.deepEqual(files.map(entry => entry.path), ['source/b.html', 'source/a.html', 'scripts/c.mjs', 'scripts/z.mjs']);
    for (const entry of files) assert.equal(entry.sha256, digest(entry.path));
  });
});
