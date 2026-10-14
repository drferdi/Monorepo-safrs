import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createServer } from './serve.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');
const errors = [];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'reference/design-integrity.json'), 'utf8'));
for (const entry of manifest.files) {
  if (sha(await fs.readFile(path.join(site, entry.path))) !== entry.sha256) errors.push(`Presentation changed: ${entry.path}`);
}
const current = await fs.readFile(path.join(site, 'index.html'), 'utf8');
if (current !== await fs.readFile(path.join(root, 'source/index.html'), 'utf8')) errors.push('Homepage differs from source template');
if (!current.includes('<title>Sentrapedia</title>') || !current.includes('kewenangan dokter yang menangani')) errors.push('Product identity or physician ownership copy missing');
const ids = new Set([...current.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
let localTargets = 0;
for (const match of current.matchAll(/\b(?:src|href|poster|srcset)\s*=\s*(["'])(.*?)\1/gis)) {
  const value = match[2].replaceAll('&amp;', '&');
  if (/^(data:|mailto:|tel:)/i.test(value)) continue;
  if (/^(https?:|\/\/)/i.test(value)) { errors.push(`External target: ${value}`); continue; }
  if (value.startsWith('#')) {
    if (value.length > 1 && !ids.has(value.slice(1))) errors.push(`Missing anchor: ${value}`);
    continue;
  }
  const resource = value.split(/[?#]/)[0];
  if (resource && !await fs.stat(path.join(site, resource)).catch(() => null)) errors.push(`Missing local target: ${resource}`);
  localTargets++;
}
for (const entry of manifest.files.filter(entry => entry.path.endsWith('.css'))) {
  const css = await fs.readFile(path.join(site, entry.path), 'utf8');
  for (const match of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) {
    const resource = match[1].split(/[?#]/)[0];
    if (resource.startsWith('data:')) continue;
    const target = resource.startsWith('/') ? path.join(site, resource) : path.resolve(site, path.dirname(entry.path), resource);
    if (!await fs.stat(target).catch(() => null)) errors.push(`Missing CSS resource: ${resource}`);
  }
}
if (sha(await fs.readFile(path.join(root, 'assets/sentrapedia-hero.webm'))) !== sha(await fs.readFile(path.join(site, 'assets/theme/img/sentrapedia-hero.webm')))) errors.push('Hero source differs');
const workflows = JSON.parse(await fs.readFile(path.join(root, 'assets/workflows.json'), 'utf8'));
const motionAssets = [];
if (sha(await fs.readFile(path.join(root, 'assets/workflow-playback.js'))) !== sha(await fs.readFile(path.join(site, 'media/workflow-playback.js')))) errors.push('Playback controller source differs from served file');
for (const workflow of workflows) {
  const bytes = await fs.readFile(path.join(site, `media/workflows/${workflow.id}.webp`));
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.readUInt32LE(4) !== bytes.length - 8) errors.push(`Invalid motion container: ${workflow.id}`);
  let frameCount = 0, durationMs = 0, width = 0, height = 0;
  for (let offset = 12; offset < bytes.length;) {
    const name = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4);
    if (offset + 8 + size > bytes.length) { errors.push(`Truncated motion: ${workflow.id}`); break; }
    if (name === 'VP8X') { width = bytes.readUIntLE(offset + 12, 3) + 1; height = bytes.readUIntLE(offset + 15, 3) + 1; }
    if (name === 'ANMF') { frameCount++; durationMs += bytes.readUIntLE(offset + 20, 3); }
    offset += 8 + size + size % 2;
  }
  if (width !== workflow.width || height !== workflow.height || frameCount !== 90 || durationMs !== 9000) errors.push(`Motion dimensions or timing failed: ${workflow.id}`);
  for (const suffix of ['.webp', '-poster.webp', '.webm', '-web.mp4']) {
    const filename = workflow.id + suffix;
    if (sha(await fs.readFile(path.join(root, 'assets/workflows', filename))) !== sha(await fs.readFile(path.join(site, 'media/workflows', filename)))) errors.push(`Generated media differs: ${filename}`);
  }
  motionAssets.push({ id: workflow.id, width, height, frameCount, durationMs });
}
const server = createServer(site);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/', '/assets/theme/img/sentrapedia-wordmark-big.svg', '/assets/theme/img/sentrapedia-hero.webm']) {
    const response = await fetch(base + route);
    if (response.status !== 200) errors.push(`HTTP ${response.status}: ${route}`);
    await response.arrayBuffer();
  }
  const media = await fetch(base + '/assets/theme/img/sentrapedia-hero.webm', { headers: { Range: 'bytes=0-31' } });
  if (media.status !== 206 || media.headers.get('content-type') !== 'video/webm') errors.push('Hero media range or MIME failed');
  if ((await fetch(base + '/api/unavailable', { method: 'POST' })).status !== 501) errors.push('Real submissions must remain unavailable');
  for (const workflow of workflows) for (const [suffix, mime] of [['.webp', 'image/webp'], ['-poster.webp', 'image/webp'], ['.webm', 'video/webm'], ['-web.mp4', 'video/mp4']]) {
    const response = await fetch(base + `/media/workflows/${workflow.id}${suffix}`);
    if (response.status !== 200 || response.headers.get('content-type') !== mime) errors.push(`Workflow HTTP or MIME failed: ${workflow.id}${suffix}`);
    await response.arrayBuffer();
  }
  for (const workflow of workflows) {
    const response = await fetch(base + `/media/workflows/${workflow.id}-web.mp4`, { headers: { Range: 'bytes=0-31' } });
    if (response.status !== 206 || response.headers.get('content-type') !== 'video/mp4' || (await response.arrayBuffer()).byteLength !== 32) errors.push(`Workflow video range failed: ${workflow.id}`);
  }
} finally { await new Promise(resolve => server.close(resolve)); }
const result = { presentationFilesUnchanged: manifest.files.length, localTargets, motionAssets, errors };
await fs.mkdir(path.join(root, 'reference'), { recursive: true });
await fs.writeFile(path.join(root, 'reference/verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
if (errors.length) process.exitCode = 1;
