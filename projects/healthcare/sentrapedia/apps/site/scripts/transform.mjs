import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderHomepage } from './render-homepage.mjs';
import { assetGroups } from './site-assets.mjs';
import { browserParts, assembleBrowserScript } from './browser-assets.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.resolve(process.argv[2] ?? path.join(root, 'site'));
await fs.rm(site, { recursive: true, force: true });
await fs.cp(path.join(root, 'static'), site, { recursive: true });
for (const directory of ['media', 'assets/brand']) await fs.mkdir(path.join(site, directory), { recursive: true });
const original = await fs.readFile(path.join(root, 'source/index.html'), 'utf8');
const homepage = renderHomepage(original);
await fs.writeFile(path.join(site, 'index.html'), homepage);
async function copyGroup({ from, to, files }) {
  for (const filename of files) await fs.copyFile(path.join(root, from, filename), path.join(site, to, filename));
}

await fs.mkdir(path.join(site, 'faq'), { recursive: true });
await fs.copyFile(path.join(root, 'source/faq/index.html'), path.join(site, 'faq/index.html'));
await copyGroup(assetGroups[0]);
for (const page of ['privasi', 'ketentuan', 'penafian']) {
  await fs.mkdir(path.join(site, page), { recursive: true });
  await fs.copyFile(path.join(root, `source/${page}/index.html`), path.join(site, `${page}/index.html`));
}
await fs.mkdir(path.join(site, 'ruang-kerja'), { recursive: true });
await fs.copyFile(path.join(root, 'source/ruang-kerja/index.html'), path.join(site, 'ruang-kerja/index.html'));
await fs.copyFile(path.join(root, 'assets/ruang-kerja.css'), path.join(site, 'media/ruang-kerja.css'));
await fs.mkdir(path.join(site, 'sejarah-sentra'), { recursive: true });
await fs.copyFile(path.join(root, 'source/sejarah-sentra/index.html'), path.join(site, 'sejarah-sentra/index.html'));
await fs.copyFile(path.join(root, 'assets/sejarah-sentra.css'), path.join(site, 'media/sejarah-sentra.css'));
await copyGroup(assetGroups[1]);
await copyGroup(assetGroups[2]);
await copyGroup(assetGroups[3]);
await copyGroup(assetGroups[4]);
await copyGroup(assetGroups[5]);
await copyGroup(assetGroups[6]);
await copyGroup(assetGroups[7]);
await fs.mkdir(path.join(site, 'media/clinical-product'), { recursive: true });
await copyGroup(assetGroups[8]);
await fs.mkdir(path.join(site, 'media/workflows'), { recursive: true });
for (const filename of await fs.readdir(path.join(root, 'assets/workflows'))) {
  if (/^[a-z]+(?:-poster\.webp|-web\.mp4)$/.test(filename)) {
    await fs.copyFile(path.join(root, 'assets/workflows', filename), path.join(site, 'media/workflows', filename));
  }
}
await fs.copyFile(path.join(root, 'assets/workflow-playback.js'), path.join(site, 'media/workflow-playback.js'));
await copyGroup(assetGroups[9]);
await fs.mkdir(path.join(site, 'media/fonts'), { recursive: true });
await copyGroup(assetGroups[10]);
await fs.copyFile(path.join(root, 'assets/branding/sentra-neuron-ink.png'), path.join(site, 'assets/brand/favicon.png'));
for (const filename of await fs.readdir(path.join(root, 'assets/branding'))) {
  if (/^sentrapedia-wordmark-[a-z]+\.svg$/.test(filename)) await fs.copyFile(path.join(root, 'assets/branding', filename), path.join(site, 'assets/theme/img', filename));
}
for (const filename of Object.keys(browserParts)) {
  await fs.writeFile(path.join(site, 'media', filename), await assembleBrowserScript(root, filename));
}
console.log('Sentrapedia homepage and media refreshed.');
