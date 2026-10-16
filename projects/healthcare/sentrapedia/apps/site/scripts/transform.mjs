import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderClinicalNote } from './clinical-note.mjs';
import { renderSystemAnatomy } from './system-anatomy.mjs';
import { renderCapabilityAnatomy } from './capability-anatomy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');
await fs.mkdir(site, { recursive: true });
const original = await fs.readFile(path.join(root, 'source/index.html'), 'utf8');
const note = /<!-- clinical-note:start -->[\s\S]*?<!-- clinical-note:end -->/g;
if ([...original.matchAll(note)].length !== 1) throw new Error('Expected exactly one clinical note fragment');
const anatomy = renderSystemAnatomy();
let homepage = original.replace(note, () => '<!-- clinical-note:start -->' + renderClinicalNote() + '<!-- clinical-note:end -->')
  .replace(/<!-- system-anatomy:start -->[\s\S]*?<!-- system-anatomy:end -->/, () => '<!-- system-anatomy:start -->' + anatomy.svg + '<!-- system-anatomy:end -->')
  .replace(/data-projection='[^']*'/, () => `data-projection='${JSON.stringify(anatomy.projection)}'`);
for (const kind of ['gateway', 'modes']) {
  const fragment = new RegExp('<!-- capability-anatomy:' + kind + ':start -->[\\s\\S]*?<!-- capability-anatomy:' + kind + ':end -->');
  const rendered = renderCapabilityAnatomy(kind);
  if (!fragment.test(homepage)) throw new Error('Missing capability anatomy fragment: ' + kind);
  homepage = homepage.replace(fragment, () => '<!-- capability-anatomy:' + kind + ':start -->' + rendered.html + '<!-- capability-anatomy:' + kind + ':end -->');
}
if (homepage !== original) await fs.writeFile(path.join(root, 'source/index.html'), homepage);
await fs.writeFile(path.join(site, 'index.html'), homepage);
await fs.mkdir(path.join(site, 'faq'), { recursive: true });
await fs.copyFile(path.join(root, 'source/faq/index.html'), path.join(site, 'faq/index.html'));
for (const filename of ['faq.css', 'faq.js']) {
  await fs.copyFile(path.join(root, 'assets', filename), path.join(site, 'media', filename));
}
for (const page of ['privasi', 'ketentuan', 'penafian']) {
  await fs.mkdir(path.join(site, page), { recursive: true });
  await fs.copyFile(path.join(root, `source/${page}/index.html`), path.join(site, `${page}/index.html`));
}
for (const filename of ['legal.css', 'legal.js']) {
  await fs.copyFile(path.join(root, 'assets', filename), path.join(site, 'media', filename));
}
for (const filename of ['design-audit.css', 'design-audit.js']) {
  await fs.copyFile(path.join(root, 'assets', filename), path.join(site, 'media', filename));
}
for (const filename of ['pricing.css', 'pricing.js']) {
  await fs.copyFile(path.join(root, 'assets', filename), path.join(site, 'media', filename));
}
for (const filename of ['system-anatomy.css', 'system-anatomy.js', 'system-anatomy-model.js']) {
  await fs.copyFile(path.join(root, 'assets', filename), path.join(site, 'media', filename));
}
for (const filename of ['capability-explorer.css', 'capability-explorer.js', 'capability-anatomy.css', 'capability-anatomy.js', 'capability-flow.mp4', 'capability-flow-poster.jpg']) {
  await fs.copyFile(path.join(root, 'assets', filename), path.join(site, 'media', filename));
}
await fs.mkdir(path.join(site, 'media/capabilities'), { recursive: true });
for (const filename of await fs.readdir(path.join(root, 'assets/capabilities'))) {
  if (/^\d{2}-[a-z0-9-]+\.webp$/.test(filename)) {
    await fs.copyFile(path.join(root, 'assets/capabilities', filename), path.join(site, 'media/capabilities', filename));
  }
}
for (const filename of ['hero-workspace.css', 'hero-workspace.js', 'hero-film.mp4']) {
  await fs.copyFile(path.join(root, 'assets', filename), path.join(site, 'media', filename));
}
await fs.mkdir(path.join(site, 'media/clinical-product'), { recursive: true });
for (const filename of ['workspace.png', 'document-review.png', 'anamnesis-source.png', 'audrey-chat.png']) {
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
await fs.copyFile(path.join(root, 'assets/branding/sentra-neuron-ink.png'), path.join(site, 'assets/brand/favicon.png'));
for (const filename of await fs.readdir(path.join(root, 'assets/branding'))) {
  if (/^sentrapedia-wordmark-[a-z]+\.svg$/.test(filename)) await fs.copyFile(path.join(root, 'assets/branding', filename), path.join(site, 'assets/theme/img', filename));
}
console.log('Sentrapedia homepage and media refreshed.');
