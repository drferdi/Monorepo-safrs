// Rewrites docs/migration-manifest.json from the files on disk, the closure tests/migration-boundary.test.mjs checks.
// Existing entries keep their order with fresh hashes, deleted files drop out, new files are appended in path order.
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'docs/migration-manifest.json');
const directories = ['source', 'assets', 'site', 'reference', 'scripts'];
const excluded = new Set(['reference/verification.json']);

async function filesUnder(directory) {
  const found = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await filesUnder(relative));
    else if (!excluded.has(relative)) found.push(relative);
  }
  return found;
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const onDisk = new Set((await Promise.all(directories.map(filesUnder))).flat());
const kept = manifest.files.map(entry => entry.path).filter(file => onDisk.has(file));
const added = [...onDisk].filter(file => !kept.includes(file)).sort();
const files = [];
for (const file of [...kept, ...added]) {
  files.push({ path: file, sha256: createHash('sha256').update(await readFile(path.join(root, file))).digest('hex') });
}
await writeFile(manifestPath, `${JSON.stringify({ ...manifest, files }, null, 2)}\n`);
console.log(`migration manifest: ${files.length} files (${added.length} added, ${manifest.files.length - kept.length} removed)`);
