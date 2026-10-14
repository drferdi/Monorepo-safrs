import { readFile, stat } from 'node:fs/promises';

const major = Number(process.versions.node.split('.')[0]);
if (major < 22) throw new Error('Node.js 22 or later is required');
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (Object.keys(manifest.dependencies ?? {}).length || Object.keys(manifest.devDependencies ?? {}).length) {
  throw new Error('Website lifecycle must remain dependency-free');
}
for (const relative of ['source/index.html', 'site/index.html', 'reference/design-integrity.json']) {
  await stat(new URL(`../${relative}`, import.meta.url));
}
console.log('Local website sources available; no package install required.');
