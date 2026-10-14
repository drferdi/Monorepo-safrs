import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderClinicalNote } from './clinical-note.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');
await fs.mkdir(site, { recursive: true });
const original = await fs.readFile(path.join(root, 'source/index.html'), 'utf8');
const note = /<!-- clinical-note:start -->[\s\S]*?<!-- clinical-note:end -->/g;
if ([...original.matchAll(note)].length !== 1) throw new Error('Expected exactly one clinical note fragment');
const homepage = original.replace(note, () => '<!-- clinical-note:start -->' + renderClinicalNote() + '<!-- clinical-note:end -->');
if (homepage !== original) await fs.writeFile(path.join(root, 'source/index.html'), homepage);
await fs.writeFile(path.join(site, 'index.html'), homepage);
await fs.mkdir(path.join(site, 'faq'), { recursive: true });
await fs.copyFile(path.join(root, 'source/faq/index.html'), path.join(site, 'faq/index.html'));
for (const filename of ['faq.css', 'faq.js']) {
  await fs.copyFile(path.join(root, 'assets', filename), path.join(site, 'media', filename));
}
for (const filename of ['design-audit.css', 'design-audit.js']) {
  await fs.copyFile(path.join(root, 'assets', filename), path.join(site, 'media', filename));
}
for (const filename of ['pricing.css', 'pricing.js']) {
  await fs.copyFile(path.join(root, 'assets', filename), path.join(site, 'media', filename));
}
await fs.mkdir(path.join(site, 'media/clinical-product'), { recursive: true });
for (const filename of ['workspace.png', 'document-review.png', 'anamnesis-source.png']) {
  await fs.copyFile(path.join(root, 'assets/clinical-product', filename), path.join(site, 'media/clinical-product', filename));
}
await fs.mkdir(path.join(site, 'media/workflows'), { recursive: true });
for (const filename of await fs.readdir(path.join(root, 'assets/workflows'))) {
  if (/^[a-z]+(?:-poster\.webp|-web\.mp4|\.webp|\.webm)$/.test(filename)) {
    await fs.copyFile(path.join(root, 'assets/workflows', filename), path.join(site, 'media/workflows', filename));
  }
}
await fs.copyFile(path.join(root, 'assets/workflow-playback.js'), path.join(site, 'media/workflow-playback.js'));
for (const filename of ['sentrapedia-solusi.mp4', 'gsap.min.js', 'ScrollTrigger.min.js', 'SplitText.min.js', 'DrawSVGPlugin.min.js', 'clinical-video.js', 'clinical-video.css']) {
  await fs.copyFile(path.join(root, 'assets', filename), path.join(site, 'media', filename));
}
await fs.mkdir(path.join(site, 'media/fonts'), { recursive: true });
for (const filename of ['Caveat-Variable.ttf', 'Caveat-OFL.txt']) {
  await fs.copyFile(path.join(root, 'assets/fonts', filename), path.join(site, 'media/fonts', filename));
}
await fs.copyFile(path.join(root, 'assets/sentrapedia-hero.webm'), path.join(site, 'assets/theme/img/sentrapedia-hero.webm'));
await fs.copyFile(path.join(root, 'assets/branding/sentra-neuron-ink.png'), path.join(site, 'assets/brand/favicon.png'));
for (const filename of await fs.readdir(path.join(root, 'assets/branding'))) {
  if (/^sentrapedia-wordmark-[a-z]+\.svg$/.test(filename)) await fs.copyFile(path.join(root, 'assets/branding', filename), path.join(site, 'assets/theme/img', filename));
}
console.log('Sentrapedia homepage and media refreshed.');
