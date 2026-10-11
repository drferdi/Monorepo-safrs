import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
for (const name of ['dist/index.js', 'dist-electron/desktop/bootstrap.js', 'dist-electron/desktop/renderer/index.html', 'dist-electron/desktop/renderer/index.css']) {
  if (!readFileSync(new URL(name, root)).length) throw new Error(`Empty build artifact: ${name}`);
}
const manifest = JSON.parse(readFileSync(new URL('dist-electron/package.json', root), 'utf8'));
if (manifest.type !== 'commonjs') throw new Error('Desktop output must use CommonJS.');
console.log(`Retriever deploy dry-run passed: local artifacts at ${fileURLToPath(root)}; no publication performed.`);
